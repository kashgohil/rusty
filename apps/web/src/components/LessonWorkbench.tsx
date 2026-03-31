import Editor from '@monaco-editor/react'
import type { ExecutionResult, Lesson } from '@rust-learning/shared-types'
import { useEffect, useMemo, useState } from 'react'

const RUN_DELAY_MS = 900

export function LessonWorkbench({ lesson }: { lesson: Lesson }) {
  const storageKey = useMemo(
    () => `rust-learning:lesson:${lesson.slug}:code`,
    [lesson.slug],
  )

  const [code, setCode] = useState(lesson.exercise.starterCode)
  const [isHydrated, setIsHydrated] = useState(false)
  const [result, setResult] = useState<ExecutionResult>({
    status: 'idle',
    headline: 'Ready to run',
    output:
      'Use the editor to change the lesson code, then run the mock compile loop. This will later be replaced by the real runner service.',
  })

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
  }, [code, isHydrated, storageKey])

  function handleReset() {
    setCode(lesson.exercise.starterCode)
    setResult({
      status: 'idle',
      headline: 'Starter restored',
      output: 'The lesson code has been reset to its original starter template.',
    })
  }

  function handleRun() {
    setResult({
      status: 'running',
      headline: 'Compiling mock workspace',
      output: 'Checking syntax, lesson heuristics, and simulated runner output...',
    })

    window.setTimeout(() => {
      setResult(simulateExecution(lesson, code))
    }, RUN_DELAY_MS)
  }

  return (
    <article className="workbench-panel">
      <div className="workbench-header">
        <div>
          <p className="eyebrow">Lesson IDE</p>
          <h2>{lesson.exercise.fileName}</h2>
        </div>
        <div className="workbench-status">
          <span>{result.status}</span>
          <span>LSP next</span>
        </div>
      </div>

      <div className="workbench-controls">
        <div className="workbench-control-group">
          <button className="primary-pill" onClick={handleRun} type="button">
            Run lesson
          </button>
          <button className="ghost-pill" onClick={handleReset} type="button">
            Reset starter
          </button>
        </div>
        <p className="workbench-note">
          Code is saved per lesson in local browser storage.
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

function simulateExecution(lesson: Lesson, code: string): ExecutionResult {
  const trimmed = code.trim()

  if (!trimmed) {
    return {
      status: 'error',
      headline: 'No code to compile',
      output: 'The file is empty. Restore the starter or write a small Rust program first.',
    }
  }

  if (hasUnbalancedDelimiters(code)) {
    return {
      status: 'error',
      headline: 'Mock compiler error',
      output:
        'error: this file has unbalanced braces or parentheses.\nhelp: close every opened block before running again.',
    }
  }

  if (lesson.slug === 'ownership-basics' && code.includes('let moved = message;') && code.includes('println!("{message}")')) {
    return {
      status: 'error',
      headline: 'Borrow checker stopped the run',
      output:
        'error[E0382]: borrow of moved value: `message`\nhelp: clone `message` or borrow it instead of moving it before the second println! call.',
    }
  }

  if (lesson.slug === 'borrowing-and-references' && code.includes('fn print_length(text: String)')) {
    return {
      status: 'error',
      headline: 'Ownership mismatch',
      output:
        'error[E0382]: borrow of moved value: `note`\nhelp: change the parameter to `&String` or `&str` so the helper borrows instead of taking ownership.',
    }
  }

  const successOutput = lesson.exercise.sampleOutput ?? defaultSuccessOutput(lesson, code)

  return {
    status: 'success',
    headline: 'Mock run completed',
    output: successOutput,
  }
}

function hasUnbalancedDelimiters(input: string) {
  const pairs: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{',
  }
  const stack: string[] = []

  for (const char of input) {
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char)
      continue
    }

    if (char === ')' || char === ']' || char === '}') {
      const expected = pairs[char]
      const actual = stack.pop()

      if (actual !== expected) {
        return true
      }
    }
  }

  return stack.length > 0
}

function defaultSuccessOutput(lesson: Lesson, code: string) {
  if (lesson.slug === 'hello-rust') {
    return 'Finished `dev` profile [unoptimized + debuginfo]\nRunning `main.rs`\nHello, Rust learner!\nReason: building real systems safely.'
  }

  if (lesson.slug === 'build-a-cli') {
    return 'Finished `dev` profile [unoptimized + debuginfo]\nRunning `main.rs notes.txt`\nLine count: 42'
  }

  const printlnCount = (code.match(/println!/g) ?? []).length

  return [
    'Finished `dev` profile [unoptimized + debuginfo]',
    `Running \`${lesson.exercise.fileName}\``,
    `Detected ${printlnCount} println! macro call${printlnCount === 1 ? '' : 's'}.`,
    lesson.exercise.success,
  ].join('\n')
}
