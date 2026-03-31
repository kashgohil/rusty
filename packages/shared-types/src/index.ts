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
