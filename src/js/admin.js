// ===== YMV Limo — Admin Dashboard =====
// Admin-only page for assigning vehicles to pending bookings and editing settings.
//
// SUPABASE SETUP REQUIRED:
//   1. Set is_admin: true in app_metadata for staff accounts (SQL Editor — service role only):
//      UPDATE auth.users
//        SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
//        WHERE email = 'your-admin@email.com';
//      NOTE: use app_metadata (raw_app_meta_data), NOT user_metadata — users can edit their
//      own user_metadata which would allow privilege escalation.
//
//   2. RLS policies on bookings table:
//      CREATE POLICY "Admins can read all bookings"
//        ON bookings FOR SELECT TO authenticated
//        USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
//      CREATE POLICY "Admins can update bookings"
//        ON bookings FOR UPDATE TO authenticated
//        USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
//
//   3. Create and seed the admin_settings table (SQL Editor):
//      CREATE TABLE admin_settings (
//        key        TEXT PRIMARY KEY,
//        value      TEXT NOT NULL,
//        label      TEXT,
//        unit       TEXT,
//        updated_at TIMESTAMPTZ DEFAULT now()
//      );
//      ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
//      CREATE POLICY "Admins can read settings"
//        ON admin_settings FOR SELECT TO authenticated
//        USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
//      CREATE POLICY "Admins can update settings"
//        ON admin_settings FOR UPDATE TO authenticated
//        USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
//
//      INSERT INTO admin_settings (key, value, label, unit) VALUES
//        ('cancellation_fee',         '20',   'Admin Fee for Any Cancellation',          '$'),
//        ('late_cancel_percent',      '50',   'Late Cancellation Fee',                   '%'),
//        ('late_cancel_window_hours', '6',    'Late Cancel Window (hours before pickup)', 'hrs'),
//        ('no_show_wait_minutes',     '30',   'No-Show Wait Time',                       'min'),
//        ('driver_early_arrival_min', '5',    'Driver Arrives Early',                    'min'),
//        ('rate_per_hour',            '100',  'Hourly Rate',                             '$/hr'),
//        ('rate_per_mile',            '4.00', 'Per-Mile Rate',                           '$/mi'),
//        ('hourly_min_hours',         '2',    'Minimum Hours (hourly bookings)',          'hrs'),
//        ('hourly_mile_cap',          '30',   'Miles Included Per Hour',                 'mi/hr');

import { supabase } from './supabase.js'
import { getUser } from './auth.js'
import { escapeHtml } from './utils.js'

// Keys that belong to each settings group
const CANCELLATION_KEYS = [
  'cancellation_fee',
  'late_cancel_percent',
  'late_cancel_window_hours',
  'no_show_wait_minutes',
  'driver_early_arrival_min',
]
const PRICING_KEYS = [
  'rate_per_hour',
  'rate_per_mile',
  'hourly_min_hours',
  'hourly_mile_cap',
]

export async function initAdmin() {
  const user = await getUser()
  if (!user) {
    sessionStorage.setItem('ld_return_to', `${import.meta.env.BASE_URL}pages/admin.html`)
    window.location.href = `${import.meta.env.BASE_URL}pages/login.html`
    return
  }

  if (!user.app_metadata?.is_admin) {
    document.getElementById('admin-loading')?.classList.add('hidden')
    document.getElementById('admin-denied')?.classList.remove('hidden')
    return
  }

  initTabs()
  await loadDashboard()

  document.getElementById('admin-refresh')?.addEventListener('click', loadDashboard)
}

// ===== TABS =====

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })
}

function switchTab(tabName) {
  // Update button styles
  document.querySelectorAll('.admin-tab').forEach(btn => {
    const active = btn.dataset.tab === tabName
    btn.classList.toggle('bg-[#0A0F16]', active)
    btn.classList.toggle('text-white', active)
    btn.classList.toggle('text-slate-400', !active)
  })
  // Show/hide panels
  document.getElementById('tab-bookings')?.classList.toggle('hidden', tabName !== 'bookings')
  document.getElementById('tab-settings')?.classList.toggle('hidden', tabName !== 'settings')
  document.getElementById('tab-reviews')?.classList.toggle('hidden', tabName !== 'reviews')
  document.getElementById('tab-fleet')?.classList.toggle('hidden', tabName !== 'fleet')
  document.getElementById('tab-users')?.classList.toggle('hidden', tabName !== 'users')

  // Lazy-load on first click
  if (tabName === 'reviews') loadReviews()
  if (tabName === 'fleet')   loadFleetTab()
  if (tabName === 'users')   loadUsersTab()
}

// ===== DASHBOARD LOAD =====

async function loadDashboard() {
  showLoading(true)

  try {
    const [bookings, drivers, settings] = await Promise.all([
      fetchAllBookings(),
      fetchActiveDrivers(),
      fetchSettings(),
    ])

    renderStats(bookings)
    renderPendingBookings(bookings.filter(b => b.status === 'pending'), drivers)
    renderAllBookings(bookings)
    renderSettings(settings)

    showLoading(false)
  } catch (err) {
    console.error('[Admin] Failed to load dashboard:', err)
    showLoading(false)
    const content = document.getElementById('admin-content')
    if (content) {
      content.insertAdjacentHTML('afterbegin', `
        <div class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          Failed to load data: ${escapeHtml(err.message)}
        </div>
      `)
    }
  }
}

// ===== DATA FETCHING =====

async function fetchAllBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, vehicles (id, name, class), drivers (id, name), stripe_payment_method_id, charged_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to load bookings: ' + error.message)
  return data || []
}

async function fetchActiveDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, name, vehicle_id, vehicles (id, name, class)')
    .eq('is_active', true)
    .not('vehicle_id', 'is', null)
    .order('name')

  if (error) throw new Error('Failed to load drivers: ' + error.message)
  return data || []
}

async function fetchSettings() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')

  if (error) throw new Error('Failed to load settings: ' + error.message)
  // Convert array to key→row map
  return Object.fromEntries((data || []).map(row => [row.key, row]))
}

// ===== RENDER STATS =====

