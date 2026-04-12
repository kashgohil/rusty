import type {
  LessonProgressMap,
  LessonProgressStatus,
} from '@rust-learning/shared-types'
import { fetchProgress, persistProgress } from './api'

export async function readLessonProgress(learnerId: string) {
  return fetchProgress(learnerId)
}

export async function updateLessonProgress(
  learnerId: string,
  lessonSlug: string,
  status: LessonProgressStatus,
) {
  return persistProgress(learnerId, {
    lessonSlug,
    status,
  })
}

export function optimisticProgressUpdate(
  progress: LessonProgressMap,
  lessonSlug: string,
  status: LessonProgressStatus,
): LessonProgressMap {
  return {
    ...progress,
    [lessonSlug]: {
      status,
      updatedAt: new Date().toISOString(),
    },
  }
}
