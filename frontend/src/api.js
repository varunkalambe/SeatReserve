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

async function request(path, { token, ...options } = {}) {
  const method = options.method || 'GET'
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

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (cause) {
    debugLog('API', '✗ network error', method, path, cause)
    const networkError = new Error(
      'Cannot reach the server. Check your internet connection and try again.'
    )
    networkError.status = 0
    throw networkError
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  checkBackendBuild(response, path)

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
    const error = new Error(
      data?.error ||
        (response.status === 429
          ? 'Too many requests. Please wait a minute and try again.'
          : `Request failed with status ${response.status}`)
    )
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