function renderStats(bookings) {
  const pending   = bookings.filter(b => b.status === 'pending').length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const noShow    = bookings.filter(b => b.status === 'no_show').length
  const total     = bookings.length

  const el = document.getElementById('admin-stats')
  if (!el) return

  el.innerHTML = [
    { label: 'Total Bookings', value: total,     icon: 'receipt_long',    color: 'text-slate-300' },
    { label: 'Pending',        value: pending,   icon: 'pending_actions', color: 'text-amber-400' },
    { label: 'Confirmed',      value: confirmed, icon: 'check_circle',    color: 'text-emerald-400' },
    { label: 'No-Shows',       value: noShow,    icon: 'person_off',      color: 'text-red-400' },
  ].map(s => `
    <div class="rounded-xl border border-slate-800 bg-[#161C28] px-5 py-4 flex items-center gap-4">
      <span class="material-symbols-outlined text-3xl ${s.color}">${s.icon}</span>
      <div>
        <p class="text-2xl font-extrabold text-white">${s.value}</p>
        <p class="text-xs text-slate-400">${s.label}</p>
      </div>
    </div>
  `).join('')
}

// ===== RENDER SETTINGS =====

function renderSettings(settings) {
  renderSettingsGroup('settings-cancellation', CANCELLATION_KEYS, settings)
  renderSettingsGroup('settings-pricing',      PRICING_KEYS,      settings)
  initSaveHandlers(settings)
}

function renderSettingsGroup(containerId, keys, settings) {
  const el = document.getElementById(containerId)
  if (!el) return

  el.innerHTML = keys.map(key => {
    const row   = settings[key]
    const label = row?.label ?? key
    const value = row?.value ?? ''
    const unit  = row?.unit  ?? ''

    return `
      <div class="space-y-1.5">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">
          ${escapeHtml(label)}
          ${unit ? `<span class="ml-1 font-normal normal-case text-slate-500">(${escapeHtml(unit)})</span>` : ''}
        </label>
        <input
          type="number"
          min="0"
          step="any"
          data-setting-key="${escapeHtml(key)}"
          value="${escapeHtml(value)}"
          class="w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-4 py-2.5 text-slate-100 focus:border-[#C5A059] focus:outline-none"
        />
      </div>
    `
  }).join('')
}

function initSaveHandlers(settings) {
  initSaveButton('save-cancellation', 'save-cancellation-msg', CANCELLATION_KEYS)
  initSaveButton('save-pricing',      'save-pricing-msg',      PRICING_KEYS)
}

