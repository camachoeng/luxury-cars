// ===== YMV Limo — Admin Dashboard =====
// Admin-only page for assigning vehicles to pending bookings and editing settings.
//
// SUPABASE SETUP REQUIRED:
//   1. Set is_admin: true in user_metadata for staff accounts (SQL Editor):
//      UPDATE auth.users
//        SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
//        WHERE email = 'your-admin@email.com';
//
//   2. RLS policies on bookings table:
//      CREATE POLICY "Admins can read all bookings"
//        ON bookings FOR SELECT TO authenticated
//        USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
//      CREATE POLICY "Admins can update bookings"
//        ON bookings FOR UPDATE TO authenticated
//        USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
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
//        USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
//      CREATE POLICY "Admins can update settings"
//        ON admin_settings FOR UPDATE TO authenticated
//        USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
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

  if (!user.user_metadata?.is_admin) {
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

  // Lazy-load reviews on first click
  if (tabName === 'reviews') loadReviews()
}

// ===== DASHBOARD LOAD =====

async function loadDashboard() {
  showLoading(true)

  try {
    const [bookings, vehicles, settings] = await Promise.all([
      fetchAllBookings(),
      fetchVehicles(),
      fetchSettings(),
    ])

    renderStats(bookings)
    renderPendingBookings(bookings.filter(b => b.status === 'pending'), vehicles)
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
    .select('*, vehicles (id, name, class)')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to load bookings: ' + error.message)
  return data || []
}

async function fetchVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, name, class')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error('Failed to load vehicles: ' + error.message)
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

function renderPendingBookings(pending, vehicles) {
  const list  = document.getElementById('pending-list')
  const empty = document.getElementById('pending-empty')
  if (!list || !empty) return

  if (pending.length === 0) {
    list.innerHTML = ''
    empty.classList.remove('hidden')
    return
  }

  empty.classList.add('hidden')
  list.innerHTML = pending.map(b => bookingCard(b, vehicles)).join('')
  initAssignHandlers(list)
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
}

// ===== BOOKING CARD (pending — with assign form) =====

function bookingCard(b, vehicles) {
  const vehicleOptions = vehicles.map(v =>
    `<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)} — ${escapeHtml(v.class)}</option>`
  ).join('')

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
          <select class="assign-vehicle-select rounded-lg border border-slate-700 bg-[#0A0F16] px-3 py-2 text-sm text-slate-200 focus:border-[#C5A059] focus:outline-none">
            <option value="">— Select vehicle —</option>
            ${vehicleOptions}
          </select>
          <button class="assign-btn flex items-center gap-2 rounded-lg bg-[#C5A059] px-5 py-2 text-sm font-bold text-[#0A0F16] hover:bg-white transition-colors disabled:opacity-50">
            <span class="material-symbols-outlined text-base">check</span>
            Assign Vehicle
          </button>
          <p class="assign-error hidden text-xs text-red-400"></p>
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

  return `
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-[#161C28] px-5 py-4 text-sm"
         data-booking-id="${escapeHtml(b.id)}">
      <span class="font-mono text-xs text-slate-400 w-28 shrink-0">${escapeHtml(b.booking_ref)}</span>
      <span class="font-medium text-white flex-1 min-w-40">${escapeHtml(b.passenger_name)}</span>
      <span class="text-slate-400 flex-1 min-w-40">${escapeHtml(b.pickup)} → ${escapeHtml(b.dropoff)}</span>
      <span class="text-slate-400 w-24 shrink-0">${escapeHtml(b.trip_date || '—')}</span>
      <span class="text-slate-300 w-32 shrink-0">${escapeHtml(b.vehicles?.name || '—')}</span>
      <span class="rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusColor} w-20 text-center shrink-0">
        ${escapeHtml(statusLabel)}
      </span>
      ${showNoShow ? `
        <button class="no-show-btn flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors shrink-0">
          <span class="material-symbols-outlined text-sm">person_off</span>
          No-Show
        </button>
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

// ===== ASSIGN HANDLERS =====

function initAssignHandlers(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.assign-btn')
    if (!btn) return

    const card      = btn.closest('[data-booking-id]')
    const bookingId = card?.dataset.bookingId
    const select    = card?.querySelector('.assign-vehicle-select')
    const errEl     = card?.querySelector('.assign-error')
    const vehicleId = select?.value

    if (!vehicleId) {
      showAssignError(errEl, 'Please select a vehicle.')
      return
    }

    btn.disabled = true
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Assigning…`

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ vehicle_id: vehicleId, status: 'confirmed' })
        .eq('id', bookingId)

      if (error) throw new Error('Assignment failed: ' + error.message)
      await loadDashboard()
    } catch (err) {
      btn.disabled = false
      btn.innerHTML = `<span class="material-symbols-outlined text-base">check</span> Assign Vehicle`
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

// ===== HELPERS =====

function showLoading(isLoading) {
  document.getElementById('admin-loading')?.classList.toggle('hidden', !isLoading)
  document.getElementById('admin-content')?.classList.toggle('hidden', isLoading)
}
