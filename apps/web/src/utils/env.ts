const DEFAULT_API_URL = 'http://127.0.0.1:9092'
const DEFAULT_RUNNER_URL = 'http://127.0.0.1:9091'

function normalizeBaseUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim() || fallback
  return candidate.replace(/\/+$/, '')
}

export const API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL, DEFAULT_API_URL)
export const RUNNER_URL = normalizeBaseUrl(
  import.meta.env.VITE_RUNNER_URL,
  DEFAULT_RUNNER_URL,
)
export const LSP_URL = normalizeBaseUrl(import.meta.env.VITE_LSP_URL, API_URL)

