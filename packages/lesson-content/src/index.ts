import type { Lesson, LessonStage } from '@rust-learning/shared-types'
import lessons from './lessons.json'

export const stageOrder: LessonStage[] = [
  'Foundations',
  'Ownership Model',
  'Data Modeling',
  'Practical Rust',
]

export const curriculum = lessons as Lesson[]

export function getLessonBySlug(slug: string) {
  return curriculum.find((lesson) => lesson.slug === slug)
}
