import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  type LearnerSearch,
  getOrCreateLearnerId,
  normalizeLearnerId,
  setStoredLearnerId,
} from './learner'

export function useLearnerIdentity() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const search = useRouterState({
    select: (state) => state.location.search as Record<string, unknown>,
  })
  const learnerFromUrl = useMemo(
    () => normalizeLearnerId(search.learner),
    [search],
  )
  const [learnerId, setLearnerId] = useState<string | null>(learnerFromUrl ?? null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const resolvedLearnerId = learnerFromUrl ?? getOrCreateLearnerId()

    setStoredLearnerId(resolvedLearnerId)
    setLearnerId(resolvedLearnerId)

    if (!learnerFromUrl) {
      void navigate({
        to: pathname,
        search: (previous) => ({
          ...(previous as Record<string, unknown>),
          learner: resolvedLearnerId,
        }),
        replace: true,
      })
    }
  }, [learnerFromUrl, navigate, pathname])

  return {
    isResolved: learnerId !== null,
    learnerId,
    learnerSearch: learnerId ? ({ learner: learnerId } satisfies LearnerSearch) : undefined,
  }
}
