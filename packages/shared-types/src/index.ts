export type LessonStage =
  | 'Foundations'
  | 'Ownership Model'
  | 'Data Modeling'
  | 'Practical Rust'

export interface ExerciseCheck {
  type: 'contains' | 'not_contains' | 'regex'
  value: string
  message: string
}

export interface LessonFile {
  path: string
  content: string
  editable?: boolean
}

export type LessonValidation =
  | {
      kind: 'heuristic'
      checks: ExerciseCheck[]
    }
  | {
      kind: 'cargo_test'
      testFiles: LessonFile[]
    }

export interface LessonExercise {
  entryFile: string
  files: LessonFile[]
  prompt: string
  hint: string
  success: string
  sampleOutput?: string
  validation: LessonValidation
}

export interface Lesson {
  slug: string
  order: number
  stage: LessonStage
  title: string
  summary: string
  difficulty: 'Intro' | 'Core' | 'Stretch'
  duration: string
  objectives: string[]
  exercise: LessonExercise
}

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error'
export type ExecutionMode = 'run' | 'check'

export interface ExecutionRequest {
  lessonSlug: string
  entryFile: string
  files: LessonFile[]
  mode: ExecutionMode
  validation: LessonValidation
}

export interface ExecutionResult {
  status: ExecutionStatus
  headline: string
  output: string
  passed?: boolean
  checks?: ExecutionCheckResult[]
}

export interface ExecutionCheckResult {
  passed: boolean
  message: string
}

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed'

export interface LessonProgressEntry {
  status: LessonProgressStatus
  updatedAt: string
}

export type LessonProgressMap = Record<string, LessonProgressEntry>

export interface LessonProgressUpdateRequest {
  lessonSlug: string
  status: LessonProgressStatus
}

export interface LspSessionCreateRequest {
  lessonSlug: string
  entryFile: string
  files: LessonFile[]
}

export interface LspSessionCreateResponse {
  sessionId: string
  rootPath: string
  filePaths: Record<string, string>
}
