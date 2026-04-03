const LEARNER_STORAGE_KEY = 'rust-learning:learner-id'

export function getLearnerId() {
  if (typeof window === 'undefined') {
    return 'server-preview'
  }

  const existing = window.localStorage.getItem(LEARNER_STORAGE_KEY)

  if (existing) {
    return existing
  }

  const next = `learner-${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(LEARNER_STORAGE_KEY, next)
  return next
}