function initSaveButton(btnId, msgId, keys) {
  const btn = document.getElementById(btnId)
  const msg = document.getElementById(msgId)
  if (!btn || !msg) return

  // Remove old listener by replacing the node
  const newBtn = btn.cloneNode(true)
  btn.parentNode.replaceChild(newBtn, btn)

  newBtn.addEventListener('click', async () => {
    newBtn.disabled = true
    const originalHTML = newBtn.innerHTML
    newBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving…`

    try {
      await saveSettingsGroup(keys)
      showSettingsMsg(document.getElementById(msgId), 'Saved successfully.', false)
    } catch (err) {
      showSettingsMsg(document.getElementById(msgId), err.message, true)
    } finally {
      newBtn.disabled = false
      newBtn.innerHTML = originalHTML
    }
  })
}

async function saveSettingsGroup(keys) {
  const updates = keys.map(key => {
    const input = document.querySelector(`[data-setting-key="${key}"]`)
    return { key, value: input?.value ?? '' }
  })

  for (const { key, value } of updates) {
    const { error } = await supabase
      .from('admin_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)

    if (error) throw new Error(`Failed to save "${key}": ${error.message}`)
  }
}

function showSettingsMsg(el, text, isError) {
  if (!el) return
  el.textContent = text
  el.className = `text-xs ${isError ? 'text-red-400' : 'text-emerald-400'}`
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 4000)
}

// ===== RENDER PENDING BOOKINGS =====

function renderPendingBookings(pending, drivers) {
  const list  = document.getElementById('pending-list')
  const empty = document.getElementById('pending-empty')
  if (!list || !empty) return

  if (pending.length === 0) {
    list.innerHTML = ''
    empty.classList.remove('hidden')
    return
  }

  empty.classList.add('hidden')
  list.innerHTML = pending.map(b => bookingCard(b, drivers)).join('')
  initAssignHandlers(list)
  initBookingDeleteHandlers(list)
}

// ===== RENDER ALL BOOKINGS =====

function renderAllBookings(bookings) {
  const list = document.getElementById('all-list')
  if (!list) return

  if (bookings.length === 0) {
    list.innerHTML = '<p class="text-sm text-slate-500">No bookings yet.</p>'
    return
  }

  list.innerHTML = bookings.map(b => bookingRow(b)).join('')
  initNoShowHandlers(list)
  initChargeHandlers(list)
  initBookingDeleteHandlers(list)
}

// ===== BOOKING CARD (pending — with assign form) =====

function bookingCard(b, drivers) {
  const driverOptions = drivers.map(d =>
    `<option value="${escapeHtml(d.id)}" data-vehicle-id="${escapeHtml(d.vehicle_id || '')}">
      ${escapeHtml(d.name)}${d.vehicles ? ' — ' + escapeHtml(d.vehicles.name) : ''}
    </option>`
  ).join('')

  const noDrivers = drivers.length === 0

  return `
    <div class="rounded-xl border border-amber-500/20 bg-[#161C28] p-6" data-booking-id="${escapeHtml(b.id)}">
      <div class="flex flex-wrap items-start justify-between gap-4">

        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-400">PENDING</span>
            <span class="text-xs font-mono text-slate-400">${escapeHtml(b.booking_ref)}</span>
          </div>
          <p class="font-bold text-white">${escapeHtml(b.passenger_name)}</p>
          <p class="text-sm text-slate-400">${escapeHtml(b.passenger_email)} · ${escapeHtml(b.passenger_phone || '—')}</p>
          <p class="text-sm text-slate-300">
            <span class="material-symbols-outlined text-sm align-middle text-[#1152d4]">location_on</span>
            ${escapeHtml(b.pickup)} → ${escapeHtml(b.dropoff)}
          </p>
          <p class="text-sm text-slate-400">
            ${escapeHtml(b.trip_date || '—')} at ${escapeHtml(b.trip_time || '—')} ·
            ${escapeHtml(String(b.passenger_count || 1))} pax
          </p>
          ${b.special_instructions ? `<p class="text-xs text-slate-500 italic">"${escapeHtml(b.special_instructions)}"</p>` : ''}
        </div>

        <div class="flex shrink-0 flex-col gap-2 sm:items-end">
          ${noDrivers
            ? `<p class="text-xs text-amber-400">No active drivers with a vehicle assigned.<br>Add one in the Fleet tab first.</p>`
            : `<select class="assign-driver-select rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-200 focus:border-[#C5A059] focus:outline-none">
                <option value="">— Select driver —</option>
                ${driverOptions}
              </select>
              <button class="assign-btn flex items-center gap-2 rounded-lg bg-[#C5A059] px-5 py-2 text-sm font-bold text-[#0A0F16] hover:bg-white transition-colors disabled:opacity-50">
                <span class="material-symbols-outlined text-base">check</span>
                Assign Driver
              </button>
              <p class="assign-error hidden text-xs text-red-400"></p>`
          }
          <button class="booking-delete-btn flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors mt-1">
            <span class="material-symbols-outlined text-sm">delete</span> Remove
          </button>
        </div>

      </div>
    </div>
  `
}

// ===== BOOKING ROW (all bookings — compact) =====

function bookingRow(b) {
  const statusColor = {
    pending:   'text-amber-400 bg-amber-400/10',
    confirmed: 'text-emerald-400 bg-emerald-400/10',
    cancelled: 'text-red-400 bg-red-400/10',
    no_show:   'text-red-400 bg-red-400/10',
  }[b.status] || 'text-slate-400 bg-slate-400/10'

  const statusLabel = b.status === 'no_show' ? 'No-Show' : b.status

  // Show "Mark No-Show" only for confirmed bookings whose trip date is today or past
  const tripDateTime = b.trip_date ? new Date(b.trip_date + 'T' + (b.trip_time || '00:00')) : null
  const isPast       = tripDateTime && tripDateTime <= new Date()
  const showNoShow   = b.status === 'confirmed' && isPast

  // Show "Charge" for confirmed bookings with a saved card that haven't been charged yet
  const showCharge = b.status === 'confirmed' && b.stripe_payment_method_id && !b.charged_at

  return `
    <div class="rounded-xl border border-slate-800 bg-[#161C28] px-5 py-4 text-sm space-y-3"
         data-booking-id="${escapeHtml(b.id)}">
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-mono text-xs text-slate-400 w-28 shrink-0">${escapeHtml(b.booking_ref)}</span>
        <span class="font-medium text-white flex-1 min-w-40">${escapeHtml(b.passenger_name)}</span>
        <span class="text-slate-400 flex-1 min-w-40">${escapeHtml(b.pickup)} → ${escapeHtml(b.dropoff)}</span>
        <span class="text-slate-400 w-24 shrink-0">${escapeHtml(b.trip_date || '—')}</span>
        <span class="text-slate-300 w-32 shrink-0">${escapeHtml(b.drivers?.name || '—')}</span>
        <span class="rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusColor} w-20 text-center shrink-0">
          ${escapeHtml(statusLabel)}
        </span>
        ${b.charged_at ? `
          <span class="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
            <span class="material-symbols-outlined text-sm">check_circle</span>
            Charged
          </span>
        ` : ''}
        ${showNoShow ? `
          <button class="no-show-btn flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors shrink-0">
            <span class="material-symbols-outlined text-sm">person_off</span>
            No-Show
          </button>
        ` : ''}
        <button class="booking-delete-btn flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors shrink-0"
                title="Remove booking">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
      ${showCharge ? `
        <div class="flex items-center gap-2 pt-1 border-t border-slate-700/50">
          <span class="text-xs text-slate-500 shrink-0">Charge card on file:</span>
          <div class="relative shrink-0">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input
              type="number"
              min="1"
              step="0.01"
              ${b.fare_total ? `value="${b.fare_total}"` : 'placeholder="0.00"'}
              class="charge-amount-input w-28 rounded-lg border border-slate-700 bg-[#0A0F16] pl-6 pr-3 py-1.5 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
            />
          </div>
          <button class="charge-btn flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shrink-0">
            <span class="material-symbols-outlined text-sm">payments</span>
            Charge
          </button>
          <p class="charge-error hidden text-xs text-red-400"></p>
        </div>
      ` : ''}
    </div>
  `
}

// ===== NO-SHOW HANDLERS =====

function initNoShowHandlers(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.no-show-btn')
    if (!btn) return

    const row       = btn.closest('[data-booking-id]')
    const bookingId = row?.dataset.bookingId
    if (!bookingId) return

    if (!confirm('Mark this booking as a no-show? This cannot be undone.')) return

    btn.disabled = true
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>`

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', bookingId)

      if (error) throw new Error(error.message)
      await loadDashboard()
    } catch (err) {
      btn.disabled = false
      btn.innerHTML = `<span class="material-symbols-outlined text-sm">person_off</span> No-Show`
      alert('Failed to mark no-show: ' + err.message)
    }
  })
}

// ===== CHARGE HANDLERS =====

