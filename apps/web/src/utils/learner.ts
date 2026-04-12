const LEARNER_STORAGE_KEY = 'rust-learning:learner-id'

export type LearnerSearch = {
  learner?: string
}

export function normalizeLearnerId(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (normalized.length < 3) {
    return undefined
  }

  return normalized.slice(0, 40)
}

export function validateLearnerSearch(search: Record<string, unknown>): LearnerSearch {
  const learner = normalizeLearnerId(search.learner)

  if (!learner) {
    return {}
  }

  return { learner }
}

export function createLearnerId() {
  return `learner-${Math.random().toString(36).slice(2, 10)}`
}

export function getStoredLearnerId() {
  if (typeof window === 'undefined') {
    return null
  }

  return normalizeLearnerId(window.localStorage.getItem(LEARNER_STORAGE_KEY))
}

export function setStoredLearnerId(learnerId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LEARNER_STORAGE_KEY, learnerId)
}

export function getOrCreateLearnerId() {
  const existing = getStoredLearnerId()

  if (existing) {
    return existing
  }

  const next = createLearnerId()
  setStoredLearnerId(next)
  return next
}

export function buildLearnerUrl(pathname: string, learnerId: string) {
  if (typeof window === 'undefined') {
    return `${pathname}?learner=${learnerId}`
  }

  const url = new URL(pathname, window.location.origin)
  url.searchParams.set('learner', learnerId)
  return url.toString()
}
