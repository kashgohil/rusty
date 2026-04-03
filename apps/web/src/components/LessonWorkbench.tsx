import Editor from '@monaco-editor/react'
import type {
  ExecutionCheckResult,
  ExecutionMode,
  ExecutionRequest,
  ExecutionResult,
  Lesson,
  LessonFile,
} from '@rust-learning/shared-types'
import { useEffect, useMemo, useState } from 'react'
import { useLessonProgress } from '~/utils/useLessonProgress'

const RUNNER_URL = 'http://127.0.0.1:9091'

export function LessonWorkbench({ lesson }: { lesson: Lesson }) {
  const storageKey = useMemo(
    () => `rust-learning:lesson:${lesson.slug}:files`,
    [lesson.slug],
  )
  const { progress, persistLessonProgress } = useLessonProgress()
  const [files, setFiles] = useState<LessonFile[]>(lesson.exercise.files)
  const [activePath, setActivePath] = useState(lesson.exercise.entryFile)
  const [isHydrated, setIsHydrated] = useState(false)
  const [result, setResult] = useState<ExecutionResult>({
    status: 'idle',
    headline: 'Ready to run',
    output:
      'This lesson now supports multiple files. Edit any visible file, then run or check the full workspace.',
  })
  const [activeAction, setActiveAction] = useState<ExecutionMode | null>(null)

  const activeFile =
    files.find((file) => file.path === activePath) ??
    files.find((file) => file.path === lesson.exercise.entryFile) ??
    files[0]

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const raw = window.localStorage.getItem(storageKey)

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LessonFile[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFiles(parsed)
        }
      } catch {
        window.localStorage.removeItem(storageKey)
      }
    }

    setIsHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(files))

    if (!areFilesEqual(files, lesson.exercise.files)) {
      void persistLessonProgress(lesson.slug, 'in_progress')
    }
  }, [files, isHydrated, lesson.exercise.files, lesson.slug, storageKey, persistLessonProgress])

  function handleReset() {
    setFiles(lesson.exercise.files)
    setActivePath(lesson.exercise.entryFile)
    setResult({
      status: 'idle',
      headline: 'Starter restored',
      output: 'Every visible file has been reset to the original lesson workspace.',
    })
  }

  function updateFile(path: string, content: string) {
    setFiles((current) =>
      current.map((file) => (file.path === path ? { ...file, content } : file)),
    )
  }

  async function execute(mode: ExecutionMode) {
    setActiveAction(mode)
    setResult({
      status: 'running',
      headline: mode === 'run' ? 'Sending workspace to runner' : 'Checking lesson workspace',
      output:
        mode === 'run'
          ? `POST ${RUNNER_URL}/run\nPackaging ${files.length} lesson files for cargo run...`
          : `POST ${RUNNER_URL}/run\nPackaging ${files.length} lesson files for validation...`,
    })

    try {
      const response = await fetch(`${RUNNER_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonSlug: lesson.slug,
          entryFile: lesson.exercise.entryFile,
          files,
          mode,
          validation: lesson.exercise.validation,
        } satisfies ExecutionRequest),
      })

      const payload = (await response.json()) as ExecutionResult
      const nextResult = mode === 'check' ? formatCheckResult(payload) : payload

      setResult(nextResult)

      if (mode === 'check' && nextResult.passed) {
        await persistLessonProgress(lesson.slug, 'completed')
      } else if (mode === 'check' && nextResult.status !== 'running') {
        await persistLessonProgress(lesson.slug, 'in_progress')
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
          <h2>{activeFile?.path ?? lesson.exercise.entryFile}</h2>
        </div>
        <div className="workbench-status">
          <span>{progress[lesson.slug]?.status ?? 'not_started'}</span>
          <span>{result.status}</span>
          <span>{files.length} files</span>
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
            Reset workspace
          </button>
        </div>
        <p className="workbench-note">
          Code is saved per lesson workspace. Multi-file payloads go to runner `9091`.
        </p>
      </div>

      <div className="editor-layout">
        <aside className="file-sidebar">
          <p className="file-sidebar-label">Workspace files</p>
          <div className="file-list">
            {files.map((file) => (
              <button
                className={`file-tab ${file.path === activeFile?.path ? 'is-active' : ''}`}
                key={file.path}
                onClick={() => setActivePath(file.path)}
                type="button"
              >
                <span>{file.path}</span>
                <small>{file.editable === false ? 'hidden source' : 'editable'}</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="editor-shell">
          {activeFile ? (
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
              onChange={(value) => updateFile(activeFile.path, value ?? '')}
              options={{
                automaticLayout: true,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 14,
                lineNumbersMinChars: 3,
                minimap: { enabled: false },
                padding: { top: 18, bottom: 18 },
                readOnly: activeFile.editable === false,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                wordWrap: 'on',
              }}
              path={activeFile.path}
              theme="rust-learning-workbench"
              value={activeFile.content}
            />
          ) : null}
        </div>
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

function areFilesEqual(left: LessonFile[], right: LessonFile[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((file, index) => {
    const other = right[index]
    return (
      file.path === other?.path &&
      file.content === other?.content &&
      file.editable === other?.editable
    )
  })
}