function initChargeHandlers(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.charge-btn')
    if (!btn) return

    const row       = btn.closest('[data-booking-id]')
    const bookingId = row?.dataset.bookingId
    const input     = row?.querySelector('.charge-amount-input')
    const errEl     = row?.querySelector('.charge-error')
    const amount    = parseFloat(input?.value || '0')

    if (!amount || amount <= 0) {
      showChargeError(errEl, 'Enter a valid amount.')
      return
    }

    if (!confirm(`Charge $${amount.toFixed(2)} to this customer's card on file?`)) return

    btn.disabled = true
    const originalHTML = btn.innerHTML
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Charging…`

    try {
      const amountCents = Math.round(amount * 100)
      const { data, error: fnErr } = await supabase.functions.invoke('charge-booking', {
        body: { bookingId, amountCents },
      })

      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message || 'Charge failed')

      await loadDashboard()
    } catch (err) {
      btn.disabled = false
      btn.innerHTML = originalHTML
      showChargeError(errEl, err.message)
    }
  })
}

function showChargeError(el, msg) {
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 5000)
}

// ===== ASSIGN HANDLERS =====

function initAssignHandlers(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.assign-btn')
    if (!btn) return

    const card      = btn.closest('[data-booking-id]')
    const bookingId = card?.dataset.bookingId
    const select    = card?.querySelector('.assign-driver-select')
    const errEl     = card?.querySelector('.assign-error')
    const driverId  = select?.value
    const vehicleId = select?.options[select.selectedIndex]?.dataset.vehicleId || null

    if (!driverId) {
      showAssignError(errEl, 'Please select a driver.')
      return
    }

    btn.disabled = true
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Assigning…`

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ driver_id: driverId, vehicle_id: vehicleId, status: 'confirmed' })
        .eq('id', bookingId)

      if (error) throw new Error('Assignment failed: ' + error.message)

      // Notify driver + client by email — fire-and-forget, never blocks the UI
      supabase.functions.invoke('notify-driver', {
        body: { bookingId, driverId },
      }).catch(() => {})
      supabase.functions.invoke('notify-client', {
        body: { bookingId, driverId, vehicleId },
      }).catch(() => {})

      await loadDashboard()
    } catch (err) {
      btn.disabled = false
      btn.innerHTML = `<span class="material-symbols-outlined text-base">check</span> Assign Driver`
      showAssignError(errEl, err.message)
    }
  })
}

function showAssignError(el, msg) {
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 5000)
}

// ===== BOOKING DELETE =====

function initBookingDeleteHandlers(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.booking-delete-btn')
    if (!btn) return

    const row       = btn.closest('[data-booking-id]')
    const bookingId = row?.dataset.bookingId
    const ref       = row?.querySelector('.font-mono')?.textContent?.trim() || 'this booking'
    if (!bookingId) return

    if (!confirm(`Remove ${ref}? This cannot be undone.`)) return

    btn.disabled = true
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
      if (error) throw new Error(error.message)
      row.remove()
    } catch (err) {
      btn.disabled = false
      alert('Failed to remove booking: ' + err.message)
    }
  })
}

// ===== REVIEWS =====

let reviewsLoaded = false

async function loadReviews() {
  if (reviewsLoaded) return
  reviewsLoaded = true

  const pendingList  = document.getElementById('reviews-pending-list')
  const pendingEmpty = document.getElementById('reviews-pending-empty')
  const approvedList = document.getElementById('reviews-approved-list')
  const approvedEmpty = document.getElementById('reviews-approved-empty')
  if (!pendingList || !approvedList) return

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    const pending  = (data || []).filter(r => r.status === 'pending')
    const approved = (data || []).filter(r => r.status === 'approved')

    // Pending
    if (pending.length === 0) {
      pendingEmpty?.classList.remove('hidden')
    } else {
      pendingList.innerHTML = pending.map(r => reviewModerateCard(r)).join('')
      initReviewHandlers(pendingList)
    }

    // Approved
    if (approved.length === 0) {
      approvedEmpty?.classList.remove('hidden')
    } else {
      approvedList.innerHTML = approved.map(r => reviewApprovedRow(r)).join('')
      initReviewHandlers(approvedList)
    }
  } catch (err) {
    pendingList.innerHTML = `<p class="text-sm text-red-400">${escapeHtml('Failed to load reviews: ' + err.message)}</p>`
  }
}

function reviewModerateCard(r) {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
  const date  = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return `
    <div class="rounded-xl border border-slate-700 bg-[#0A0F16] p-5 space-y-3" data-review-id="${escapeHtml(r.id)}">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-base text-[#C5A059]">${escapeHtml(stars)}</span>
            <span class="text-xs text-slate-500">${escapeHtml(date)}</span>
            ${r.booking_ref ? `<span class="font-mono text-xs text-slate-500">${escapeHtml(r.booking_ref)}</span>` : ''}
          </div>
          <p class="text-sm text-slate-300">"${escapeHtml(r.comment)}"</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="review-action-btn flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  data-action="approved">
            <span class="material-symbols-outlined text-sm">check</span>
            Approve
          </button>
          <button class="review-action-btn flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                  data-action="rejected">
            <span class="material-symbols-outlined text-sm">close</span>
            Reject
          </button>
        </div>
      </div>
    </div>
  `
}

function reviewApprovedRow(r) {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
  const date  = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return `
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0F16] px-5 py-3 text-sm"
         data-review-id="${escapeHtml(r.id)}">
      <span class="text-sm text-[#C5A059] shrink-0">${escapeHtml(stars)}</span>
      <span class="text-slate-300 flex-1 min-w-0 truncate">"${escapeHtml(r.comment)}"</span>
      <span class="text-xs text-slate-500 shrink-0">${escapeHtml(date)}</span>
      <button class="review-action-btn flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-colors shrink-0"
              data-action="rejected">
        <span class="material-symbols-outlined text-sm">close</span>
        Revoke
      </button>
    </div>
  `
}

function initReviewHandlers(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.review-action-btn')
    if (!btn) return

    const card     = btn.closest('[data-review-id]')
    const reviewId = card?.dataset.reviewId
    const action   = btn.dataset.action
    if (!reviewId || !action) return

    btn.disabled = true

    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: action })
        .eq('id', reviewId)

      if (error) throw new Error(error.message)

      // Reload reviews tab fresh
      reviewsLoaded = false
      document.getElementById('reviews-pending-list').innerHTML = ''
      document.getElementById('reviews-approved-list').innerHTML = ''
      document.getElementById('reviews-pending-empty')?.classList.add('hidden')
      document.getElementById('reviews-approved-empty')?.classList.add('hidden')
      await loadReviews()
    } catch (err) {
      btn.disabled = false
      alert('Failed to update review: ' + err.message)
    }
  })
}

