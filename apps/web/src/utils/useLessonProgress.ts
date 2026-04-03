import type { LessonProgressMap } from '@rust-learning/shared-types'
import { useEffect, useState } from 'react'
import {
  optimisticProgressUpdate,
  readLessonProgress,
  updateLessonProgress,
} from './progress'

export function useLessonProgress() {
  const [progress, setProgress] = useState<LessonProgressMap>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void readLessonProgress().then((next) => {
      if (!cancelled) {
        setProgress(next)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function persistLessonProgress(
    lessonSlug: string,
    status: 'not_started' | 'in_progress' | 'completed',
  ) {
    setProgress((current) => optimisticProgressUpdate(current, lessonSlug, status))

    try {
      const next = await updateLessonProgress(lessonSlug, status)
      setProgress(next)
    } catch {
      // Keep optimistic state for now; retry logic can come later.
    }
  }

  return { progress, isLoading, persistLessonProgress }
}
