import type { Lesson } from '@rust-learning/shared-types'
import { useEffect, useState } from 'react'
import { fetchLesson, fetchLessons } from './api'

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void fetchLessons()
      .then((data) => {
        if (!cancelled) {
          setLessons(data)
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

  return { lessons, isLoading }
}

export function useLesson(slug: string) {
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    void fetchLesson(slug).then((data) => {
      if (!cancelled) {
        setLesson(data)
      }
    })

    return () => {
      cancelled = true
    }
  }, [slug])

  return {
    lesson,
    isLoading: lesson === undefined,
  }
}