// ===== FLEET TAB =====

let fleetLoaded         = false
let driverHandlersInit  = false

async function loadFleetTab() {
  if (fleetLoaded) return
  fleetLoaded = true

  try {
    const [vehicles, drivers] = await Promise.all([
      fetchAllVehicles(),
      fetchAllDrivers(),
    ])
    renderVehiclesList(vehicles)
    renderDriversList(drivers, vehicles)
    populateDriverVehicleDropdown(vehicles)
    initAddVehicleHandler()
    initAddDriverHandler()
    initVehicleToggleHandlers()
    if (!driverHandlersInit) { initDriverHandlers(); driverHandlersInit = true }
  } catch (err) {
    document.getElementById('tab-fleet')?.insertAdjacentHTML('afterbegin', `
      <div class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        Failed to load fleet data: ${escapeHtml(err.message)}
      </div>
    `)
  }
}

async function fetchAllVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, name, class, brand, seats, bags, image, badge, badge_color, is_active, description')
    .order('name')
  if (error) throw new Error('Failed to load vehicles: ' + error.message)
  return data || []
}

async function fetchAllDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('*, vehicles (id, name, class)')
    .order('name')
  if (error) throw new Error('Failed to load drivers: ' + error.message)
  return data || []
}

// ── Render vehicles list ──

function renderVehiclesList(vehicles) {
  const list  = document.getElementById('vehicles-list')
  const empty = document.getElementById('vehicles-empty')
  if (!list || !empty) return

  if (vehicles.length === 0) {
    empty.classList.remove('hidden')
    return
  }

  empty.classList.add('hidden')
  list.innerHTML = vehicles.map(v => vehicleRow(v)).join('')
}

function vehicleRow(v) {
  const activeClass = v.is_active
    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20'
    : 'text-slate-500 bg-slate-500/10 border-slate-600/20'
  const activeLabel = v.is_active ? 'Active' : 'Inactive'
  const toggleLabel = v.is_active ? 'Deactivate' : 'Activate'
  const toggleIcon  = v.is_active ? 'visibility_off' : 'visibility'

  return `
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-[#161C28] px-5 py-4 text-sm"
         data-vehicle-id="${escapeHtml(v.id)}">
      ${v.image ? `
        <img src="${escapeHtml(v.image)}" alt="${escapeHtml(v.name)}"
             class="h-12 w-20 rounded-lg object-cover shrink-0"
             loading="lazy"
             onerror="this.style.display='none'" />
      ` : ''}
      <div class="flex-1 min-w-40">
        <p class="font-bold text-white">${escapeHtml(v.name)}</p>
        <p class="text-xs text-slate-400">${escapeHtml(v.class || '—')} · ${v.seats || '—'} seats · ${v.bags || '—'} bags</p>
      </div>
      <span class="rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeClass} shrink-0">${activeLabel}</span>
      <button class="vehicle-toggle-btn flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-[#C5A059] hover:text-[#C5A059] transition-colors shrink-0"
              data-active="${v.is_active}">
        <span class="material-symbols-outlined text-sm">${toggleIcon}</span>
        ${toggleLabel}
      </button>
    </div>
  `
}

// ── Render drivers list ──

function renderDriversList(drivers, vehicles) {
  const list  = document.getElementById('drivers-list')
  const empty = document.getElementById('drivers-empty')
  if (!list || !empty) return

  if (drivers.length === 0) {
    empty.classList.remove('hidden')
    return
  }

  empty.classList.add('hidden')
  list.innerHTML = drivers.map(d => driverRow(d, vehicles)).join('')
}

function driverRow(d, vehicles) {
  const activeClass = d.is_active
    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20'
    : 'text-slate-500 bg-slate-500/10 border-slate-600/20'
  const activeLabel = d.is_active ? 'Active' : 'Inactive'
  const toggleLabel = d.is_active ? 'Deactivate' : 'Activate'

  const vehicleOptions = vehicles.map(v =>
    `<option value="${escapeHtml(v.id)}" ${d.vehicle_id === v.id ? 'selected' : ''}>${escapeHtml(v.name)}</option>`
  ).join('')

  return `
    <div class="rounded-xl border border-slate-800 bg-[#161C28] px-5 py-4 text-sm space-y-3"
         data-driver-id="${escapeHtml(d.id)}">

      <!-- Info row -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-40">
          <p class="font-bold text-white">${escapeHtml(d.name)}</p>
          <p class="text-xs text-slate-400">
            ${d.phone ? escapeHtml(d.phone) + ' · ' : ''}
            ${d.license_number ? 'Lic: ' + escapeHtml(d.license_number) : 'No license on file'}
          </p>
          ${d.email ? `<p class="text-xs text-slate-500">${escapeHtml(d.email)}</p>` : ''}
          ${d.notes ? `<p class="text-xs text-slate-500 italic mt-0.5">${escapeHtml(d.notes)}</p>` : ''}
        </div>
        <span class="rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeClass} shrink-0">${activeLabel}</span>
        <button class="driver-toggle-btn flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-[#C5A059] hover:text-[#C5A059] transition-colors shrink-0"
                data-active="${d.is_active}">${toggleLabel}</button>
        <button class="driver-edit-btn flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-[#1152d4] hover:text-[#1152d4] transition-colors shrink-0">
          <span class="material-symbols-outlined text-sm">edit</span> Edit
        </button>
        <button class="driver-delete-btn flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors shrink-0">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>

      <!-- Inline edit form (hidden by default) -->
      <div class="driver-edit-panel hidden border-t border-slate-700/50 pt-3 space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name <span class="text-red-400">*</span></label>
            <input class="driver-edit-name w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
                   type="text" value="${escapeHtml(d.name)}" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</label>
            <input class="driver-edit-phone w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
                   type="text" value="${escapeHtml(d.phone || '')}" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Email</label>
            <input class="driver-edit-email w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
                   type="email" value="${escapeHtml(d.email || '')}" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">License Number</label>
            <input class="driver-edit-license w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
                   type="text" value="${escapeHtml(d.license_number || '')}" />
          </div>
          <div class="space-y-1 sm:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Notes</label>
            <input class="driver-edit-notes w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
                   type="text" value="${escapeHtml(d.notes || '')}" />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button class="driver-save-btn flex items-center gap-1 rounded-lg bg-[#C5A059] px-5 py-2 text-xs font-bold text-[#0A0F16] hover:bg-white transition-colors disabled:opacity-50">
            <span class="material-symbols-outlined text-sm">save</span> Save Changes
          </button>
          <button class="driver-cancel-btn text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
          <p class="driver-edit-error hidden text-xs text-red-400"></p>
        </div>
      </div>

      <!-- Vehicle assign row -->
      <div class="flex items-center gap-2 pt-1 border-t border-slate-700/50">
        <span class="material-symbols-outlined text-sm text-slate-500">directions_car</span>
        <select class="driver-vehicle-select flex-1 rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-1.5 text-sm text-slate-200 focus:border-[#C5A059] focus:outline-none">
          <option value="">— Unassigned —</option>
          ${vehicleOptions}
        </select>
        <button class="driver-assign-btn flex items-center gap-1 rounded-lg bg-[#1152d4] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0d3fa8] transition-colors disabled:opacity-50 shrink-0">
          <span class="material-symbols-outlined text-sm">save</span> Save
        </button>
        <p class="driver-assign-error hidden text-xs text-red-400"></p>
      </div>
    </div>
  `
}

