// API configuration for YMV Limo
// Update API_BASE to point to your backend when ready

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Remove Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  })

  if (res.status === 401) {
    // TODO: redirect to login when auth is implemented
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return null

  return res.json()
}
