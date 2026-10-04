const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '')

// Debug tracing: always on in `npm run dev`; in production run
//   localStorage.setItem('srvDebug', '1')   (then reload)   to turn it on, '0' to turn it off.
export function isDebugEnabled() {
  try {
    const flag = window.localStorage.getItem('srvDebug')
    if (flag === '1') return true
    if (flag === '0') return false
  } catch {
    /* storage may be unavailable */
  }
  return Boolean(import.meta.env.DEV)
}

export function debugLog(scope, ...details) {
  if (isDebugEnabled()) {
    console.log(`%c[SRV:${scope}]`, 'color:#2563eb;font-weight:bold', ...details)
  }
}

// The backend stamps every response with X-SRV-Build. If it is missing, an OLD backend container is
// still running (typical after `docker compose up --build` did not recreate the container).
let backendBuildChecked = false

function checkBackendBuild(response, path) {
  const build = response.headers.get('X-SRV-Build')

  if (build) {
    if (!backendBuildChecked) {
      debugLog('BUILD', `backend build = ${build}`)
    }
    backendBuildChecked = true
    return
  }

  if (backendBuildChecked || path.startsWith('/actuator')) return
  backendBuildChecked = true

  console.error(
    '[SRV] The backend did not send X-SRV-Build. It is probably an OLD build (or CORS hides the header).\n' +
      'Fix:  docker compose up -d --build --force-recreate backend\n' +
      'Then check:  docker compose logs backend | findstr BUILD'
  )

  window.dispatchEvent(new CustomEvent('srv-backend-stale'))
}

const GATEWAY_STATUSES = new Set([502, 503, 504])

// A sleeping free-tier backend (Render) can need a while to wake up, so be generous.
const REQUEST_TIMEOUT_MS = 100000
const GET_ATTEMPTS = 3

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(path, { token, ...options } = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const startedAt = performance.now()
  let sentBody = ''
  if (typeof options.body === 'string') {
    try {
      sentBody = JSON.parse(options.body)
    } catch {
      sentBody = options.body
    }
  } else if (options.body) {
    sentBody = '[non-JSON body]'
  }
  debugLog('API', '→', method, path, sentBody)

  const headers = new Headers(options.headers || {})

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Only idempotent GET requests are retried (network drop or a proxy answering 502/503/504 while the
  // backend wakes up). POST/PATCH are never replayed automatically: that could pay or book twice.
  const maxAttempts = method === 'GET' ? GET_ATTEMPTS : 1

  let response = null
  let lastFailure = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        method,
        headers,
        signal: controller.signal,
      })
      lastFailure = null
    } catch (cause) {
      response = null
      lastFailure = cause
      debugLog('API', '✗ network error', method, path, `attempt ${attempt}/${maxAttempts}`, cause)
    } finally {
      clearTimeout(timer)
    }

    const retryable =
      response === null || (method === 'GET' && GATEWAY_STATUSES.has(response.status))

    if (!retryable || attempt === maxAttempts) break

    await sleep(1500 * attempt)
  }

  if (response === null) {
    const timedOut = lastFailure?.name === 'AbortError'
    const networkError = new Error(
      timedOut
        ? 'The server took too long to respond. It may be waking up - please try again in a moment.'
        : 'Cannot reach the server. Check your internet connection and try again.'
    )
    networkError.status = 0
    throw networkError
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!GATEWAY_STATUSES.has(response.status)) {
    checkBackendBuild(response, path)
  }

  debugLog(
    'API',
    response.ok ? '←' : '✗',
    response.status,
    method,
    path,
    `${Math.round(performance.now() - startedAt)}ms`,
    data
  )

  if (!response.ok) {
    let message = data?.error

    if (!message) {
      if (response.status === 429) {
        message = 'Too many requests. Please wait a minute and try again.'
      } else if (GATEWAY_STATUSES.has(response.status)) {
        message =
          'The server is starting up or temporarily unavailable. Please wait a few seconds and try again.'
      } else if (response.status === 404 && !API_BASE_URL && !import.meta.env.DEV) {
        // Production build without VITE_API_BASE_URL: /api/... is requested from the static host.
        message =
          'The app is not connected to its backend. Set VITE_API_BASE_URL to the backend URL in the hosting settings and redeploy.'
        console.error(
          `[SRV] ${method} ${path} returned 404 from the static host. ` +
            'VITE_API_BASE_URL is empty in this build, so API calls never reach the backend.'
        )
      } else {
        message = `Request failed with status ${response.status}`
      }
    }

    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

const query = (values) => {
  const search = new URLSearchParams()

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  })

  return search.toString()
}

export const api = {
  register: (payload) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  searchBuses: (params) =>
    request(`/api/buses/search?${query(params)}`),

  popularBuses: () =>
    request('/api/buses/popular'),

  getBus: (tripId) =>
    request(`/api/buses/${tripId}`),

  getSeats: (token, tripId) =>
    request(`/api/seats?${query({ tripId })}`, { token }),

  getMyReservations: (token) =>
    request('/api/reservations/me', { token }),

  holdSeat: (token, payload) =>
    request('/api/reservations', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  holdSeats: (token, payload) =>
    request('/api/reservations/batch', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  releaseHolds: (token, payload) =>
    request('/api/reservations/release', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  cancelReservation: (token, reservationId) =>
    request(`/api/reservations/${reservationId}/cancel`, {
      method: 'POST',
      token,
    }),

  pay: (token, payload) =>
    request('/api/payments', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  payBatch: (token, payload) =>
    request('/api/payments/batch', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  getPayment: (token, reservationId) =>
    request(`/api/payments/${reservationId}`, { token }),

  getTicket: (token, reservationId) =>
    request(`/api/tickets/${reservationId}`, { token }),

  getProfile: (token) =>
    request('/api/profile', { token }),

  updateProfile: (token, payload) =>
    request('/api/profile', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    }),

  getWallet: (token) =>
    request('/api/wallet', { token }),

  getWalletTransactions: (token) =>
    request('/api/wallet/transactions', { token }),

  topUpWallet: (token, amount) =>
    request('/api/wallet/top-up', {
      method: 'POST',
      token,
      body: JSON.stringify({ amount }),
    }),

  getSupportTickets: (token) =>
    request('/api/support/tickets', { token }),

  createSupportTicket: (token, payload) =>
    request('/api/support/tickets', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  getNotifications: (token) =>
    request('/api/notifications', { token }),
}