// ── Populate driver vehicle dropdown (add form) ──

function populateDriverVehicleDropdown(vehicles) {
  const select = document.getElementById('driver-vehicle')
  if (!select) return
  vehicles.filter(v => v.is_active).forEach(v => {
    const opt = document.createElement('option')
    opt.value = v.id
    opt.textContent = `${v.name} — ${v.class || v.brand || ''}`
    select.appendChild(opt)
  })
}

// ── Add vehicle handler ──

function initAddVehicleHandler() {
  const btn = document.getElementById('add-vehicle-btn')
  const msg = document.getElementById('add-vehicle-msg')
  if (!btn) return

  btn.addEventListener('click', async () => {
    const name        = document.getElementById('vehicle-name')?.value.trim()
    const brand       = document.getElementById('vehicle-brand')?.value.trim()
    const cls         = document.getElementById('vehicle-class')?.value.trim()
    const badge       = document.getElementById('vehicle-badge')?.value.trim()
    const seats       = parseInt(document.getElementById('vehicle-seats')?.value || '0')
    const bags        = parseInt(document.getElementById('vehicle-bags')?.value || '0')
    const image       = document.getElementById('vehicle-image')?.value.trim()
    const description = document.getElementById('vehicle-description')?.value.trim()

    if (!name) { showFleetMsg(msg, 'Vehicle name is required.', true); return }

    btn.disabled = true
    const orig = btn.innerHTML
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving…`

    try {
      const { error } = await supabase.from('vehicles').insert({
        name, brand, class: cls, badge,
        badge_color: 'bg-[#1152d4]',
        seats:  seats || null,
        bags:   bags  || null,
        image:  image || null,
        description: description || null,
        is_active: true,
        price_per_mile: 0,
        price_per_hour: 0,
        features:      [],
        feature_icons: [],
      })
      if (error) throw new Error(error.message)

      showFleetMsg(msg, 'Vehicle added.', false)
      ;['vehicle-name','vehicle-brand','vehicle-class','vehicle-badge',
        'vehicle-seats','vehicle-bags','vehicle-image','vehicle-description']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })

      // Reload fleet tab
      fleetLoaded = false
      document.getElementById('vehicles-list').innerHTML = ''
      document.getElementById('drivers-list').innerHTML = ''
      document.getElementById('vehicles-empty')?.classList.add('hidden')
      document.getElementById('drivers-empty')?.classList.add('hidden')
      await loadFleetTab()
    } catch (err) {
      showFleetMsg(msg, err.message, true)
    } finally {
      btn.disabled = false
      btn.innerHTML = orig
    }
  })
}

// ── Add driver handler ──

function initAddDriverHandler() {
  const btn = document.getElementById('add-driver-btn')
  const msg = document.getElementById('add-driver-msg')
  if (!btn) return

  btn.addEventListener('click', async () => {
    const name          = document.getElementById('driver-name')?.value.trim()
    const phone         = document.getElementById('driver-phone')?.value.trim()
    const licenseNumber = document.getElementById('driver-license')?.value.trim()
    const vehicleId     = document.getElementById('driver-vehicle')?.value || null
    const notes         = document.getElementById('driver-notes')?.value.trim()

    if (!name) { showFleetMsg(msg, 'Driver name is required.', true); return }

    btn.disabled = true
    const orig = btn.innerHTML
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Saving…`

    try {
      const email = document.getElementById('driver-email')?.value.trim() || null
      const { error } = await supabase.from('drivers').insert({
        name,
        phone:          phone || null,
        email:          email || null,
        license_number: licenseNumber || null,
        vehicle_id:     vehicleId || null,
        notes:          notes || null,
        is_active:      true,
      })
      if (error) throw new Error(error.message)

      showFleetMsg(msg, 'Driver added.', false)
      ;['driver-name','driver-phone','driver-license','driver-notes']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })
      const driverVehicle = document.getElementById('driver-vehicle')
      if (driverVehicle) driverVehicle.value = ''

      fleetLoaded = false
      document.getElementById('vehicles-list').innerHTML = ''
      document.getElementById('drivers-list').innerHTML = ''
      document.getElementById('vehicles-empty')?.classList.add('hidden')
      document.getElementById('drivers-empty')?.classList.add('hidden')
      await loadFleetTab()
    } catch (err) {
      showFleetMsg(msg, err.message, true)
    } finally {
      btn.disabled = false
      btn.innerHTML = orig
    }
  })
}

// ── Vehicle toggle (active/inactive) ──

