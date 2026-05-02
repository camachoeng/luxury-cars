import { supabase } from './supabase.js'
import { escapeHtml } from './utils.js'
import { applyTranslations, t } from './i18n.js'

export async function initDriverPortal() {
  const loading         = document.getElementById('driver-loading')
  const content         = document.getElementById('driver-content')
  const errorEl         = document.getElementById('driver-error')
  const errorMsg        = document.getElementById('driver-error-msg')
  const signOutBtn      = document.getElementById('driver-signout-btn')
  const setPasswordScreen = document.getElementById('set-password-screen')

  applyTranslations()

  // ── Book a Ride link (goes to homepage) ──────────────────────────────────
  const bookBtn = document.getElementById('driver-book-btn')
  if (bookBtn) bookBtn.href = import.meta.env.BASE_URL

  // ── Sign out ──────────────────────────────────────────────────────────────
  signOutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = import.meta.env.BASE_URL + 'pages/login.html'
  })

  function showError(msg) {
    loading?.classList.add('hidden')
    content?.classList.add('hidden')
    setPasswordScreen?.classList.add('hidden')
    if (errorEl)  errorEl.classList.remove('hidden')
    if (errorMsg) errorMsg.textContent = msg
  }

  // ── Handle invite / recovery token in URL hash ────────────────────────────
  // Supabase puts #access_token=...&type=invite in the URL after clicking invite link.
  // getSession() processes it automatically; we just need to detect the type.
  const hashParams  = new URLSearchParams(window.location.hash.replace('#', ''))
  const tokenType   = hashParams.get('type')
  const isInvite    = tokenType === 'invite' || tokenType === 'recovery'

  if (isInvite) {
    // Supabase has already exchanged the token and created a session.
    // Show set-password screen before continuing.
    loading?.classList.add('hidden')
    setPasswordScreen?.classList.remove('hidden')

    const pwInput    = document.getElementById('set-password-input')
    const pwConfirm  = document.getElementById('set-password-confirm')
    const pwError    = document.getElementById('set-password-error')
    const pwBtn      = document.getElementById('set-password-btn')

    pwInput?.addEventListener('keydown',   e => { if (e.key === 'Enter') pwConfirm?.focus() })
    pwConfirm?.addEventListener('keydown', e => { if (e.key === 'Enter') pwBtn?.click() })

    pwBtn?.addEventListener('click', async () => {
      const pw  = pwInput?.value
      const pw2 = pwConfirm?.value
      if (!pw || pw.length < 8) {
        if (pwError) { pwError.textContent = 'Password must be at least 8 characters.'; pwError.classList.remove('hidden') }
        return
      }
      if (pw !== pw2) {
        if (pwError) { pwError.textContent = 'Passwords do not match.'; pwError.classList.remove('hidden') }
        return
      }
      pwBtn.disabled = true
      pwBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving…`

      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) {
        pwBtn.disabled = false
        pwBtn.innerHTML = `<span class="material-symbols-outlined text-base">lock</span> Save Password & Continue`
        if (pwError) { pwError.textContent = error.message; pwError.classList.remove('hidden') }
        return
      }

      // Password saved — clear hash and continue to portal
      window.history.replaceState(null, '', window.location.pathname)
      setPasswordScreen?.classList.add('hidden')
      loading?.classList.remove('hidden')
      await loadPortal(loading, content, showError)
    })
    return
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = import.meta.env.BASE_URL +
      `pages/login.html?ld_return_to=${encodeURIComponent(window.location.pathname)}`
    return
  }

  await loadPortal(loading, content, showError)
}

// ── Load the main portal (shared by normal login and post-invite flow) ────────

async function loadPortal(loading, content, showError) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { showError('Session expired. Please sign in again.'); return }

  // ── Look up driver record by email ────────────────────────────────────────
  const { data: drivers, error: driverErr } = await supabase
    .from('drivers')
    .select('id, name, is_available, is_active')
    .eq('email', user.email)
    .limit(1)

  if (driverErr || !drivers?.length) {
    showError('No driver account is associated with this email address. Contact your admin.')
    return
  }

  const driver = drivers[0]

  if (!driver.is_active) {
    showError('Your driver account is inactive. Contact your admin.')
    return
  }

  // ── Render portal ─────────────────────────────────────────────────────────
  loading?.classList.add('hidden')
  content?.classList.remove('hidden')

  document.getElementById('driver-name').textContent = driver.name

  renderAvailability(driver.is_available)
  await loadUpcomingTrips(driver.id)

  // ── Availability toggle ───────────────────────────────────────────────────
  const toggleBtn   = document.getElementById('availability-toggle')
  const availErr    = document.getElementById('availability-error')
  let   isAvailable = driver.is_available

  toggleBtn?.addEventListener('click', async () => {
    toggleBtn.disabled = true
    if (availErr) availErr.classList.add('hidden')

    const next = !isAvailable
    const { error } = await supabase
      .from('drivers')
      .update({ is_available: next })
      .eq('id', driver.id)

    if (error) {
      if (availErr) {
        availErr.textContent = 'Failed to update status. Try again.'
        availErr.classList.remove('hidden')
      }
    } else {
      isAvailable = next
      renderAvailability(isAvailable)
    }

    toggleBtn.disabled = false
  })
}

// ── Render availability toggle state ─────────────────────────────────────────

function renderAvailability(isAvailable) {
  const toggle = document.getElementById('availability-toggle')
  const knob   = document.getElementById('availability-knob')
  const label  = document.getElementById('availability-label')
  const sub    = document.getElementById('availability-sub')

  if (!toggle) return

  toggle.setAttribute('aria-checked', String(isAvailable))

  if (isAvailable) {
    toggle.className = toggle.className.replace(/bg-\S+/, '')
    toggle.classList.add('bg-emerald-500')
    knob?.classList.remove('translate-x-0')
    knob?.classList.add('translate-x-8')
    if (label) { label.textContent = 'Available'; label.className = 'text-base font-bold text-emerald-400' }
    if (sub)   sub.textContent = 'You will receive new trip requests'
  } else {
    toggle.className = toggle.className.replace(/bg-\S+/, '')
    toggle.classList.add('bg-slate-700')
    knob?.classList.remove('translate-x-8')
    knob?.classList.add('translate-x-0')
    if (label) { label.textContent = 'Unavailable'; label.className = 'text-base font-bold text-slate-400' }
    if (sub)   sub.textContent = 'You will not receive trip requests'
  }
}

// ── Load upcoming assigned trips ──────────────────────────────────────────────

async function loadUpcomingTrips(driverId) {
  const listEl    = document.getElementById('trips-list')
  const emptyEl   = document.getElementById('trips-empty')
  const loadingEl = document.getElementById('trips-loading')

  if (!listEl) return
  loadingEl?.classList.remove('hidden')

  const today = new Date().toISOString().slice(0, 10)

  // Include today's completed/no_show trips so drivers can see what they finished
  const { data: trips, error } = await supabase
    .from('bookings')
    .select('id, booking_ref, pickup, dropoff, trip_date, trip_time, passenger_name, passenger_phone, passenger_count, status')
    .eq('driver_id', driverId)
    .in('status', ['confirmed', 'completed', 'no_show'])
    .gte('trip_date', today)
    .order('trip_date', { ascending: true })
    .order('trip_time', { ascending: true })

  loadingEl?.classList.add('hidden')

  if (error || !trips?.length) {
    emptyEl?.classList.remove('hidden')
    return
  }

  // Fetch latest trip event for each booking (driver RLS policy allows this)
  const bookingIds = trips.map(t => t.id)
  let latestEvents = {}
  if (bookingIds.length) {
    const { data: events } = await supabase
      .from('trip_events')
      .select('booking_id, event_type, created_at')
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false })

    events?.forEach(ev => {
      if (!latestEvents[ev.booking_id]) latestEvents[ev.booking_id] = ev.event_type
    })
  }

  listEl.innerHTML = trips.map(t => tripCard(t, latestEvents[t.id] ?? null, today)).join('')
  initTripEventHandlers(listEl)
}

// ── Trip event button handlers ────────────────────────────────────────────────

function initTripEventHandlers(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-event-type]')
    if (!btn) return

    const eventType = btn.dataset.eventType
    const bookingId = btn.closest('[data-booking-id]')?.dataset.bookingId
    if (!bookingId) return

    // Confirm destructive actions
    if (eventType === 'no_show') {
      if (!confirm('Mark this trip as a no-show? The client will be charged the full fare and notified by email. This cannot be undone.')) return
    }
    if (eventType === 'dropped_off') {
      if (!confirm('Confirm drop-off? The client will be charged automatically and sent a review request. This cannot be undone.')) return
    }

    btn.disabled = true
    const original = btn.innerHTML
    btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>`

    const { error } = await supabase.functions.invoke('log-trip-event', {
      body: { bookingId, eventType },
    })

    if (error) {
      btn.disabled = false
      btn.innerHTML = original
      alert('Failed to update trip status. Please try again.')
      return
    }

    // Reload the trips section to reflect new state
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: drivers } = await supabase
      .from('drivers').select('id').eq('email', user.email).limit(1)
    if (drivers?.[0]) await loadUpcomingTrips(drivers[0].id)
  })
}

