import type {
  LessonProgressEntry,
  LessonProgressMap,
  LessonProgressStatus,
} from '@rust-learning/shared-types'

export const PROGRESS_STORAGE_KEY = 'rust-learning:lesson-progress'

export function readLessonProgress(): LessonProgressMap {
  if (typeof window === 'undefined') {
    return {}
  }

  const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY)

  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as LessonProgressMap
    return parsed ?? {}
  } catch {
    return {}
  }
}

export function writeLessonProgress(progress: LessonProgressMap) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress))
  window.dispatchEvent(new CustomEvent('rust-learning:progress-updated'))
}

export function updateLessonProgress(
  lessonSlug: string,
  status: LessonProgressStatus,
) {
  const current = readLessonProgress()
  const nextEntry: LessonProgressEntry = {
    status,
    updatedAt: new Date().toISOString(),
  }

  writeLessonProgress({
    ...current,
    [lessonSlug]: nextEntry,
  })
}