function initVehicleToggleHandlers() {
  const list = document.getElementById('vehicles-list')
  if (!list) return

  list.addEventListener('click', async e => {
    const btn = e.target.closest('.vehicle-toggle-btn')
    if (!btn) return

    const row       = btn.closest('[data-vehicle-id]')
    const vehicleId = row?.dataset.vehicleId
    const isActive  = btn.dataset.active === 'true'
    if (!vehicleId) return

    btn.disabled = true
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: !isActive })
        .eq('id', vehicleId)
      if (error) throw new Error(error.message)

      fleetLoaded = false
      document.getElementById('vehicles-list').innerHTML = ''
      document.getElementById('drivers-list').innerHTML = ''
      document.getElementById('vehicles-empty')?.classList.add('hidden')
      document.getElementById('drivers-empty')?.classList.add('hidden')
      await loadFleetTab()
    } catch (err) {
      btn.disabled = false
      alert('Failed to update vehicle: ' + err.message)
    }
  })
}

// ── Driver toggle + vehicle reassign ──

function initDriverHandlers() {
  const list = document.getElementById('drivers-list')
  if (!list) return

  list.addEventListener('click', async e => {
    // Toggle edit panel
    const editBtn = e.target.closest('.driver-edit-btn')
    if (editBtn) {
      const panel = editBtn.closest('[data-driver-id]')?.querySelector('.driver-edit-panel')
      panel?.classList.toggle('hidden')
      return
    }

    // Cancel edit
    const cancelBtn = e.target.closest('.driver-cancel-btn')
    if (cancelBtn) {
      cancelBtn.closest('.driver-edit-panel')?.classList.add('hidden')
      return
    }

    // Save edits
    const saveBtn = e.target.closest('.driver-save-btn')
    if (saveBtn) {
      const row      = saveBtn.closest('[data-driver-id]')
      const driverId = row?.dataset.driverId
      const errEl    = row?.querySelector('.driver-edit-error')
      const name     = row?.querySelector('.driver-edit-name')?.value.trim()
      if (!name) {
        if (errEl) { errEl.textContent = 'Name is required.'; errEl.classList.remove('hidden') }
        return
      }
      saveBtn.disabled = true
      const orig = saveBtn.innerHTML
      saveBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Saving…`
      try {
        const { error } = await supabase.from('drivers').update({
          name,
          phone:          row?.querySelector('.driver-edit-phone')?.value.trim()   || null,
          email:          row?.querySelector('.driver-edit-email')?.value.trim()   || null,
          license_number: row?.querySelector('.driver-edit-license')?.value.trim() || null,
          notes:          row?.querySelector('.driver-edit-notes')?.value.trim()   || null,
        }).eq('id', driverId)
        if (error) throw new Error(error.message)
        fleetLoaded = false
        document.getElementById('drivers-list').innerHTML = ''
        document.getElementById('drivers-empty')?.classList.add('hidden')
        await loadFleetTab()
      } catch (err) {
        saveBtn.disabled = false
        saveBtn.innerHTML = orig
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden') }
      }
      return
    }

    // Delete driver
    const deleteBtn = e.target.closest('.driver-delete-btn')
    if (deleteBtn) {
      const row      = deleteBtn.closest('[data-driver-id]')
      const driverId = row?.dataset.driverId
      const name     = row?.querySelector('.font-bold.text-white')?.textContent || 'this driver'
      if (!confirm(`Remove ${name}? This cannot be undone.`)) return
      deleteBtn.disabled = true
      try {
        const { error } = await supabase.from('drivers').delete().eq('id', driverId)
        if (error) throw new Error(error.message)
        fleetLoaded = false
        document.getElementById('drivers-list').innerHTML = ''
        document.getElementById('drivers-empty')?.classList.add('hidden')
        await loadFleetTab()
      } catch (err) {
        deleteBtn.disabled = false
        alert('Failed to delete driver: ' + err.message)
      }
      return
    }

    // Toggle active
    const toggleBtn = e.target.closest('.driver-toggle-btn')
    if (toggleBtn) {
      const row      = toggleBtn.closest('[data-driver-id]')
      const driverId = row?.dataset.driverId
      const isActive = toggleBtn.dataset.active === 'true'
      if (!driverId) return

      toggleBtn.disabled = true
      try {
        const { error } = await supabase
          .from('drivers')
          .update({ is_active: !isActive })
          .eq('id', driverId)
        if (error) throw new Error(error.message)

        fleetLoaded = false
        document.getElementById('vehicles-list').innerHTML = ''
        document.getElementById('drivers-list').innerHTML = ''
        document.getElementById('vehicles-empty')?.classList.add('hidden')
        document.getElementById('drivers-empty')?.classList.add('hidden')
        await loadFleetTab()
      } catch (err) {
        toggleBtn.disabled = false
        alert('Failed to update driver: ' + err.message)
      }
    }

    // Save vehicle assignment
    const assignBtn = e.target.closest('.driver-assign-btn')
    if (assignBtn) {
      const row       = assignBtn.closest('[data-driver-id]')
      const driverId  = row?.dataset.driverId
      const select    = row?.querySelector('.driver-vehicle-select')
      const errEl     = row?.querySelector('.driver-assign-error')
      const vehicleId = select?.value || null
      if (!driverId) return

      assignBtn.disabled = true
      const orig = assignBtn.innerHTML
      assignBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>`

      try {
        const { error } = await supabase
          .from('drivers')
          .update({ vehicle_id: vehicleId })
          .eq('id', driverId)
        if (error) throw new Error(error.message)

        assignBtn.innerHTML = `<span class="material-symbols-outlined text-sm">check</span> Saved`
        setTimeout(() => {
          assignBtn.disabled = false
          assignBtn.innerHTML = orig
        }, 2000)
      } catch (err) {
        assignBtn.disabled = false
        assignBtn.innerHTML = orig
        if (errEl) {
          errEl.textContent = err.message
          errEl.classList.remove('hidden')
          setTimeout(() => errEl.classList.add('hidden'), 4000)
        }
      }
    }
  })
}

