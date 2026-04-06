import type {
  Lesson,
  LessonProgressMap,
  LessonProgressUpdateRequest,
} from '@rust-learning/shared-types'
import { API_URL } from '~/utils/env'

export async function fetchLessons() {
  const response = await fetch(`${API_URL}/lessons`)

  if (!response.ok) {
    throw new Error('Failed to load lessons from API')
  }

  return (await response.json()) as Lesson[]
}

export async function fetchLesson(slug: string) {
  const response = await fetch(`${API_URL}/lessons/${slug}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load lesson ${slug}`)
  }

  return (await response.json()) as Lesson
}

export async function fetchProgress(learnerId: string) {
  const response = await fetch(`${API_URL}/progress/${learnerId}`)

  if (!response.ok) {
    throw new Error('Failed to load learner progress')
  }

  return (await response.json()) as LessonProgressMap
}

export async function persistProgress(
  learnerId: string,
  payload: LessonProgressUpdateRequest,
) {
  const response = await fetch(`${API_URL}/progress/${learnerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to persist learner progress')
  }

  return (await response.json()) as LessonProgressMap
}
