import type { LessonProgressMap } from '@rust-learning/shared-types'
import { useEffect, useState } from 'react'
import {
  optimisticProgressUpdate,
  readLessonProgress,
  updateLessonProgress,
} from './progress'

export function useLessonProgress(learnerId: string | null) {
  const [progress, setProgress] = useState<LessonProgressMap>({})
  const [isLoading, setIsLoading] = useState(learnerId !== null)

  useEffect(() => {
    if (!learnerId) {
      setProgress({})
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    void readLessonProgress(learnerId)
      .then((next) => {
        if (!cancelled) {
          setProgress(next)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProgress({})
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [learnerId])

  async function persistLessonProgress(
    lessonSlug: string,
    status: 'not_started' | 'in_progress' | 'completed',
  ) {
    if (!learnerId) {
      return
    }

    setProgress((current) => optimisticProgressUpdate(current, lessonSlug, status))

    try {
      const next = await updateLessonProgress(learnerId, lessonSlug, status)
      setProgress(next)
    } catch {
      // Keep optimistic state for now; retry logic can come later.
    }
  }

  return { progress, isLoading, persistLessonProgress }
}
