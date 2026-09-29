import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { api, debugLog } from './api'
import './App.css'

const AUTH_STORAGE_KEY = 'seat-reserve-auth'

function loadStoredAuth() {
  try {
    const localValue = localStorage.getItem(AUTH_STORAGE_KEY)
    if (localValue) return JSON.parse(localValue)

    const sessionValue = sessionStorage.getItem(AUTH_STORAGE_KEY)
    return sessionValue ? JSON.parse(sessionValue) : null
  } catch {
    return null
  }
}

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v10h14V9"/><path d="M9 19v-6h6v6"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M7 2.5v4M17 2.5v4M3 9h18"/><path d="M7 13h3M14 13h3M7 17h3"/></>,
    wallet: <><path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 12h5M17 12a1 1 0 1 0 0 2"/></>,
    user: <><circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21c.7-4.2 3-6 7.5-6s6.8 1.8 7.5 6"/></>,
    support: <><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5h7M8.5 10.5h7"/><path d="M12 3.5V2"/></>,
    bell: <><path d="M6.5 17.5h11l-1.2-2.1V10a4.3 4.3 0 0 0-8.6 0v5.4Z"/><path d="M10 19.5c.4 1 1.1 1.5 2 1.5s1.6-.5 2-1.5"/></>,
    bus: <><rect x="4" y="3" width="16" height="17" rx="3"/><path d="M4 11h16M7 16h.01M17 16h.01M7 20v2M17 20v2"/><path d="M7 6h10v3H7z"/></>,
    arrow: <path d="M4 12h16M14 6l6 6-6 6"/>,
    swap: <><path d="M7 7h11M15 4l3 3-3 3"/><path d="M17 17H6M9 14l-3 3 3 3"/></>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>,
    star: <path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.7-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>,
    ticket: <><path d="M4 6.5A2.5 2.5 0 0 0 6.5 4h11A2.5 2.5 0 0 0 20 6.5v1.2a2.8 2.8 0 0 0 0 5.6v1.2a2.5 2.5 0 0 0-2.5 2.5h-11A2.5 2.5 0 0 0 4 16.5v-1.2a2.8 2.8 0 0 0 0-5.6z"/><path d="M12 7v1M12 10v1M12 13v1M12 16v1"/></>,
    logout: <><path d="M10 5H5v14h5"/><path d="m15 8 4 4-4 4M8 12h11"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m8 10 4 4 4-4"/>,
    more: <><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></>,
    shield: <><path d="M12 3 19 6v5c0 4.7-2.5 7.5-7 10-4.5-2.5-7-5.3-7-10V6z"/><path d="m8.5 12 2.2 2.2L15.5 9"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    phone: <><path d="M7 3.5 9.5 5 8 8c1.2 2.3 2.7 3.8 5 5l3-1.5L17.5 14c.5.3 1 .8 1.3 1.3l-1.4 3.1c-.3.7-1 1.1-1.8 1-4.6-.6-9.8-5.8-10.4-10.4-.1-.8.3-1.5 1-1.8z"/></>,
    edit: <><path d="m4 16 10.8-10.8a2.1 2.1 0 0 1 3 3L7 19H4z"/><path d="m13.5 6.5 4 4"/></>,
    help: <><circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.5 2.5 0 1 1 4.8 1.2c-.5 1-1.8 1.2-2.3 2.1-.2.3-.2.8-.2 1.2"/><path d="M12 17h.01"/></>,
    download: <><path d="M12 3v11M8 10l4 4 4-4M4 19v2h16v-2"/></>,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.more}
    </svg>
  )
}

function Brand({ compact = false }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand'}>
      <span className="brand-icon">
        <Icon name="bus" size={22} strokeWidth={2.2} />
      </span>
      <span>
        <strong>Seat<span>Reserve</span></strong>
        {!compact && <small>Travel Smarter. Together.</small>}
      </span>
    </div>
  )
}

// Stamp every reservation list with the moment it reached the browser so the 5-minute seat lock
// can be counted down from the SERVER-computed seconds (no timezone or clock-skew problems).
function stampReservations(list) {
  const receivedAt = Date.now()
  return (list || []).map(item => ({ ...item, _receivedAt: receivedAt }))
}

function holdRemainingMs(reservation) {
  if (!reservation) return 0

  if (
    typeof reservation.holdSecondsRemaining === 'number' &&
    reservation._receivedAt
  ) {
    return Math.max(
      0,
      reservation.holdSecondsRemaining * 1000 -
        (Date.now() - reservation._receivedAt)
    )
  }

  const parsed = new Date(reservation.expiresAt).getTime()
  return Number.isFinite(parsed) ? Math.max(0, parsed - Date.now()) : 0
}

function Countdown({ reservation, onExpired }) {
  const [remaining, setRemaining] = useState(() => holdRemainingMs(reservation))

  useEffect(() => {
    let fired = false

    debugLog('COUNTDOWN', 'start', {
      reservationId: reservation?.reservationId,
      status: reservation?.status,
      holdSecondsRemaining: reservation?.holdSecondsRemaining,
      expiresAt: reservation?.expiresAt,
      receivedAt: reservation?._receivedAt,
      remainingMs: holdRemainingMs(reservation),
      browserNow: new Date().toISOString(),
    })

    const update = () => {
      const next = holdRemainingMs(reservation)
      setRemaining(next)

      if (next === 0 && !fired) {
        fired = true
        debugLog('COUNTDOWN', 'reached zero', reservation?.reservationId)
        onExpired?.()
      }
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [reservation, onExpired])

  const seconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(seconds / 60)

  return (
    <span className={remaining ? 'countdown' : 'countdown expired'}>
      {remaining ? `${minutes}:${String(seconds % 60).padStart(2, '0')}` : 'Expired'}
    </span>
  )
}

function StatusPill({ status }) {
  const labels = {
    AVAILABLE: 'Available',
    HELD: 'On hold',
    BOOKED: 'Booked',
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
  }

  return (
    <span className={`status-pill status-${String(status).toLowerCase()}`}>
      {labels[status] || status}
    </span>
  )
}

function formatDate(value, options = {}) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(value))
}

function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function duration(minutes) {
  const value = Number(minutes || 0)
  const hours = Math.floor(value / 60)
  const mins = value % 60
  return `${hours}h ${mins}m`
}

