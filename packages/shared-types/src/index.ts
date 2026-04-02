export type LessonStage =
  | 'Foundations'
  | 'Ownership Model'
  | 'Data Modeling'
  | 'Practical Rust'

export interface LessonExercise {
  fileName: string
  prompt: string
  starterCode: string
  hint: string
  success: string
  sampleOutput?: string
  checks: ExerciseCheck[]
}

export interface ExerciseCheck {
  type: 'contains' | 'not_contains' | 'regex'
  value: string
  message: string
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
  fileName: string
  code: string
  mode: ExecutionMode
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