// ── Trip card ─────────────────────────────────────────────────────────────────

// Status button definitions: eventType → { label, icon, color }
const EVENT_BUTTONS = {
  arrived:    { label: 'Arrived at Pickup',   icon: 'location_on',     color: 'bg-[#1152d4] hover:bg-blue-700 text-white' },
  picked_up:  { label: 'Picked Up Client',    icon: 'person_check',    color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  on_way:     { label: 'En Route to Destination', icon: 'directions_car', color: 'bg-[#c5a059] hover:bg-amber-600 text-[#0a0f16]' },
  dropped_off:{ label: 'Drop Off Client',     icon: 'flag',            color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  no_show:    { label: 'Report No-Show',      icon: 'person_off',      color: 'bg-red-700 hover:bg-red-800 text-white' },
}

// Given the latest event, return what button(s) the driver should see next
function nextActions(latestEvent) {
  switch (latestEvent) {
    case null:       return ['arrived']
    case 'arrived':  return ['picked_up', 'no_show']
    case 'picked_up':return ['on_way']
    case 'on_way':   return ['dropped_off']
    default:         return []
  }
}

function tripCard(t, latestEvent, today) {
  const isHourly   = t.dropoff?.startsWith('Hourly')
  const isToday    = t.trip_date === today
  const isComplete = t.status === 'completed' || latestEvent === 'dropped_off'
  const isNoShow   = t.status === 'no_show'   || latestEvent === 'no_show'

  const dateStr = t.trip_date
    ? new Date(`${t.trip_date}T${t.trip_time || '00:00'}`)
        .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : '—'

  const route = isHourly
    ? `${escapeHtml(t.pickup)} · ${escapeHtml(t.dropoff?.replace('Hourly – ', '') || '')}`
    : `${escapeHtml(t.pickup)} → ${escapeHtml(t.dropoff)}`

  // Status badge for completed / no-show
  let statusBadge = ''
  if (isComplete) {
    statusBadge = `<div class="flex items-center gap-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40 px-3 py-2 text-xs font-semibold text-emerald-400">
      <span class="material-symbols-outlined text-sm">check_circle</span> Trip Complete
    </div>`
  } else if (isNoShow) {
    statusBadge = `<div class="flex items-center gap-1.5 rounded-lg bg-red-900/30 border border-red-700/40 px-3 py-2 text-xs font-semibold text-red-400">
      <span class="material-symbols-outlined text-sm">person_off</span> No-Show Reported
    </div>`
  }

  // Current step indicator
  let stepIndicator = ''
  const stepLabels = { arrived: 'Arrived at pickup', picked_up: 'Client picked up', on_way: 'En route', dropped_off: 'Dropped off', no_show: 'No-show' }
  if (latestEvent && !isComplete && !isNoShow) {
    stepIndicator = `<div class="text-xs text-slate-500 flex items-center gap-1">
      <span class="material-symbols-outlined text-xs">radio_button_checked</span>
      ${escapeHtml(stepLabels[latestEvent] || latestEvent)}
    </div>`
  }

  // Action buttons (only for today's active trips)
  let actionButtons = ''
  if (isToday && !isComplete && !isNoShow) {
    const actions = nextActions(latestEvent)
    actionButtons = `<div class="flex flex-wrap gap-2 pt-1">
      ${actions.map(ev => {
        const def = EVENT_BUTTONS[ev]
        return `<button data-event-type="${ev}"
          class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${def.color}">
          <span class="material-symbols-outlined text-sm">${def.icon}</span>
          ${def.label}
        </button>`
      }).join('')}
    </div>`
  }

  return `
    <div data-booking-id="${escapeHtml(t.id)}" class="rounded-xl border ${isComplete ? 'border-emerald-800/30' : isNoShow ? 'border-red-800/30' : 'border-slate-800'} bg-[#161C28] px-5 py-4 space-y-2">
      <div class="flex items-center justify-between gap-3">
        <span class="font-mono text-xs text-[#C5A059]">${escapeHtml(t.booking_ref)}</span>
        <span class="text-xs text-slate-400">${escapeHtml(dateStr)}</span>
      </div>
      <p class="text-sm text-slate-300">
        <span class="material-symbols-outlined text-sm align-middle text-[#1152d4]">route</span>
        ${route}
      </p>
      <p class="text-sm text-white font-semibold">${escapeHtml(t.passenger_name)}</p>
      <p class="text-xs text-slate-400">
        ${t.passenger_phone ? escapeHtml(t.passenger_phone) + ' · ' : ''}
        ${escapeHtml(String(t.passenger_count || 1))} passenger${(t.passenger_count || 1) !== 1 ? 's' : ''}
      </p>
      ${stepIndicator}
      ${statusBadge}
      ${actionButtons}
    </div>
  `
}