function getDateInputValue(days = 1) {
  const date = new Date()
  date.setDate(date.getDate() + days)

  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const payload = mode === 'login'
        ? {
            username: form.email,
            password: form.password,
          }
        : {
            fullName: form.fullName,
            email: form.email,
            password: form.password,
          }

      const response = mode === 'login'
        ? await api.login(payload)
        : await api.register(payload)

      onAuthenticated(response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-showcase">
        <div className="auth-showcase-top"><Brand /></div>

        <div className="auth-showcase-copy">
          <span className="eyebrow">BUS TRAVEL, REIMAGINED</span>
          <h1>
            Book your journey<br />
            <em>hassle-free.</em>
          </h1>
          <p>Safe. Simple. Reliable.</p>
        </div>

        <div className="auth-road">
          <div className="mountain mountain-one" />
          <div className="mountain mountain-two" />
          <div className="hero-bus-large">
            <Icon name="bus" size={160} strokeWidth={1.15} />
          </div>
        </div>

        <div className="auth-benefits">
          <div>
            <span><Icon name="clock" /></span>
            <strong>Real-time</strong>
            <small>Availability</small>
          </div>
          <div>
            <span><Icon name="shield" /></span>
            <strong>Secure</strong>
            <small>Payments</small>
          </div>
          <div>
            <span><Icon name="check" /></span>
            <strong>Instant</strong>
            <small>Confirmation</small>
          </div>
          <div>
            <span><Icon name="ticket" /></span>
            <strong>Easy</strong>
            <small>Bookings</small>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-card">
          <Brand compact />

          <div className="auth-tabs">
            <button
              className={mode === 'login' ? 'active' : ''}
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              Log in
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              type="button"
              onClick={() => {
                setMode('register')
                setError('')
              }}
            >
              Sign up
            </button>
          </div>

          <div className="auth-title">
            <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p>
              {mode === 'login'
                ? 'Log in to continue your journey'
                : 'Join us and start your journey'}
            </p>
          </div>

          {error && <div className="alert error">{error}</div>}

          <form className="form-stack" onSubmit={submit}>
            {mode === 'register' && (
              <label>
                Full Name
                <input
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Your full name"
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <div className="input-with-icon">
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
                  minLength={8}
                  required
                />
                <Icon name="shield" size={17} />
              </div>
            </label>

            <button className="blue-button wide" disabled={busy} type="submit">
              {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <p className="auth-foot">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError('')
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

function Sidebar({ activeView, setActiveView, onLogout }) {
  const items = [
    ['home', 'Home', 'home'],
    ['bookings', 'My Bookings', 'ticket'],
    ['search', 'Search Buses', 'search'],
    ['wallet', 'Wallet', 'wallet'],
    ['profile', 'Profile', 'user'],
    ['support', 'Support', 'support'],
  ]

  return (
    <aside className="sidebar">
      <Brand compact />

      <nav>
        {items.map(([key, label, icon]) => (
          <button
            key={key}
            className={activeView === key ? 'nav-item active' : 'nav-item'}
            type="button"
            onClick={() => setActiveView(key)}
          >
            <Icon name={icon} size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-promo">
          <span>New routes</span>
          <strong>Discover your next trip.</strong>
          <button type="button" onClick={() => setActiveView('search')}>
            Explore <Icon name="arrow" size={14} />
          </button>
        </div>

        <button
          type="button"
          className="nav-item logout"
          onClick={onLogout}
        >
          <Icon name="logout" size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

function Topbar({ profile, notifications, onNotifications, onNavigate }) {
  const [query, setQuery] = useState('')

  return (
    <header className="topbar-app">
      <div className="mobile-brand"><Brand compact /></div>

      <div className="global-search">
        <Icon name="search" size={17} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onNavigate('search', query)
              setQuery('')
            }
          }}
          placeholder="Search routes, destinations…"
        />
        <kbd>Enter</kbd>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button notification-button"
          onClick={onNotifications}
        >
          <Icon name="bell" size={19} />
          {notifications.length > 0 && <span className="notification-dot" />}
        </button>

        <button
          type="button"
          className="profile-chip"
          onClick={() => onNavigate('profile')}
        >
          <span className="avatar-photo">
            {(profile?.fullName || profile?.username || 'V').slice(0, 1).toUpperCase()}
          </span>
          <span className="profile-name">
            {profile?.fullName || profile?.username || 'Varun'}
          </span>
          <Icon name="chevron" size={15} />
        </button>
      </div>
    </header>
  )
}

const POPULAR_CITIES = [
  'Pune',
  'Mumbai',
  'Nashik',
  'Goa',
  'Bangalore',
  'Delhi',
  'Jaipur',
  'Hyderabad',
  'Ahmedabad',
  'Surat',
  'Chennai',
  'Pondicherry',
]

// One city field: type to filter, click a suggestion, or press x to clear it.
function CityInput({ label, value, onChange, otherValue, placeholder, onEnter }) {
  const inputId = useId()
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = event => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  const query = value.trim().toLowerCase()
  const other = otherValue.trim().toLowerCase()
  const isExactCity = POPULAR_CITIES.some(city => city.toLowerCase() === query)

  // A finished value (e.g. "Pune") shows the whole list so it is easy to switch to another city.
  const suggestions = POPULAR_CITIES
    .filter(city => city.toLowerCase() !== other)
    .filter(city => !query || isExactCity || city.toLowerCase().includes(query))
    // Cities that START with what was typed come first, so Enter picks the most likely one.
    .sort((a, b) => {
      if (!query || isExactCity) return 0
      const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1
      const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1
      return aStarts - bStarts
    })

  const choose = city => {
    debugLog('SEARCH', `${label} chosen`, city)
    onChange(city)
    setOpen(false)
  }

  return (
    <div className="sb-field" ref={wrapRef}>
      <label className="sb-label" htmlFor={inputId}>{label}</label>

      <div className={`sb-control${open ? ' is-open' : ''}`}>
        <Icon name="map" size={16} />
        <input
          id={inputId}
          ref={inputRef}
          value={value}
          autoComplete="off"
          placeholder={placeholder}
          onChange={event => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setOpen(false)
            } else if (event.key === 'Enter') {
              event.preventDefault()

              if (open && query && !isExactCity && suggestions.length > 0) {
                choose(suggestions[0])
              } else {
                setOpen(false)
                onEnter?.()
              }
            }
          }}
        />

        {value && (
          <button
            type="button"
            className="sb-clear"
            aria-label={`Clear ${label}`}
            title={`Clear ${label}`}
            onMouseDown={event => event.preventDefault()}
            onClick={() => {
              debugLog('SEARCH', `${label} cleared`)
              onChange('')
              setOpen(true)
              inputRef.current?.focus()
            }}
          >
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {open && (
        <div className="sb-menu" role="listbox" aria-label={`${label} suggestions`}>
          {suggestions.length > 0 ? (
            suggestions.map(city => (
              <button
                key={city}
                type="button"
                role="option"
                aria-selected={city.toLowerCase() === query}
                className={`sb-option${city.toLowerCase() === query ? ' is-selected' : ''}`}
                onMouseDown={event => event.preventDefault()}
                onClick={() => choose(city)}
              >
                <Icon name="map" size={14} />
                {city}
                {city.toLowerCase() === query && <Icon name="check" size={14} />}
              </button>
            ))
          ) : (
            <div className="sb-empty">
              No suggestion for “{value.trim()}”. Press Search to use it as typed.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchBox({ initial = {}, onSearch, onPassengersChange }) {
  const [from, setFrom] = useState(initial.from ?? 'Pune')
  const [to, setTo] = useState(initial.to ?? 'Mumbai')
  const [date, setDate] = useState(initial.date || getDateInputValue(1))
  const [passengers, setPassengers] = useState(initial.passengers || 1)
  const [error, setError] = useState('')

  const today = getDateInputValue(0)
  const tomorrow = getDateInputValue(1)

  const changePassengers = count => {
    const next = Math.min(6, Math.max(1, count))
    setPassengers(next)
    onPassengersChange?.(next)
  }

  const submit = () => {
    const cleanFrom = from.trim()
    const cleanTo = to.trim()

    if (cleanFrom && cleanTo && cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      setError('From and To cannot be the same city.')
      debugLog('SEARCH', 'blocked: same city', cleanFrom)
      return
    }

    if (!date) {
      setError('Pick a travel date.')
      debugLog('SEARCH', 'blocked: no date')
      return
    }

    if (date < today) {
      setError('The travel date cannot be in the past.')
      debugLog('SEARCH', 'blocked: past date', date)
      return
    }

    setError('')
    debugLog('SEARCH', 'submit', { from: cleanFrom, to: cleanTo, date, passengers })
    onSearch({ from: cleanFrom, to: cleanTo, date, passengers })
  }

  return (
    <div className="search-box sb">
      <div className="search-toggle">
        <button className="trip-toggle active" type="button">
          One Way
        </button>
      </div>

      <div className="sb-grid">
        <CityInput
          label="From"
          value={from}
          onChange={value => {
            setFrom(value)
            setError('')
          }}
          otherValue={to}
          placeholder="Leaving from"
          onEnter={submit}
        />

        <button
          className="sb-swap"
          type="button"
          aria-label="Swap From and To"
          title="Swap cities"
          onClick={() => {
            debugLog('SEARCH', 'swap', { from, to })
            setFrom(to)
            setTo(from)
            setError('')
          }}
        >
          <Icon name="swap" size={16} />
        </button>

        <CityInput
          label="To"
          value={to}
          onChange={value => {
            setTo(value)
            setError('')
          }}
          otherValue={from}
          placeholder="Going to"
          onEnter={submit}
        />

        <div className="sb-rest">
        <div className="sb-field">
          <label className="sb-label" htmlFor="sb-date">Date</label>
          <div className="sb-control">
            <Icon name="calendar" size={16} />
            <input
              id="sb-date"
              type="date"
              value={date}
              min={today}
              onChange={event => {
                setDate(event.target.value)
                setError('')
              }}
            />
          </div>
        </div>

        <div className="sb-field">
          <span className="sb-label">Passengers</span>
          <div className="sb-control sb-stepper">
            <Icon name="user" size={16} />
            <div className="sb-stepper-controls">
              <button
                type="button"
                aria-label="Fewer passengers"
                disabled={passengers <= 1}
                onClick={() => changePassengers(passengers - 1)}
              >
                −
              </button>
              <strong aria-live="polite">{passengers}</strong>
              <button
                type="button"
                aria-label="More passengers"
                disabled={passengers >= 6}
                onClick={() => changePassengers(passengers + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          className="blue-button sb-submit"
          type="button"
          onClick={submit}
        >
          <Icon name="search" size={16} />
          Search Buses
        </button>
        </div>
      </div>

      <div className="sb-quick">
        <button
          type="button"
          className={`sb-chip${date === today ? ' active' : ''}`}
          onClick={() => setDate(today)}
        >
          Today
        </button>
        <button
          type="button"
          className={`sb-chip${date === tomorrow ? ' active' : ''}`}
          onClick={() => setDate(tomorrow)}
        >
          Tomorrow
        </button>

        {(from || to) && (
          <button
            type="button"
            className="sb-clear-all"
            onClick={() => {
              debugLog('SEARCH', 'cleared both cities')
              setFrom('')
              setTo('')
              setError('')
            }}
          >
            <Icon name="close" size={13} strokeWidth={2.4} />
            Clear cities
          </button>
        )}
      </div>

      {error && <p className="sb-error" role="alert">{error}</p>}
    </div>
  )
}

function BusCard({ trip, onSelect }) {
  return (
    <article className="bus-card">
      <div className="bus-operator">
        <span className="operator-logo">
          <Icon name="bus" size={22} />
        </span>
        <div>
          <strong>{trip.operatorName}</strong>
          <small>{trip.busType}</small>
        </div>
      </div>

      <div className="bus-time">
        <div>
          <strong>{formatTime(trip.departureTime)}</strong>
          <small>{trip.fromCity}</small>
        </div>

        <div className="duration-line">
          <span>{duration(trip.durationMinutes)}</span>
          <i />
          <small>Direct</small>
        </div>

        <div className="align-right">
          <strong>{formatTime(trip.arrivalTime)}</strong>
          <small>{trip.toCity}</small>
        </div>
      </div>

      <div className="bus-features">
        <span><Icon name="star" size={13} /> {trip.rating}</span>
        <span><Icon name="shield" size={13} /> AC</span>
        <span><Icon name="phone" size={13} /> Charging</span>
      </div>

      <div className="bus-price">
        <span>
          <small>per seat</small>
          <strong>{money(trip.price)}</strong>
        </span>

        <button
          className="blue-button"
          type="button"
          onClick={() => onSelect(trip)}
        >
          Select Seats
        </button>
      </div>
    </article>
  )
}

function HomeView({ popularTrips, search, onSearch, onSelectTrip, setView, onPassengersChange }) {
  return (
    <div className="view home-view">
      <section className="hero-banner">
        <div className="hero-banner-copy">
          <span className="eyebrow light">JOURNEY STARTS HERE</span>
          <h1>
            Travel to new <span>destinations.</span>
          </h1>
          <p>Discover comfortable bus journeys at prices you'll love.</p>
        </div>

        <div className="hero-graphic">
          <div className="hero-sun" />
          <div className="hero-mountain m1" />
          <div className="hero-mountain m2" />
          <div className="hero-road" />
          <Icon name="bus" size={130} strokeWidth={1.1} />
        </div>
      </section>

      <SearchBox
        initial={search}
        onSearch={onSearch}
        onPassengersChange={onPassengersChange}
      />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">POPULAR ROUTES</span>
            <h2>Plan your next escape</h2>
          </div>

          <button
            type="button"
            className="link-button"
            onClick={() => setView('search')}
          >
            View all <Icon name="arrow" size={15} />
          </button>
        </div>

        <div className="route-grid">
          {popularTrips.slice(0, 4).map(trip => (
            <button
              className="route-card"
              type="button"
              key={trip.id}
              onClick={() => onSelectTrip(trip)}
            >
              <div className="route-image route-image-1">
                <span>{trip.fromCity.slice(0, 1)}{trip.toCity.slice(0, 1)}</span>
              </div>

              <div className="route-card-copy">
                <strong>{trip.fromCity} → {trip.toCity}</strong>
                <span>From {money(trip.price)}</span>
                <small>{duration(trip.durationMinutes)}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="benefit-grid">
        <div className="benefit-card">
          <span className="benefit-icon"><Icon name="shield" /></span>
          <div>
            <strong>Safe & secure</strong>
            <p>Trusted operators, verified buses and protected payments.</p>
          </div>
        </div>

        <div className="benefit-card">
          <span className="benefit-icon"><Icon name="clock" /></span>
          <div>
            <strong>Live availability</strong>
            <p>See the latest seat status while you plan your trip.</p>
          </div>
        </div>

        <div className="benefit-card">
          <span className="benefit-icon"><Icon name="ticket" /></span>
          <div>
            <strong>Instant tickets</strong>
            <p>Get your digital ticket right after payment.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function SearchView({ search, onSearch, trips, onSelectTrip, loading, hasSearched, onPassengersChange }) {
  return (
    <div className="view">
      <div className="page-header">
        <div>
          <span className="eyebrow">SEARCH BUSES</span>
          <h1>Find your next bus</h1>
          <p>Compare departures, prices and amenities in one place.</p>
        </div>

        <span className="result-count">
          {loading ? 'Searching…' : `${trips.length} buses`}
        </span>
      </div>

      <SearchBox
        initial={search}
        onSearch={onSearch}
        onPassengersChange={onPassengersChange}
      />

      {loading ? (
        <div className="loading-card">
          <Icon name="bus" size={28} />
          Loading the best routes…
        </div>
      ) : hasSearched && trips.length === 0 ? (
        <div className="empty-card">
          <span><Icon name="search" size={26} /></span>
          <h3>No buses found</h3>
          <p>
            Try another route or date. The catalogue covers several cities and the next 7 days.
          </p>
        </div>
      ) : (
        <div className="bus-list">
          {trips.map(trip => (
            <BusCard key={trip.id} trip={trip} onSelect={onSelectTrip} />
          ))}
        </div>
      )}
    </div>
  )
}

function SeatMapView({
  trip,
  seats,
  selectedSeats,
  setSelectedSeats,
  onHold,
  busy,
  maxSelectableSeats = 1,
  onPassengersChange,
}) {
  const available = seats.filter(s => s.status === 'AVAILABLE').length

  const total = selectedSeats.reduce(
    (sum, seat) => sum + Number(trip.price || 0),
    0
  )

  const toggleSeat = seat => {
    if (seat.status !== 'AVAILABLE') return

    setSelectedSeats(current => {
      if (current.some(item => item.id === seat.id)) {
        return current.filter(item => item.id !== seat.id)
      }

      if (current.length >= maxSelectableSeats) {
        return current
      }

      return [...current, seat]
    })
  }

  return (
    <div className="view">
      <div className="page-header compact">
        <div>
          <span className="eyebrow">SELECT SEATS</span>
          <h1>{trip.operatorName}</h1>
          <p>
            {trip.busType} · {formatDate(trip.departureTime)} · {formatTime(trip.departureTime)}
          </p>
        </div>

        <div className="journey-chip">
          <strong>{trip.fromCity}</strong>
          <Icon name="arrow" size={14} />
          <strong>{trip.toCity}</strong>
        </div>
      </div>

      <div className="seat-layout">
        <section className="panel-card seat-panel-large">
          <div className="panel-title-row">
            <div>
              <h3>Choose your seats</h3>
              <p>
                {available} available · select up to {maxSelectableSeats} passenger seat
                {maxSelectableSeats > 1 ? 's' : ''}
              </p>

              <label className="passenger-picker">
                <span>Passengers</span>
                <select
                  value={maxSelectableSeats}
                  onChange={e => onPassengersChange?.(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="seat-legend">
              <span><i className="legend-dot available" /> Available</span>
              <span><i className="legend-dot selected" /> Selected</span>
              <span><i className="legend-dot booked" /> Booked</span>
            </div>
          </div>

          <div className="bus-stage">FRONT / DRIVER</div>

          <div className="seat-bus-shell">
            <div className="driver-cabin">
              <Icon name="bus" size={26} />
              <span>Driver</span>
            </div>

            <div className="seat-grid-bus">
              {seats.map(seat => {
                const isSelected = selectedSeats.some(item => item.id === seat.id)

                return (
                  <button
                    key={seat.id}
                    type="button"
                    className={`seat-chip ${seat.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                    disabled={
                      seat.status !== 'AVAILABLE' ||
                      (!isSelected && selectedSeats.length >= maxSelectableSeats)
                    }
                    onClick={() => toggleSeat(seat)}
                  >
                    <strong>{seat.seatNumber}</strong>
                    <small>
                      {seat.status === 'AVAILABLE'
                        ? money(trip.price)
                        : seat.status}
                    </small>
                  </button>
                )
              })}
            </div>

            <div className="bus-exit">EXIT</div>
          </div>
        </section>

        <aside className="panel-card booking-summary">
          <div className="panel-title-row">
            <div>
              <h3>Booking summary</h3>
              <p>
                {selectedSeats.length
                  ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''} selected`
                  : 'Select one or more seats.'}
              </p>
            </div>

            {selectedSeats.length > 0 && (
              <button
                className="text-button"
                type="button"
                onClick={() => setSelectedSeats([])}
              >
                Clear
              </button>
            )}
          </div>

          <div className="summary-bus">
            <span className="operator-logo">
              <Icon name="bus" size={25} />
            </span>
            <div>
              <strong>{trip.operatorName}</strong>
              <small>{trip.busName} · {trip.busType}</small>
            </div>
          </div>

          <div className="summary-route">
            <div>
              <span>Departure</span>
              <strong>{formatTime(trip.departureTime)}</strong>
              <small>{trip.fromCity}</small>
            </div>

            <Icon name="arrow" size={17} />

            <div className="align-right">
              <span>Arrival</span>
              <strong>{formatTime(trip.arrivalTime)}</strong>
              <small>{trip.toCity}</small>
            </div>
          </div>

          <div className="summary-row">
            <span>Selected seats</span>
            <strong>
              {selectedSeats.length
                ? selectedSeats.map(seat => seat.seatNumber).join(', ')
                : '—'}
            </strong>
          </div>

          <div className="summary-row">
            <span>Tickets</span>
            <strong>{selectedSeats.length}</strong>
          </div>

          <div className="summary-row">
            <span>Price / ticket</span>
            <strong>{money(trip.price)}</strong>
          </div>

          <div className="summary-total">
            <span>Total fare</span>
            <strong>{money(total)}</strong>
          </div>

          <button
            className="blue-button wide"
            disabled={selectedSeats.length === 0 || busy}
            type="button"
            onClick={onHold}
          >
            {busy
              ? 'Locking seats…'
              : selectedSeats.length
                ? `Lock ${selectedSeats.length} seat${selectedSeats.length === 1 ? '' : 's'} & pay`
                : 'Select seats to continue'}
          </button>

          <p className="seat-selection-note">
            Seats are locked for 5 minutes the moment you continue. Finish payment
            before the countdown ends or they are released for other travellers.
          </p>
        </aside>
      </div>
    </div>
  )
}

function PaymentView({ reservations, onPay, onBack, busy, walletBalance, canReleaseOnBack }) {
  const [method, setMethod] = useState('WALLET')
  const [walletNote, setWalletNote] = useState('')
  const [expired, setExpired] = useState(false)

  const fare = reservations.reduce(
    (sum, item) => sum + Number(item.fare || 0),
    0
  )

  const fee = reservations.reduce(
    (sum, item) => sum + Math.round(Number(item.fare || 0) * 0.035),
    0
  )

  const total = fare + fee

  // All seats of one booking share the same lock; use the one that ends first to be safe.
  const holdReservation = reservations.length
    ? reservations.reduce(
        (earliest, item) =>
          !earliest || holdRemainingMs(item) < holdRemainingMs(earliest)
            ? item
            : earliest,
        null
      )
    : null

  const reservationKey = reservations
    .map(item => item.reservationId)
    .join(',')

  const handleExpired = useCallback(() => setExpired(true), [])

  useEffect(() => {
    setWalletNote('')
    setExpired(false)
  }, [reservationKey])

  const walletShort =
    method === 'WALLET' && Number(walletBalance) < total

  const cannotPay = busy || expired || walletShort

  useEffect(() => {
    debugLog('PAYMENT', 'button state', {
      cannotPay,
      busy,
      expired,
      walletShort,
      method,
      total,
      walletBalance,
      seats: reservationKey,
    })
  }, [cannotPay, busy, expired, walletShort, method, total, walletBalance, reservationKey])

  if (!reservations.length) return null
  const seatNames = reservations.map(item => item.seatNumber).join(', ')

  return (
    <div className="view">
      <div className="page-header compact">
        <div>
          <span className="eyebrow">PAYMENT</span>
          <h1>Complete your booking</h1>
          <p>
            {reservations.length} ticket{reservations.length > 1 ? 's' : ''} ·
            your seats are locked for 5 minutes.
          </p>
        </div>

        <div className="payment-timer">
          <span>Payment ends in</span>
          <Countdown reservation={holdReservation} onExpired={handleExpired} />
        </div>
      </div>

      <div className="payment-layout">
        <section className="panel-card payment-card">
          <div className="payment-section">
            <span className="eyebrow">BOOKING DETAILS</span>

            <div className="payment-bus-line">
              <span className="operator-logo">
                <Icon name="bus" size={24} />
              </span>

              <div>
                <strong>{reservations[0].operatorName}</strong>
                <small>{reservations[0].busType}</small>
              </div>

              <StatusPill status="PENDING" />
            </div>

            <div className="detail-grid">
              <div>
                <span>Route</span>
                <strong>
                  {reservations[0].fromCity} → {reservations[0].toCity}
                </strong>
              </div>

              <div>
                <span>Travel</span>
                <strong>
                  {formatDate(reservations[0].departureTime)} ·
                  {formatTime(reservations[0].departureTime)}
                </strong>
              </div>

              <div>
                <span>Seats</span>
                <strong>{seatNames}</strong>
              </div>

              <div>
                <span>Tickets</span>
                <strong>{reservations.length}</strong>
              </div>
            </div>
          </div>

          <div className="payment-section border-top">
            <span className="eyebrow">SELECT PAYMENT METHOD</span>

            <div className="method-grid">
              {[
                ['UPI', 'pay'],
                ['CARD', 'card'],
                ['NET_BANKING', 'bank'],
                ['WALLET', 'wallet'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={method === key ? 'method-card active' : 'method-card'}
                  onClick={() => {
                    setMethod(key)
                    setWalletNote('')
                  }}
                >
                  <span className="method-icon">
                    <Icon
                      name={
                        label === 'pay'
                          ? 'wallet'
                          : label === 'card'
                            ? 'ticket'
                            : label === 'bank'
                              ? 'map'
                              : 'wallet'
                      }
                      size={20}
                    />
                  </span>

                  <strong>
                    {key === 'NET_BANKING'
                      ? 'Net Banking'
                      : key[0] + key.slice(1).toLowerCase()}
                  </strong>

                  <small>
                    {key === 'UPI'
                      ? 'GPay · PhonePe · Paytm'
                      : key === 'CARD'
                        ? 'Visa · Mastercard'
                        : key === 'NET_BANKING'
                          ? 'All major banks'
                          : `Balance ${money(walletBalance)}`}
                  </small>
                </button>
              ))}
            </div>

            {method === 'UPI' && (
              <div className="payment-input">
                <label>
                  UPI ID
                  <input placeholder="yourname@upi" />
                </label>
              </div>
            )}

            {method === 'CARD' && (
              <div className="payment-input card-input-grid">
                <label>
                  Card number
                  <input placeholder="1234 5678 9012 3456" />
                </label>
                <label>
                  Expiry
                  <input placeholder="MM/YY" />
                </label>
                <label>
                  CVV
                  <input placeholder="•••" />
                </label>
              </div>
            )}

            {method === 'WALLET' && (
              <div className="wallet-note">
                <Icon name="wallet" size={17} />
                <span>
                  Wallet payments deduct the full booking amount from your
                  SeatReserve balance after the server rechecks the balance.
                </span>
              </div>
            )}

            {walletShort && (
              <div className="alert error">
                Wallet balance {money(walletBalance)} is lower than the
                {` ${money(total)}`} total. Add money to continue.
              </div>
            )}

            {walletNote && <div className="alert error">{walletNote}</div>}

            {expired && (
              <div className="alert error">
                Your 5-minute seat lock ended and the seats were released. Go back
                and select the seats again.
              </div>
            )}
          </div>
        </section>

        <aside className="panel-card fare-card">
          <h3>Fare summary</h3>

          <div className="fare-row">
            <span>{reservations.length} × ticket fare</span>
            <strong>{money(fare)}</strong>
          </div>

          <div className="fare-row">
            <span>Convenience fee</span>
            <strong>{money(fee)}</strong>
          </div>

          <div className="fare-row total">
            <span>Total amount</span>
            <strong>{money(total)}</strong>
          </div>

          <button
            className="blue-button wide"
            disabled={cannotPay}
            type="button"
            onClick={() => onPay(method, setWalletNote, total)}
          >
            {expired
              ? 'Payment expired'
              : walletShort
                ? 'Insufficient wallet balance'
                : busy
                  ? 'Processing…'
                  : `Pay ${money(total)}`}
          </button>

          <p className="secure-copy">
            <Icon name="shield" size={14} />
            {method === 'WALLET'
              ? 'Wallet deduction is processed atomically.'
              : 'Demo payment flow for this local build.'}
          </p>

          <button
            className="text-button centered"
            type="button"
            onClick={onBack}
          >
            {canReleaseOnBack ? 'Release seats & go back' : 'Back to my bookings'}
          </button>
        </aside>
      </div>
    </div>
  )
}

// Same maths as PaymentService.totalFare on the server: fare + 3.5% convenience fee (rounded).
function refundAmountFor(reservation) {
  const fare = Number(reservation?.fare || 0)
  return fare + Math.round(fare * 0.035)
}

function BookingsView({
  reservations,
  onPay,
  onTicket,
  onCancel,
  onReleaseHold,
  busy,
  cancellingId,
  notice,
  onDismissNotice,
}) {
  const [tab, setTab] = useState('UPCOMING')
  const [confirming, setConfirming] = useState(null)
  const now = Date.now()

  const hasDeparted = r =>
    typeof r.departed === 'boolean'
      ? r.departed
      : r.departureTime
        ? new Date(r.departureTime).getTime() <= now
        : false

  // An unpaid hold whose 5 minutes are over is effectively expired even if the server
  // scheduler has not swept it yet (it runs every 30 s).
  const holdLapsed = r => r.status === 'PENDING' && holdRemainingMs(r) === 0

  const filtered = reservations.filter(r => {
    if (tab === 'UPCOMING') {
      return (
        (r.status === 'CONFIRMED' && !hasDeparted(r)) ||
        (r.status === 'PENDING' && !holdLapsed(r) && !hasDeparted(r))
      )
    }

    if (tab === 'PAST') {
      return r.status === 'CONFIRMED' && hasDeparted(r)
    }

    return (
      ['CANCELLED', 'EXPIRED'].includes(r.status) ||
      holdLapsed(r) ||
      (r.status === 'PENDING' && hasDeparted(r))
    )
  })

  // Success messages fade away on their own; errors stay until dismissed.
  useEffect(() => {
    if (!notice || notice.type !== 'success') return undefined
    const id = setTimeout(() => onDismissNotice?.(), 12000)
    return () => clearTimeout(id)
  }, [notice, onDismissNotice])

  // Escape closes the confirmation dialog (unless a request is running).
  useEffect(() => {
    if (!confirming) return undefined

    const onKey = event => {
      if (event.key === 'Escape' && !busy) setConfirming(null)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming, busy])

  const openDialog = reservation => {
    debugLog('BOOKINGS-UI', 'open cancel dialog', {
      id: reservation.reservationId,
      status: reservation.status,
      canCancel: reservation.canCancel,
      departed: reservation.departed,
      fare: reservation.fare,
    })
    setConfirming(reservation)
  }

  const submitDialog = async () => {
    const target = confirming
    if (!target) return

    debugLog('BOOKINGS-UI', 'user confirmed', target.reservationId, target.status)

    if (target.status === 'PENDING') {
      await onReleaseHold(target)
    } else {
      await onCancel(target)
    }

    setConfirming(null)
  }

  const dialogIsPaid = confirming?.status === 'CONFIRMED'

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <span className="eyebrow">MY BOOKINGS</span>
          <h1>Your journeys</h1>
          <p>Keep every trip, ticket and cancellation in one place.</p>
        </div>
      </div>

      {notice && (
        <div className={`booking-notice ${notice.type}`} role="status">
          <Icon name={notice.type === 'success' ? 'check' : 'help'} size={18} />

          <div className="booking-notice-copy">
            <strong>{notice.title}</strong>
            <span>{notice.text}</span>
          </div>

          {notice.type === 'success' && notice.showCancelledTab && (
            <button
              type="button"
              className="booking-notice-link"
              onClick={() => setTab('CANCELLED')}
            >
              View cancelled
            </button>
          )}

          <button
            type="button"
            className="booking-notice-close"
            aria-label="Dismiss message"
            onClick={onDismissNotice}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      <div className="booking-tabs">
        <button
          className={tab === 'UPCOMING' ? 'active' : ''}
          type="button"
          onClick={() => setTab('UPCOMING')}
        >
          Upcoming
        </button>
        <button
          className={tab === 'PAST' ? 'active' : ''}
          type="button"
          onClick={() => setTab('PAST')}
        >
          Past
        </button>
        <button
          className={tab === 'CANCELLED' ? 'active' : ''}
          type="button"
          onClick={() => setTab('CANCELLED')}
        >
          Cancelled
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-card">
          <span><Icon name="ticket" size={25} /></span>
          <h3>No bookings here</h3>
          <p>Your completed and upcoming journeys will appear here.</p>
        </div>
      ) : (
        <div className="booking-list">
          {filtered.map(reservation => {
            const isCancelling = cancellingId === reservation.reservationId
            const canCancel =
              reservation.status === 'CONFIRMED' &&
              (typeof reservation.canCancel === 'boolean'
                ? reservation.canCancel
                : !hasDeparted(reservation))

            return (
              <article
                className="booking-card"
                key={reservation.reservationId}
              >
                <div className="booking-image">
                  <Icon name="bus" size={32} />
                </div>

                <div className="booking-main">
                  <div className="booking-top">
                    <div>
                      <strong>
                        {reservation.fromCity || 'SeatReserve'} →
                        {` ${reservation.toCity || 'Journey'}`}
                      </strong>
                      <span>
                        {reservation.operatorName || 'SeatReserve'} ·
                        {` ${reservation.busType || 'Bus'}`}
                      </span>
                    </div>

                    <StatusPill
                      status={
                        reservation.status === 'CONFIRMED' && hasDeparted(reservation)
                          ? 'COMPLETED'
                          : holdLapsed(reservation)
                            ? 'EXPIRED'
                            : reservation.status
                      }
                    />
                  </div>

                  <div className="booking-meta">
                    <span>
                      <Icon name="calendar" size={14} />
                      {formatDate(reservation.departureTime)}
                    </span>

                    <span>
                      <Icon name="clock" size={14} />
                      {formatTime(reservation.departureTime)}
                    </span>

                    <span>
                      <Icon name="ticket" size={14} />
                      Seat {reservation.seatNumber}
                    </span>

                    <span>{money(reservation.fare)}</span>
                  </div>

                  <div className="booking-actions">
                    {reservation.status === 'PENDING' && (
                      <>
                        <button
                          className="blue-button"
                          type="button"
                          disabled={busy}
                          onClick={() => onPay(reservation)}
                        >
                          Pay now
                        </button>

                        <button
                          className="danger-button"
                          disabled={busy}
                          type="button"
                          onClick={() => openDialog(reservation)}
                        >
                          {isCancelling ? 'Releasing…' : 'Cancel hold'}
                        </button>
                      </>
                    )}

                    {reservation.status === 'CONFIRMED' && (
                      <button
                        className="outline-button"
                        type="button"
                        disabled={busy}
                        onClick={() => onTicket(reservation)}
                      >
                        View ticket
                      </button>
                    )}

                    {canCancel && (
                      <button
                        className="danger-button"
                        disabled={busy}
                        type="button"
                        onClick={() => openDialog(reservation)}
                      >
                        {isCancelling ? 'Cancelling…' : 'Cancel & refund'}
                      </button>
                    )}

                    {reservation.status === 'CONFIRMED' && hasDeparted(reservation) && (
                      <span className="trip-completed-note">
                        Trip completed · cancellation closed
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {confirming && (
        <div
          className="cx-backdrop"
          role="presentation"
          onClick={() => {
            if (!busy) setConfirming(null)
          }}
        >
          <div
            className="cx-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cx-title"
            onClick={event => event.stopPropagation()}
          >
            <h3 id="cx-title">
              {dialogIsPaid ? 'Cancel this booking?' : 'Release this seat?'}
            </h3>

            <dl className="cx-details">
              <div>
                <dt>Route</dt>
                <dd>{confirming.fromCity} → {confirming.toCity}</dd>
              </div>
              <div>
                <dt>Departure</dt>
                <dd>
                  {formatDate(confirming.departureTime)} · {formatTime(confirming.departureTime)}
                </dd>
              </div>
              <div>
                <dt>Seat</dt>
                <dd>{confirming.seatNumber}</dd>
              </div>
              {confirming.bookingReference && (
                <div>
                  <dt>Booking</dt>
                  <dd>{confirming.bookingReference}</dd>
                </div>
              )}
            </dl>

            <p className={`cx-refund${dialogIsPaid ? '' : ' neutral'}`}>
              {dialogIsPaid
                ? `${money(refundAmountFor(confirming))} will be refunded to your SeatReserve wallet.`
                : 'You have not paid yet, so nothing will be charged. The seat goes back on sale.'}
            </p>

            <div className="cx-actions">
              <button
                type="button"
                className="outline-button"
                disabled={busy}
                onClick={() => setConfirming(null)}
              >
                Keep it
              </button>

              <button
                type="button"
                className="cx-danger"
                disabled={busy}
                onClick={submitDialog}
              >
                {busy
                  ? 'Working…'
                  : dialogIsPaid
                    ? 'Yes, cancel & refund'
                    : 'Yes, release seat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WalletView({ balance, transactions, onTopUp }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const demoTopUpEnabled =
    import.meta.env.VITE_WALLET_TOPUP_ENABLED === 'true'

  const topUp = async amount => {
    setBusy(true)
    setError('')

    try {
      await onTopUp(amount)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <span className="eyebrow">WALLET</span>
          <h1>Travel wallet</h1>
          <p>
            Use wallet funds at checkout or receive eligible cancellation refunds here.
          </p>
        </div>
      </div>

      <div className="wallet-grid">
        <section className="wallet-hero">
          <div>
            <span>Available balance</span>
            <strong>{money(balance)}</strong>
            <p>
              Wallet deductions and refunds are recorded as server-side ledger
              transactions.
            </p>
          </div>

          <div className="wallet-orbit">
            <Icon name="wallet" size={48} />
          </div>
        </section>

        <section className="panel-card topup-card">
          <span className="eyebrow">WALLET FUNDING</span>

          <h3>
            {demoTopUpEnabled
              ? 'Development top-up'
              : 'Top-up unavailable'}
          </h3>

          {demoTopUpEnabled ? (
            <>
              <div className="topup-buttons">
                {[500, 1000, 2000, 5000].map(amount => (
                  <button
                    key={amount}
                    type="button"
                    disabled={busy}
                    onClick={() => topUp(amount)}
                  >
                    {money(amount)}
                  </button>
                ))}
              </div>

              <small>
                Development-only wallet credit. It is disabled on the public
                deployment because no real payment gateway is connected.
              </small>
            </>
          ) : (
            <small>
              Wallet top-up is disabled on the deployed build. Real funding
              should be enabled only after connecting a verified payment provider.
            </small>
          )}

          {error && <div className="alert error">{error}</div>}
        </section>

        <section className="panel-card wallet-transactions">
          <div className="panel-title-row">
            <div>
              <h3>Recent activity</h3>
              <p>Your latest wallet movements.</p>
            </div>
          </div>

          <div className="transaction-list">
            {transactions.length === 0 ? (
              <div className="empty-state compact">
                <Icon name="wallet" size={24} />
                <span>No wallet activity yet.</span>
              </div>
            ) : (
              transactions.map(item => (
                <div className="transaction-row" key={item.id}>
                  <span
                    className={`transaction-icon ${String(item.type).toLowerCase()}`}
                  >
                    {item.type === 'CREDIT' ? '+' : '−'}
                  </span>

                  <div>
                    <strong>{item.description}</strong>
                    <small>
                      {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                    </small>
                  </div>

                  <b
                    className={
                      item.type === 'CREDIT'
                        ? 'positive'
                        : 'negative'
                    }
                  >
                    {item.type === 'CREDIT' ? '+' : '−'}
                    {money(Math.abs(Number(item.amount)))}
                  </b>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ProfileView({ profile, onSave }) {
  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  })

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setForm({
      fullName: profile?.fullName || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
    })
  }, [profile])

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      await onSave(form)
      setMessage('Profile updated successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <span className="eyebrow">PROFILE</span>
          <h1>Your profile</h1>
          <p>Keep your passenger details ready for every trip.</p>
        </div>
      </div>

      <div className="profile-layout">
        <section className="panel-card profile-card">
          <div className="profile-banner">
            <div className="profile-big-avatar">
              {(form.fullName || profile?.username || 'V')
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div>
              <h2>{form.fullName || profile?.username}</h2>
              <p>{profile?.email || 'Add your email'}</p>
            </div>

            <span className="member-pill">
              Member since{' '}
              {profile?.createdAt
                ? formatDate(profile.createdAt, {
                    month: 'short',
                    year: 'numeric',
                  })
                : 'today'}
            </span>
          </div>

          <form className="profile-form" onSubmit={submit}>
            <label>
              Full Name
              <input
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </label>

            <label>
              Username
              <input value={profile?.username || ''} disabled />
            </label>

            <div className="profile-save-row">
              <button
                className="blue-button"
                disabled={busy}
                type="submit"
              >
                {busy ? 'Saving…' : 'Save changes'}
              </button>

              {message && (
                <span
                  className={
                    message.includes('successfully')
                      ? 'save-message success'
                      : 'save-message'
                  }
                >
                  {message}
                </span>
              )}
            </div>
          </form>
        </section>

        <aside className="profile-side">
          <div className="panel-card profile-stat">
            <span><Icon name="ticket" size={19} /></span>
            <div>
              <strong>
                {profile?.walletBalance !== undefined
                  ? money(profile.walletBalance)
                  : money(0)}
              </strong>
              <small>Wallet balance</small>
            </div>
          </div>

          <div className="panel-card profile-stat">
            <span><Icon name="shield" size={19} /></span>
            <div>
              <strong>Protected</strong>
              <small>Account security</small>
            </div>
          </div>

          <div className="panel-card profile-stat">
            <span><Icon name="phone" size={19} /></span>
            <div>
              <strong>Ready to travel</strong>
              <small>Passenger details</small>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function SupportView({ tickets, onCreate }) {
  const [category, setCategory] = useState('Booking')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()

    if (!message.trim()) return

    setBusy(true)
    setError('')

    try {
      await onCreate({
        category,
        message,
      })
      setMessage('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const faq = [
    [
      'How long does a seat hold last?',
      'Your seat is held for 5 minutes. Pay before the timer expires.',
    ],
    [
      'Can I cancel a booking?',
      'Confirmed bookings can be cancelled from My Bookings. The amount is refunded to your SeatReserve wallet in this demo.',
    ],
    [
      'What payment methods are supported?',
      'The checkout supports UPI, cards, net banking and the SeatReserve wallet flow. Non-wallet methods are simulated until a real payment provider is connected.',
    ],
  ]

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <span className="eyebrow">SUPPORT</span>
          <h1>We are here to help</h1>
          <p>Find answers or send us a support request.</p>
        </div>
      </div>

      <div className="support-grid">
        <section className="panel-card faq-card">
          <span className="eyebrow">HELP CENTER</span>
          <h3>Frequently asked questions</h3>

          <div className="faq-list">
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Icon name="chevron" size={15} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="panel-card contact-card">
          <span className="eyebrow">CONTACT US</span>
          <h3>Open a support request</h3>

          <form className="form-stack" onSubmit={submit}>
            <label>
              Category
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option>Booking</option>
                <option>Payment</option>
                <option>Cancellation</option>
                <option>Profile</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Message
              <textarea
                rows="5"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what happened…"
              />
            </label>

            <button
              className="blue-button"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Sending…' : 'Send request'}
            </button>

            {error && <div className="alert error">{error}</div>}
          </form>
        </section>

        <section className="panel-card ticket-history">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">YOUR REQUESTS</span>
              <h3>Support history</h3>
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="empty-state compact">
              <Icon name="support" size={24} />
              <span>No requests yet.</span>
            </div>
          ) : (
            <div className="ticket-list">
              {tickets.map(t => (
                <div className="support-ticket" key={t.id}>
                  <div>
                    <strong>#{t.id} · {t.category}</strong>
                    <p>{t.message}</p>
                    <small>
                      {formatDate(t.createdAt)} · {formatTime(t.createdAt)}
                    </small>
                  </div>

                  <StatusPill
                    status={t.status === 'OPEN' ? 'PENDING' : t.status}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function TicketPattern({ value }) {
  const bits = Array.from({ length: 225 }, (_, index) => {
    let seed = 17

    for (const char of value) {
      seed = (seed * 31 + char.charCodeAt(0) + index) % 9973
    }

    return (seed + index * 13) % 7 < 3
  })

  const finder = (x, y) =>
    Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: 7 }, (_, col) => {
        const outer =
          row === 0 ||
          row === 6 ||
          col === 0 ||
          col === 6

        const inner =
          row >= 2 &&
          row <= 4 &&
          col >= 2 &&
          col <= 4

        return outer || inner
          ? { x: x + col, y: y + row }
          : null
      })
    )
      .flat()
      .filter(Boolean)

  return (
    <svg
      className="ticket-qr"
      width="150"
      height="150"
      viewBox="0 0 150 150"
      aria-label="Ticket code"
    >
      {Array.from({ length: 15 }, (_, row) =>
        Array.from({ length: 15 }, (_, col) =>
          bits[row * 15 + col] ? (
            <rect
              key={`${row}-${col}`}
              x={col * 10}
              y={row * 10}
              width="10"
              height="10"
              fill="#101827"
            />
          ) : null
        )
      ).flat()}

      {finder(0, 0).map(cell => (
        <rect
          key={`a-${cell.x}-${cell.y}`}
          x={cell.x * 10}
          y={cell.y * 10}
          width="10"
          height="10"
          fill="#101827"
        />
      ))}

      {finder(8, 0).map(cell => (
        <rect
          key={`b-${cell.x}-${cell.y}`}
          x={cell.x * 10}
          y={cell.y * 10}
          width="10"
          height="10"
          fill="#101827"
        />
      ))}

      {finder(0, 8).map(cell => (
        <rect
          key={`c-${cell.x}-${cell.y}`}
          x={cell.x * 10}
          y={cell.y * 10}
          width="10"
          height="10"
          fill="#101827"
        />
      ))}
    </svg>
  )
}

function TicketModal({ ticket, onClose }) {
  if (!ticket) return null

  const code =
    `${ticket.pnr}|${ticket.seatNumber}|${ticket.fromCity}|${ticket.toCity}`

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="ticket-modal">
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </button>

        <div className="ticket-brand">
          <Brand compact />
          <span className="ticket-label">E-TICKET</span>
        </div>

        <div className="ticket-route">
          <div>
            <small>FROM</small>
            <strong>{ticket.fromCity}</strong>
            <span>{formatTime(ticket.departureTime)}</span>
          </div>

          <Icon name="arrow" size={22} />

          <div className="align-right">
            <small>TO</small>
            <strong>{ticket.toCity}</strong>
            <span>{formatTime(ticket.arrivalTime)}</span>
          </div>
        </div>

        <div className="ticket-code-box">
          <TicketPattern value={code} />
        </div>

        <div className="ticket-details">
          <div>
            <span>Passenger</span>
            <strong>{ticket.passengerName}</strong>
          </div>

          <div>
            <span>Bus</span>
            <strong>{ticket.operatorName}</strong>
          </div>

          <div>
            <span>Seat</span>
            <strong>{ticket.seatNumber}</strong>
          </div>

          <div>
            <span>Total fare</span>
            <strong>{money(ticket.totalFare)}</strong>
          </div>

          <div>
            <span>PNR</span>
            <strong>{ticket.pnr}</strong>
          </div>

          <div>
            <span>Payment</span>
            <strong>{ticket.paymentMethod}</strong>
          </div>
        </div>

        <button
          type="button"
          className="blue-button wide"
          onClick={() => window.print()}
        >
          <Icon name="download" size={16} />
          Print / save ticket
        </button>
      </div>
    </div>
  )
}

function NotificationPanel({ notifications, onClose }) {
  return (
    <div className="notification-panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">NOTIFICATIONS</span>
          <h3>Latest updates</h3>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={onClose}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state compact">
          <Icon name="bell" size={23} />
          <span>No new updates.</span>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(item => (
            <div className="notification-item" key={item.id}>
              <span
                className={`notification-type ${item.type}`}
              >
                <Icon
                  name={
                    item.type === 'success'
                      ? 'check'
                      : item.type === 'warning'
                        ? 'clock'
                        : 'bell'
                  }
                  size={15}
                />
              </span>

              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>
                  {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const stored = loadStoredAuth()
  const [auth, setAuth] = useState(stored)
  const [activeView, setActiveView] = useState('home')
  const [profile, setProfile] = useState(null)
  const [popularTrips, setPopularTrips] = useState([])
  const [searchTrips, setSearchTrips] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchParams, setSearchParams] = useState({
    from: 'Pune',
    to: 'Mumbai',
    date: getDateInputValue(1),
    passengers: 1,
  })
  const [requestedPassengers, setRequestedPassengers] = useState(1)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [seats, setSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [reservations, setReservations] = useState([])
  const [pendingReservations, setPendingReservations] = useState([])
  const [paymentOrigin, setPaymentOrigin] = useState('seats')
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletTransactions, setWalletTransactions] = useState([])
  const [supportTickets, setSupportTickets] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [appError, setAppError] = useState('')
  const [bookingNotice, setBookingNotice] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  const dismissBookingNotice = useCallback(() => setBookingNotice(null), [])

  // Dev-only: shout when the backend container is stale so it is never mistaken for an app bug.
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined

    const onStale = () =>
      setAppError(
        'Your backend is running an OLD build. Run: docker compose up -d --build --force-recreate backend'
      )

    window.addEventListener('srv-backend-stale', onStale)
    return () => window.removeEventListener('srv-backend-stale', onStale)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)

    setAuth(null)
    setProfile(null)
    setReservations([])
    setPendingReservations([])
    setSelectedTrip(null)
    setSelectedSeats([])
    setTicket(null)
  }, [])

  const refreshReservations = useCallback(async () => {
    if (!auth?.token) return

    const data = await api.getMyReservations(auth.token)

    debugLog(
      'BOOKINGS',
      `${data?.length ?? 0} reservations`,
      (data || []).slice(0, 8).map(item => ({
        id: item.reservationId,
        status: item.status,
        departure: item.departureTime,
        departed: item.departed,
        canCancel: item.canCancel,
        holdSeconds: item.holdSecondsRemaining,
      }))
    )

    setReservations(stampReservations(data))
  }, [auth?.token])

  const refreshWallet = useCallback(async () => {
    if (!auth?.token) return

    const [wallet, transactions] = await Promise.all([
      api.getWallet(auth.token),
      api.getWalletTransactions(auth.token),
    ])

    setWalletBalance(Number(wallet?.balance || 0))
    setWalletTransactions(transactions || [])
  }, [auth?.token])

  const refreshSupport = useCallback(async () => {
    if (!auth?.token) return
    setSupportTickets(await api.getSupportTickets(auth.token))
  }, [auth?.token])

  const refreshNotifications = useCallback(async () => {
    if (!auth?.token) return
    setNotifications(await api.getNotifications(auth.token))
  }, [auth?.token])

  useEffect(() => {
    if (!auth?.token) return

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(auth)
    )

    Promise.all([
      api.getProfile(auth.token),
      api.popularBuses(),
      api.getMyReservations(auth.token),
      api.getWallet(auth.token),
      api.getWalletTransactions(auth.token),
      api.getSupportTickets(auth.token),
      api.getNotifications(auth.token),
    ])
      .then(
        ([
          user,
          popular,
          bookingData,
          wallet,
          transactions,
          tickets,
          noteData,
        ]) => {
          setProfile(user)
          setPopularTrips(popular || [])
          setReservations(stampReservations(bookingData))
          setWalletBalance(Number(wallet?.balance || 0))
          setWalletTransactions(transactions || [])
          setSupportTickets(tickets || [])
          setNotifications(noteData || [])
        }
      )
      .catch(error => {
        if (error.status === 401) {
          logout()
        } else {
          setAppError(error.message)
        }
      })
  }, [auth?.token, logout])

  useEffect(() => {
    if (!auth?.token) return undefined

    const refresh = async () => {
      try {
        await Promise.all([
          refreshReservations(),
          refreshNotifications(),
          refreshWallet(),
        ])
      } catch (error) {
        if (error.status === 401) {
          logout()
        } else {
          setAppError(error.message)
        }
      }
    }

    const id = setInterval(() => {
      void refresh()
    }, 7000)

    return () => clearInterval(id)
  }, [
    auth?.token,
    logout,
    refreshReservations,
    refreshNotifications,
    refreshWallet,
  ])

  const handlePassengersChange = useCallback(count => {
    const passengers = Math.min(6, Math.max(1, Number(count) || 1))
    setSearchParams(current => ({ ...current, passengers }))
  }, [])

  const changeSeatCount = count => {
    const passengers = Math.min(6, Math.max(1, Number(count) || 1))
    setRequestedPassengers(passengers)
    setSearchParams(current => ({ ...current, passengers }))
    setSelectedSeats(current => current.slice(0, passengers))
  }

  const handleSearch = async params => {
    setSearchParams(params)
    setLoadingSearch(true)
    setHasSearched(true)
    setAppError('')

    try {
      setSearchTrips(await api.searchBuses(params))
      setActiveView('search')
    } catch (error) {
      setAppError(error.message)
    } finally {
      setLoadingSearch(false)
    }
  }

  const selectTrip = async trip => {
    setActionBusy(true)
    setAppError('')

    try {
      const [tripDetails, seatData] = await Promise.all([
        api.getBus(trip.id),
        api.getSeats(auth?.token, trip.id),
      ])

      setSelectedTrip(tripDetails)

      const passengerCount = Math.min(
        6,
        Math.max(1, Number(searchParams.passengers) || 1)
      )

      setRequestedPassengers(passengerCount)
      setSeats(seatData || [])
      setSelectedSeats([])
      setPendingReservations([])
      setActiveView('seats')
    } catch (error) {
      if (error.status === 401) {
        logout()
      } else {
        setAppError(error.message)
      }
    } finally {
      setActionBusy(false)
    }
  }

  const holdSelectedSeats = async () => {
    if (!selectedSeats.length || !selectedTrip) return

    const contactPhone = profile?.phone?.trim()

    if (!contactPhone) {
      setAppError(
        'Add your real contact phone number in Profile before holding seats.'
      )
      setActiveView('profile')
      return
    }

    setActionBusy(true)
    setAppError('')

    try {
      const held = await api.holdSeats(auth.token, {
        seatIds: selectedSeats.map(seat => seat.id),
        tripId: selectedTrip.id,
        passengerName:
          profile?.fullName?.trim() ||
          auth.fullName?.trim() ||
          auth.username,
        contactPhone,
      })

      // A fresh hold always has the full 5 minutes. Old backends do not send holdSecondsRemaining
      // (and send a timezone-less expiresAt), which used to show "Expired" instantly.
      const stampedHold = stampReservations(held).map(item => {
        if (typeof item.holdSecondsRemaining === 'number') return item

        console.error(
          '[SRV] Hold response has no holdSecondsRemaining -> the backend is an OLD build. ' +
            'Assuming 300s. Run: docker compose up -d --build --force-recreate backend'
        )

        return { ...item, holdSecondsRemaining: 300 }
      })

      debugLog(
        'HOLD',
        'locked',
        stampedHold.map(item => ({
          id: item.reservationId,
          seat: item.seatNumber,
          holdSecondsRemaining: item.holdSecondsRemaining,
          expiresAt: item.expiresAt,
        }))
      )

      setPendingReservations(stampedHold)
      setPaymentOrigin('seats')

      setReservations(current => [
        ...stampedHold,
        ...current.filter(
          item =>
            !stampedHold.some(
              next => next.reservationId === item.reservationId
            )
        ),
      ])

      setSelectedSeats([])
      setActiveView('payment')
    } catch (error) {
      if (error.status === 401) {
        logout()
      } else {
        setAppError(error.message)

        // Someone else may have taken a seat: refresh the map so it shows the truth.
        try {
          setSeats((await api.getSeats(auth.token, selectedTrip.id)) || [])
          setSelectedSeats([])
        } catch {
          /* keep the current map if the refresh fails */
        }
      }
    } finally {
      setActionBusy(false)
    }
  }

  const leavePayment = async () => {
    const pending = pendingReservations
    const origin = paymentOrigin
    const trip = selectedTrip

    setPendingReservations([])

    debugLog('RELEASE', 'leaving payment', {
      origin,
      ids: pending.map(item => item.reservationId),
    })

    // Give the seats back immediately instead of blocking them for the rest of the 5 minutes.
    if (origin === 'seats' && pending.length) {
      try {
        const released = await api.releaseHolds(auth.token, {
          reservationIds: pending.map(item => item.reservationId),
        })

        debugLog(
          'RELEASE',
          `server released ${released?.length ?? 0}/${pending.length}`,
          released
        )

        if ((released?.length ?? 0) < pending.length) {
          setAppError(
            'Some seats could not be released right now. They will free up automatically when the 5-minute lock ends.'
          )
        }
      } catch (error) {
        debugLog('RELEASE', 'failed', error.status, error.message)
        setAppError(
          `Could not release your seats (${error.message}). They will free up automatically when the 5-minute lock ends.`
        )
      }
    }

    try {
      await refreshReservations()
    } catch {
      /* non-blocking */
    }

    if (origin === 'seats' && trip) {
      try {
        setSeats((await api.getSeats(auth.token, trip.id)) || [])
      } catch {
        /* keep the previous map */
      }

      setSelectedSeats([])
      setActiveView('seats')
    } else {
      setActiveView('bookings')
    }
  }

  const payReservations = async (
    method,
    setWalletNote,
    total
  ) => {
    if (!pendingReservations.length) return

    if (
      method === 'WALLET' &&
      Number(walletBalance) < Number(total)
    ) {
      setWalletNote(
        `Your wallet balance is ${money(walletBalance)}, but this booking needs ${money(total)}.`
      )
      return
    }

    setActionBusy(true)
    setAppError('')

    try {
      const response = await api.payBatch(auth.token, {
        reservationIds: pendingReservations.map(
          item => item.reservationId
        ),
        method,
      })

      const firstReservationId =
        response?.[0]?.reservationId ||
        pendingReservations[0].reservationId

      setPendingReservations([])

      await refreshReservations()
      await refreshWallet()
      await refreshNotifications()

      setTicket(
        await api.getTicket(
          auth.token,
          firstReservationId
        )
      )

      setActiveView('bookings')
    } catch (error) {
      if (method === 'WALLET' && error.status !== 401) {
        setWalletNote(error.message)
      } else if (error.status === 401) {
        logout()
      } else {
        setAppError(error.message)
      }
    } finally {
      setActionBusy(false)
    }
  }

  const openPaymentForBooking = reservation => {
    if (holdRemainingMs(reservation) === 0) {
      setAppError(
        'The 5-minute seat lock for this booking has ended. Please search and select the seats again.'
      )
      refreshReservations().catch(() => {})
      return
    }

    setPendingReservations([reservation])
    setPaymentOrigin('bookings')
    setActiveView('payment')
  }

  const openTicket = async reservation => {
    setActionBusy(true)

    try {
      setTicket(
        await api.getTicket(
          auth.token,
          reservation.reservationId
        )
      )
    } catch (error) {
      setAppError(error.message)
    } finally {
      setActionBusy(false)
    }
  }

  // Turns a failed request into a message a person can act on (and the console shows the raw details).
  const explainCancelError = error => {
    if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.'
    if (error.status === 404 && /Endpoint not found/i.test(error.message)) {
      return 'The backend does not know this endpoint - it is an OLD build. Run: docker compose up -d --build --force-recreate backend'
    }
    if (error.status === 409) return `${error.message} Please try again in a moment.`
    if (error.status === 429) return 'Too many requests. Wait a minute and try again.'
    if (error.status >= 500) return `${error.message} (server error ${error.status} - see the backend log lines starting with [CANCEL])`
    return error.message
  }

  // Cancels a PAID booking. The server frees the seat and refunds the wallet in one transaction.
  const cancelBooking = async reservation => {
    if (actionBusy) {
      debugLog('CANCEL', 'ignored - another action is still running')
      return
    }

    const id = reservation.reservationId
    const ref = reservation.bookingReference || `#${id}`
    const expectedRefund = refundAmountFor(reservation)
    const walletBefore = walletBalance
    const startedAt = performance.now()

    setActionBusy(true)
    setCancellingId(id)
    setAppError('')
    setBookingNotice(null)

    debugLog('CANCEL', '1) requesting', {
      id,
      ref,
      status: reservation.status,
      departureTime: reservation.departureTime,
      canCancel: reservation.canCancel,
      departed: reservation.departed,
      fare: reservation.fare,
      expectedRefund,
      walletBefore,
    })

    try {
      const result = await api.cancelReservation(auth.token, id)

      debugLog(
        'CANCEL',
        '2) server accepted',
        { status: result?.status, ms: Math.round(performance.now() - startedAt) },
        result
      )

      // Move the card to the Cancelled tab straight away, then confirm with the server.
      setReservations(current =>
        current.map(item =>
          item.reservationId === id
            ? { ...item, status: 'CANCELLED', canCancel: false }
            : item
        )
      )

      const refreshed = await Promise.allSettled([
        refreshReservations(),
        refreshNotifications(),
      ])

      refreshed.forEach((outcome, index) => {
        if (outcome.status === 'rejected') {
          debugLog('CANCEL', `refresh #${index} failed`, outcome.reason?.status, outcome.reason?.message)
        }
      })

      let walletAfter = null

      try {
        const [wallet, transactions] = await Promise.all([
          api.getWallet(auth.token),
          api.getWalletTransactions(auth.token),
        ])

        walletAfter = Number(wallet?.balance || 0)
        setWalletBalance(walletAfter)
        setWalletTransactions(transactions || [])
      } catch (walletError) {
        debugLog('CANCEL', 'wallet refresh failed', walletError.status, walletError.message)
      }

      const delta = walletAfter === null ? null : walletAfter - walletBefore
      const refunded =
        delta !== null && delta > 0 ? delta : delta === 0 ? 0 : expectedRefund

      debugLog('CANCEL', '3) refund check', {
        expectedRefund,
        walletBefore,
        walletAfter,
        delta,
        shownToUser: refunded,
        matchesExpected: delta === null ? 'unknown' : delta === expectedRefund,
      })

      if (delta !== null && delta !== 0 && delta !== expectedRefund) {
        debugLog('CANCEL', 'WARNING: wallet change differs from the expected refund', {
          delta,
          expectedRefund,
        })
      }

      setBookingNotice({
        type: 'success',
        title: `Booking ${ref} cancelled`,
        text:
          refunded > 0
            ? `${money(refunded)} has been refunded to your SeatReserve wallet.`
            : 'No payment was recorded for this booking, so there was nothing to refund.',
        showCancelledTab: true,
      })
    } catch (error) {
      debugLog('CANCEL', 'X failed', {
        id,
        status: error.status,
        message: error.message,
        data: error.data,
        ms: Math.round(performance.now() - startedAt),
      })

      if (error.status === 401) {
        logout()
      } else {
        setBookingNotice({
          type: 'error',
          title: `Could not cancel booking ${ref}`,
          text: explainCancelError(error),
        })

        // Re-sync so a stale card (already cancelled / departed) disappears.
        refreshReservations().catch(() => {})
      }
    } finally {
      setActionBusy(false)
      setCancellingId(null)
    }
  }

  // Cancels an UNPAID hold (nothing was charged, the seat just goes back on sale).
  const releasePendingBooking = async reservation => {
    if (actionBusy) {
      debugLog('RELEASE', 'ignored - another action is still running')
      return
    }

    const id = reservation.reservationId
    const ref = reservation.bookingReference || `#${id}`
    const startedAt = performance.now()

    setActionBusy(true)
    setCancellingId(id)
    setAppError('')
    setBookingNotice(null)

    debugLog('RELEASE', '1) releasing unpaid hold', { id, ref, status: reservation.status })

    try {
      const released = await api.releaseHolds(auth.token, { reservationIds: [id] })

      debugLog('RELEASE', '2) server answered', {
        releasedCount: released?.length ?? 0,
        ms: Math.round(performance.now() - startedAt),
        released,
      })

      await refreshReservations()

      setBookingNotice(
        (released?.length ?? 0) > 0
          ? {
              type: 'success',
              title: `Seat released for ${ref}`,
              text: 'You were not charged. The seat is available to others again.',
              showCancelledTab: true,
            }
          : {
              type: 'error',
              title: `Could not release ${ref}`,
              text: 'The server could not release this hold. It may have just expired - the seat frees itself after the 5-minute lock.',
            }
      )
    } catch (error) {
      debugLog('RELEASE', 'X failed', { status: error.status, message: error.message, data: error.data })

      if (error.status === 401) {
        logout()
      } else {
        setBookingNotice({
          type: 'error',
          title: `Could not release ${ref}`,
          text: explainCancelError(error),
        })
        refreshReservations().catch(() => {})
      }
    } finally {
      setActionBusy(false)
      setCancellingId(null)
    }
  }

  const saveProfile = async payload => {
    const updated = await api.updateProfile(
      auth.token,
      payload
    )

    setProfile(updated)
  }

  const createSupport = async payload => {
    await api.createSupportTicket(
      auth.token,
      payload
    )

    await refreshSupport()
    await refreshNotifications()
  }

  const topUp = async amount => {
    try {
      const data = await api.topUpWallet(
        auth.token,
        amount
      )

      setWalletBalance(Number(data?.balance || 0))
      setWalletTransactions(
        await api.getWalletTransactions(auth.token)
      )
      await refreshNotifications()
    } catch (error) {
      if (error.status === 401) {
        logout()
      } else {
        setAppError(error.message)
      }
    }
  }

  const navigate = (view, query = '') => {
    setShowNotifications(false)

    if (view === 'search' && query) {
      handleSearch({
        ...searchParams,
        from: query,
      })
    } else {
      setActiveView(view)
    }
  }

  if (!auth) {
    return (
      <AuthScreen
        onAuthenticated={response => {
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify(response)
          )
          sessionStorage.removeItem(AUTH_STORAGE_KEY)
          setAuth(response)
        }}
      />
    )
  }

  return (
    <div className="application-shell">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={logout}
      />

      <div className="app-main">
        <Topbar
          profile={profile || auth}
          notifications={notifications}
          onNotifications={() =>
            setShowNotifications(value => !value)
          }
          onNavigate={navigate}
        />

        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
          />
        )}

        {appError && (
          <div className="global-alert">
            <Icon name="help" size={17} />
            <span>{appError}</span>
            <button
              type="button"
              onClick={() => setAppError('')}
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        <main className="app-content">
          {activeView === 'home' && (
            <HomeView
              popularTrips={popularTrips}
              search={searchParams}
              onSearch={handleSearch}
              onSelectTrip={selectTrip}
              setView={setActiveView}
              onPassengersChange={handlePassengersChange}
            />
          )}

          {activeView === 'search' && (
            <SearchView
              search={searchParams}
              onSearch={handleSearch}
              trips={hasSearched ? searchTrips : popularTrips}
              onSelectTrip={selectTrip}
              loading={loadingSearch}
              hasSearched={hasSearched}
              onPassengersChange={handlePassengersChange}
            />
          )}

          {activeView === 'seats' && selectedTrip && (
            <SeatMapView
              trip={selectedTrip}
              seats={seats}
              selectedSeats={selectedSeats}
              setSelectedSeats={setSelectedSeats}
              onHold={holdSelectedSeats}
              busy={actionBusy}
              maxSelectableSeats={requestedPassengers}
              onPassengersChange={changeSeatCount}
            />
          )}

          {activeView === 'payment' && (
            <PaymentView
              reservations={pendingReservations}
              onPay={payReservations}
              onBack={leavePayment}
              busy={actionBusy}
              walletBalance={walletBalance}
              canReleaseOnBack={paymentOrigin === 'seats'}
            />
          )}

          {activeView === 'bookings' && (
            <BookingsView
              reservations={reservations}
              onPay={openPaymentForBooking}
              onTicket={openTicket}
              onCancel={cancelBooking}
              onReleaseHold={releasePendingBooking}
              busy={actionBusy}
              cancellingId={cancellingId}
              notice={bookingNotice}
              onDismissNotice={dismissBookingNotice}
            />
          )}

          {activeView === 'wallet' && (
            <WalletView
              balance={walletBalance}
              transactions={walletTransactions}
              onTopUp={topUp}
            />
          )}

          {activeView === 'profile' && (
            <ProfileView
              profile={profile || auth}
              onSave={saveProfile}
            />
          )}

          {activeView === 'support' && (
            <SupportView
              tickets={supportTickets}
              onCreate={createSupport}
            />
          )}

          <div className="mobile-bottom-nav">
            {[
              ['home', 'Home'],
              ['search', 'Search'],
              ['bookings', 'Bookings'],
              ['wallet', 'Wallet'],
              ['profile', 'Profile'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={activeView === key ? 'active' : ''}
                onClick={() => setActiveView(key)}
              >
                <Icon
                  name={key === 'bookings' ? 'ticket' : key}
                  size={19}
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </main>
      </div>

      {ticket && (
        <TicketModal
          ticket={ticket}
          onClose={() => setTicket(null)}
        />
      )}
    </div>
  )
}

export default App
