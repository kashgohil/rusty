import type { LessonProgressMap } from '@rust-learning/shared-types'
import { useEffect, useState } from 'react'
import { readLessonProgress } from './progress'

export function useLessonProgress() {
  const [progress, setProgress] = useState<LessonProgressMap>({})

  useEffect(() => {
    const sync = () => {
      setProgress(readLessonProgress())
    }

    sync()

    window.addEventListener('storage', sync)
    window.addEventListener('rust-learning:progress-updated', sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('rust-learning:progress-updated', sync)
    }
  }, [])

  return progress
}
