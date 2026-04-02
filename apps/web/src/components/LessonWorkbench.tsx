import Editor from '@monaco-editor/react'
import type {
  ExecutionCheckResult,
  ExecutionMode,
  ExecutionRequest,
  ExecutionResult,
  Lesson,
} from '@rust-learning/shared-types'
import { useEffect, useMemo, useState } from 'react'
import { updateLessonProgress } from '~/utils/progress'
import { useLessonProgress } from '~/utils/useLessonProgress'
const RUNNER_URL = 'http://127.0.0.1:9091'

export function LessonWorkbench({ lesson }: { lesson: Lesson }) {
  const storageKey = useMemo(
    () => `rust-learning:lesson:${lesson.slug}:code`,
    [lesson.slug],
  )

  const [code, setCode] = useState(lesson.exercise.starterCode)
  const [isHydrated, setIsHydrated] = useState(false)
  const progress = useLessonProgress()
  const [result, setResult] = useState<ExecutionResult>({
    status: 'idle',
    headline: 'Ready to run',
    output:
      'Use the editor to change the lesson code, then run it through the local Rust runner service.',
  })
  const [activeAction, setActiveAction] = useState<ExecutionMode | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const savedCode = window.localStorage.getItem(storageKey)

    if (savedCode) {
      setCode(savedCode)
    }

    setIsHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(storageKey, code)

    if (code !== lesson.exercise.starterCode) {
      updateLessonProgress(lesson.slug, 'in_progress')
    }
  }, [code, isHydrated, storageKey])

  function handleReset() {
    setCode(lesson.exercise.starterCode)
    setResult({
      status: 'idle',
      headline: 'Starter restored',
      output: 'The lesson code has been reset to its original starter template.',
    })
  }

  async function execute(mode: ExecutionMode) {
    setActiveAction(mode)
    setResult({
      status: 'running',
      headline: mode === 'run' ? 'Sending code to runner' : 'Checking lesson answer',
      output:
        mode === 'run'
          ? `POST ${RUNNER_URL}/run\nPreparing temporary Cargo workspace...`
          : `POST ${RUNNER_URL}/run\nCompiling code and evaluating lesson checks...`,
    })

    try {
      const response = await fetch(`${RUNNER_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonSlug: lesson.slug,
          fileName: lesson.exercise.fileName,
          code,
          mode,
        } satisfies ExecutionRequest),
      })

      const payload = (await response.json()) as ExecutionResult

      const nextResult = mode === 'check' ? formatCheckResult(payload) : payload

      setResult(nextResult)

      if (mode === 'check' && nextResult.passed) {
        updateLessonProgress(lesson.slug, 'completed')
      } else if (mode === 'check' && nextResult.status !== 'running') {
        updateLessonProgress(lesson.slug, 'in_progress')
      }
    } catch {
      setResult({
        status: 'error',
        headline: 'Runner is unreachable',
        output: [
          `The lesson UI tried to reach ${RUNNER_URL}/run but no runner responded.`,
          'Start the Rust runner with `bun run dev:runner` in the repo root, then run the lesson again.',
        ].join('\n'),
      })
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <article className="workbench-panel">
      <div className="workbench-header">
        <div>
          <p className="eyebrow">Lesson IDE</p>
          <h2>{lesson.exercise.fileName}</h2>
        </div>
        <div className="workbench-status">
          <span>{progress[lesson.slug]?.status ?? 'not_started'}</span>
          <span>{result.status}</span>
          <span>LSP next</span>
        </div>
      </div>

      <div className="workbench-controls">
        <div className="workbench-control-group">
          <button
            className="primary-pill"
            disabled={activeAction !== null}
            onClick={() => void execute('run')}
            type="button"
          >
            Run lesson
          </button>
          <button
            className="ghost-pill"
            disabled={activeAction !== null}
            onClick={() => void execute('check')}
            type="button"
          >
            Check answer
          </button>
          <button
            className="ghost-pill"
            disabled={activeAction !== null}
            onClick={handleReset}
            type="button"
          >
            Reset starter
          </button>
        </div>
        <p className="workbench-note">
          Code is saved per lesson in local browser storage. Runner listens on `9091`.
        </p>
      </div>

      <div className="editor-shell">
        <Editor
          beforeMount={(monaco) => {
            monaco.editor.defineTheme('rust-learning-workbench', {
              base: 'vs-dark',
              inherit: true,
              rules: [],
              colors: {
                'editor.background': '#0d1416',
                'editor.lineHighlightBackground': '#162125',
                'editorLineNumber.foreground': '#7b7d71',
                'editorCursor.foreground': '#f1a63b',
                'editor.selectionBackground': '#27464f',
              },
            })
          }}
          defaultLanguage="rust"
          height="420px"
          loading={<div className="editor-loading">Loading editor...</div>}
          onChange={(value) => setCode(value ?? '')}
          options={{
            automaticLayout: true,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 14,
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            padding: { top: 18, bottom: 18 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            wordWrap: 'on',
          }}
          theme="rust-learning-workbench"
          value={code}
        />
      </div>

      <div className="output-panel">
        <div className="output-panel-header">
          <h3>{result.headline}</h3>
          <span className={`output-badge output-badge-${result.status}`}>
            {result.status}
          </span>
        </div>
        <pre className="output-console">{result.output}</pre>
      </div>

      <div className="workbench-footer">
        <div>
          <h3>Hint</h3>
          <p>{lesson.exercise.hint}</p>
        </div>
        <div>
          <h3>Validation target</h3>
          <p>{lesson.exercise.success}</p>
        </div>
      </div>
    </article>
  )
}

function formatCheckResult(payload: ExecutionResult): ExecutionResult {
  const checkLines = renderChecks(payload.checks)

  return {
    ...payload,
    headline: payload.passed ? 'Lesson checks passed' : 'Lesson checks failed',
    output: checkLines ? `${payload.output}\n\n${checkLines}` : payload.output,
  }
}

function renderChecks(checks: ExecutionCheckResult[] | undefined) {
  if (!checks || checks.length === 0) {
    return ''
  }

  return checks
    .map((check) => `${check.passed ? 'PASS' : 'FAIL'}: ${check.message}`)
    .join('\n')
}
