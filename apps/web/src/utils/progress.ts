import type {
  LessonProgressMap,
  LessonProgressStatus,
} from '@rust-learning/shared-types'
import { fetchProgress, persistProgress } from './api'
import { getLearnerId } from './learner'

export async function readLessonProgress() {
  return fetchProgress(getLearnerId())
}

export async function updateLessonProgress(
  lessonSlug: string,
  status: LessonProgressStatus,
) {
  return persistProgress(getLearnerId(), {
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