function showFleetMsg(el, text, isError) {
  if (!el) return
  el.textContent = text
  el.className = `text-xs ${isError ? 'text-red-400' : 'text-emerald-400'}`
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 4000)
}

// ===== USERS TAB =====

let usersLoaded = false

async function loadUsersTab() {
  if (usersLoaded) return
  usersLoaded = true

  const listEl    = document.getElementById('users-list')
  const emptyEl   = document.getElementById('users-empty')
  const loadingEl = document.getElementById('users-loading')
  const errorEl   = document.getElementById('users-error')

  loadingEl?.classList.remove('hidden')

  try {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'list' },
    })
    if (error || data?.error) throw new Error(data?.error || error?.message)

    loadingEl?.classList.add('hidden')

    const users = Array.isArray(data) ? data : (data?.users ?? [])
    if (users.length === 0) {
      emptyEl?.classList.remove('hidden')
      return
    }

    listEl.innerHTML = users.map(u => userRow(u)).join('')
    initUserHandlers()
  } catch (err) {
    loadingEl?.classList.add('hidden')
    if (errorEl) {
      errorEl.textContent = 'Failed to load users: ' + err.message
      errorEl.classList.remove('hidden')
    }
  }
}

function userRow(u) {
  const isAdmin   = u.app_metadata?.is_admin === true
  const fullName  = u.user_metadata?.full_name || '—'
  const joined    = u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const adminBadge = isAdmin
    ? `<span class="rounded-full border border-[#C5A059]/40 bg-[#C5A059]/10 px-2.5 py-0.5 text-xs font-bold text-[#C5A059]">Admin</span>`
    : `<span class="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">Client</span>`

  return `
    <div class="rounded-xl border border-slate-800 bg-[#161C28] px-5 py-4 text-sm space-y-3"
         data-user-id="${escapeHtml(u.id)}"
         data-is-admin="${isAdmin}">

      <!-- Info row -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-40">
          <p class="font-bold text-white">${escapeHtml(fullName)}</p>
          <p class="text-xs text-slate-400">${escapeHtml(u.email || '—')} · Joined ${joined}</p>
        </div>
        ${adminBadge}
        <button class="user-edit-btn flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-[#1152d4] hover:text-[#1152d4] transition-colors shrink-0">
          <span class="material-symbols-outlined text-sm">edit</span> Edit
        </button>
        <button class="user-delete-btn flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors shrink-0">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>

      <!-- Inline edit form (hidden by default) -->
      <div class="user-edit-panel hidden border-t border-slate-700/50 pt-3 space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
            <input class="user-edit-name w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
                   type="text" value="${escapeHtml(u.user_metadata?.full_name || '')}" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Email</label>
            <input class="user-edit-email w-full rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-100 focus:border-[#C5A059] focus:outline-none"
                   type="email" value="${escapeHtml(u.email || '')}" />
          </div>
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input class="user-edit-admin" type="checkbox" ${isAdmin ? 'checked' : ''}
                 class="rounded border-slate-600" />
          <span class="text-xs text-slate-300">Admin access</span>
        </label>
        <div class="flex items-center gap-3">
          <button class="user-save-btn flex items-center gap-1 rounded-lg bg-[#C5A059] px-5 py-2 text-xs font-bold text-[#0A0F16] hover:bg-white transition-colors disabled:opacity-50">
            <span class="material-symbols-outlined text-sm">save</span> Save Changes
          </button>
          <button class="user-cancel-btn text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
          <p class="user-edit-error hidden text-xs text-red-400"></p>
        </div>
      </div>
    </div>
  `
}

function initUserHandlers() {
  const list = document.getElementById('users-list')
  if (!list) return

  list.addEventListener('click', async e => {
    // Toggle edit panel
    const editBtn = e.target.closest('.user-edit-btn')
    if (editBtn) {
      editBtn.closest('[data-user-id]')?.querySelector('.user-edit-panel')?.classList.toggle('hidden')
      return
    }

    // Cancel edit
    const cancelBtn = e.target.closest('.user-cancel-btn')
    if (cancelBtn) {
      cancelBtn.closest('.user-edit-panel')?.classList.add('hidden')
      return
    }

    // Save edits
    const saveBtn = e.target.closest('.user-save-btn')
    if (saveBtn) {
      const row    = saveBtn.closest('[data-user-id]')
      const userId = row?.dataset.userId
      const errEl  = row?.querySelector('.user-edit-error')
      const fullName = row?.querySelector('.user-edit-name')?.value.trim()
      const email    = row?.querySelector('.user-edit-email')?.value.trim()
      const isAdmin  = row?.querySelector('.user-edit-admin')?.checked ?? false

      saveBtn.disabled = true
      const orig = saveBtn.innerHTML
      saveBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Saving…`

      try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: { action: 'update', userId, fullName, email, isAdmin },
        })
        if (error || data?.error) throw new Error(data?.error || error?.message)
        // Reload tab to reflect changes
        usersLoaded = false
        document.getElementById('users-list').innerHTML = ''
        await loadUsersTab()
      } catch (err) {
        saveBtn.disabled = false
        saveBtn.innerHTML = orig
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden') }
      }
      return
    }

    // Delete user
    const deleteBtn = e.target.closest('.user-delete-btn')
    if (deleteBtn) {
      const row    = deleteBtn.closest('[data-user-id]')
      const userId = row?.dataset.userId
      const name   = row?.querySelector('.font-bold.text-white')?.textContent?.trim() || 'this user'
      if (!confirm(`Delete ${name}? This will permanently remove their account and cannot be undone.`)) return

      deleteBtn.disabled = true
      try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: { action: 'delete', userId },
        })
        if (error || data?.error) throw new Error(data?.error || error?.message)
        row.remove()
      } catch (err) {
        deleteBtn.disabled = false
        alert('Failed to delete user: ' + err.message)
      }
    }
  })
}

// ===== HELPERS =====

function showLoading(isLoading) {
  document.getElementById('admin-loading')?.classList.toggle('hidden', !isLoading)
  document.getElementById('admin-content')?.classList.toggle('hidden', isLoading)
}
