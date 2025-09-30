// Minimal helper to build API URLs that work in dev and production
export function apiUrl(path: string): string {
  const isBrowser = typeof window !== 'undefined'
  const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  // In development use explicit backend URL; in production use same-origin relative path
  const base = isLocalhost ? 'http://localhost:4000' : ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${base}${path}`
}

export function apiFetch(input: string, init?: RequestInit) {
  return fetch(apiUrl(input), init)
}


