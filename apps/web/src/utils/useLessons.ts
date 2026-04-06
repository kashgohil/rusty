import type { Lesson } from '@rust-learning/shared-types'
import { useEffect, useState } from 'react'
import { fetchLesson, fetchLessons } from './api'

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchLessons()
      .then((data) => {
        if (!cancelled) {
          setLessons(data)
          setError(null)
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setLessons([])
          setError(
            cause instanceof Error
              ? cause.message
              : 'Failed to load lessons from the API.',
          )
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
  }, [])

  return { lessons, isLoading, error }
}

export function useLesson(slug: string) {
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchLesson(slug)
      .then((data) => {
        if (!cancelled) {
          setLesson(data)
          setError(null)
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setLesson(null)
          setError(
            cause instanceof Error
              ? cause.message
              : `Failed to load lesson ${slug}.`,
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return {
    lesson,
    isLoading: lesson === undefined,
    error,
  }
}
