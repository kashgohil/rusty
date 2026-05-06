import { spawn } from 'node:child_process'
import net from 'node:net'
import process from 'node:process'

const ROOT = new URL('..', import.meta.url).pathname
const HEALTH_TIMEOUT_MS = 60_000
const REQUEST_TIMEOUT_MS = 15_000

const services = []
let isStopping = false

function logStep(message) {
  console.log(`smoke: ${message}`)
}

function fail(message, details) {
  const error = new Error(details ? `${message}\n${details}` : message)
  error.name = 'SmokeTestError'
  throw error
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Unable to allocate a local port'))
          return
        }

        resolve(address.port)
      })
    })
  })
}

function startService(name, cwd, env) {
  const child = spawn('cargo', ['run'], {
    cwd,
    detached: true,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const logs = []
  const collect = (chunk) => {
    logs.push(chunk.toString())
    if (logs.length > 80) {
      logs.shift()
    }
  }

  child.stdout.on('data', collect)
  child.stderr.on('data', collect)

  child.on('exit', (code, signal) => {
    if (isStopping) {
      return
    }

    if (code !== null && code !== 0) {
      console.error(`smoke: ${name} exited with code ${code}`)
      console.error(logs.join(''))
    } else if (signal) {
      console.error(`smoke: ${name} exited with signal ${signal}`)
    }
  })

  services.push({ child, logs, name })
  return { child, logs, name }
}

async function requestJson(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    const text = await response.text()
    const body = text ? JSON.parse(text) : null

    if (!response.ok) {
      fail(`Request failed: ${options.method ?? 'GET'} ${url}`, text)
    }

    return body
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForHealth(name, baseUrl, service) {
  const started = Date.now()
  let lastError = null

  while (Date.now() - started < HEALTH_TIMEOUT_MS) {
    try {
      const body = await requestJson(`${baseUrl}/health`)
      if (body?.status === 'ok') {
        return
      }
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  fail(
    `${name} did not become healthy`,
    `${lastError?.message ?? 'No health response'}\n\n${service.logs.join('')}`,
  )
}

function assert(condition, message, details) {
  if (!condition) {
    fail(message, details)
  }
}

function passingHelloRustFiles(lesson) {
  return lesson.exercise.files.map((file) => {
    if (file.path !== lesson.exercise.entryFile) {
      return file
    }

    return {
      ...file,
      content: `fn main() {
    let learner = "smoke test";
    println!("Hello, {learner}!");
    println!("Reason: verify the complete learning loop");
}
`,
    }
  })
}

async function run() {
  const apiPort = await findFreePort()
  const runnerPort = await findFreePort()
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const runnerUrl = `http://127.0.0.1:${runnerPort}`

  logStep(`starting API on ${apiUrl}`)
  const api = startService('api', `${ROOT}/apps/api`, {
    API_HOST: '127.0.0.1',
    API_PORT: String(apiPort),
  })

  logStep(`starting runner on ${runnerUrl}`)
  const runner = startService('runner', `${ROOT}/apps/runner`, {
    RUNNER_HOST: '127.0.0.1',
    RUNNER_PORT: String(runnerPort),
  })

  await Promise.all([
    waitForHealth('api', apiUrl, api),
    waitForHealth('runner', runnerUrl, runner),
  ])

  logStep('loading lesson from API')
  const lesson = await requestJson(`${apiUrl}/lessons/hello-rust`)
  assert(lesson?.slug === 'hello-rust', 'API did not return the hello-rust lesson')

  const files = passingHelloRustFiles(lesson)
  const executionRequest = {
    lessonSlug: lesson.slug,
    entryFile: lesson.exercise.entryFile,
    files,
    mode: 'run',
    validation: lesson.exercise.validation,
  }

  logStep('running edited lesson code')
  const runResult = await requestJson(`${runnerUrl}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(executionRequest),
  })
  assert(runResult.status === 'success', 'Runner did not execute edited lesson code', runResult.output)
  assert(
    runResult.output.includes('Reason: verify the complete learning loop'),
    'Runner output did not include edited lesson output',
    runResult.output,
  )

  logStep('checking lesson validation')
  const checkResult = await requestJson(`${runnerUrl}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...executionRequest,
      mode: 'check',
    }),
  })
  assert(checkResult.status === 'success', 'Lesson validation did not succeed', checkResult.output)
  assert(checkResult.passed === true, 'Lesson validation did not report passed=true')

  logStep('persisting completion progress')
  const learnerId = `smoke-${Date.now()}`
  const progress = await requestJson(`${apiUrl}/progress/${learnerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonSlug: lesson.slug,
      status: 'completed',
    }),
  })
  assert(
    progress[lesson.slug]?.status === 'completed',
    'Progress update response did not include completed lesson status',
    JSON.stringify(progress, null, 2),
  )

  logStep('verifying persisted progress can be read back')
  const persisted = await requestJson(`${apiUrl}/progress/${learnerId}`)
  assert(
    persisted[lesson.slug]?.status === 'completed',
    'Persisted progress readback did not include completed lesson status',
    JSON.stringify(persisted, null, 2),
  )

  logStep('learning loop smoke test passed')
}

function stopServices() {
  isStopping = true

  for (const service of services.reverse()) {
    if (!service.child.pid || service.child.killed) {
      continue
    }

    try {
      process.kill(-service.child.pid, 'SIGTERM')
    } catch {
      try {
        service.child.kill('SIGTERM')
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
}

process.on('exit', stopServices)
process.on('SIGINT', () => {
  stopServices()
  process.exit(130)
})
process.on('SIGTERM', () => {
  stopServices()
  process.exit(143)
})

run()
  .catch((error) => {
    console.error(error.stack ?? error.message)
    process.exitCode = 1
  })
  .finally(stopServices)
