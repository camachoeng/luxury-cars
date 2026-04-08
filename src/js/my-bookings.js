import { escapeHtml, formatPrice } from './utils.js'
import { getUser } from './auth.js'
import { getUserBookings } from './bookings.js'
import { supabase } from './supabase.js'
import { t, applyTranslations } from './i18n.js'

// Cancellation rules fetched once on load
let cancelSettings = { flatFee: 20, latePct: 50, windowHrs: 6 }

export async function initMyBookings() {
  const user = await getUser()
  if (!user) {
    sessionStorage.setItem('ld_return_to', `${import.meta.env.BASE_URL}pages/my-bookings.html`)
    window.location.href = `${import.meta.env.BASE_URL}pages/login.html`
    return
  }

  const loadingEl   = document.getElementById('bookings-loading')
  const emptyEl     = document.getElementById('bookings-empty')
  const containerEl = document.getElementById('bookings-list')

  // Fetch cancellation settings in parallel with bookings
  try {
    const [bookings] = await Promise.all([
      getUserBookings(),
      fetchCancelSettings(),
    ])

    loadingEl?.classList.add('hidden')

    if (bookings.length === 0) {
      emptyEl?.classList.remove('hidden')
      applyTranslations()
      return
    }

    containerEl.innerHTML = bookings.map(b => renderBookingCard(b)).join('')
    initCancelHandlers(containerEl)
  } catch (err) {
    loadingEl?.classList.add('hidden')
    if (containerEl) {
      containerEl.innerHTML = `
        <div class="rounded-xl border border-red-900/40 bg-red-900/10 p-6 text-center">
          <span class="material-symbols-outlined text-3xl text-red-400">error</span>
          <p class="mt-2 text-sm text-red-400">${escapeHtml(err.message)}</p>
        </div>
      `
    }
  }
}

async function fetchCancelSettings() {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['cancellation_fee', 'late_cancel_percent', 'late_cancel_window_hours'])
    data?.forEach(row => {
      if (row.key === 'cancellation_fee')         cancelSettings.flatFee    = parseFloat(row.value) || 20
      if (row.key === 'late_cancel_percent')      cancelSettings.latePct    = parseFloat(row.value) || 50
      if (row.key === 'late_cancel_window_hours') cancelSettings.windowHrs  = parseFloat(row.value) || 6
    })
  } catch { /* use defaults */ }
}

function computeCancelFee(b) {
  const fare        = parseFloat(b.fare_total) || 0
  const tripDt      = new Date(b.trip_date + 'T' + (b.trip_time || '00:00'))
  const hoursToTrip = (tripDt - new Date()) / (1000 * 60 * 60)
  if (hoursToTrip <= cancelSettings.windowHrs) {
    return { fee: parseFloat((fare * cancelSettings.latePct / 100).toFixed(2)), isLate: true }
  }
  return { fee: cancelSettings.flatFee, isLate: false }
}

function isCancellable(b) {
  if (!['pending', 'confirmed'].includes(b.status)) return false
  const tripDt = new Date(b.trip_date + 'T' + (b.trip_time || '00:00'))
  return tripDt > new Date()
}

function renderBookingCard(b) {
  const statusColors = {
    confirmed: 'bg-green-900/30 text-green-400',
    completed: 'bg-slate-700/50 text-slate-300',
    cancelled: 'bg-red-900/30 text-red-400',
    no_show:   'bg-red-900/30 text-red-400',
    pending:   'bg-amber-900/30 text-amber-400',
  }
  const statusClass = statusColors[b.status] || statusColors.confirmed

  const statusKeyMap = {
    confirmed: 'bookings.status_confirmed',
    completed: 'bookings.status_confirmed',
    cancelled: 'bookings.status_cancelled',
    no_show:   'bookings.status_no_show',
    pending:   'bookings.status_pending',
  }
  const statusLabel = t(statusKeyMap[b.status] || 'bookings.status_confirmed')

  const tripDate = b.trip_date
    ? new Date(b.trip_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const cancellable = isCancellable(b)
  const { fee, isLate } = cancellable ? computeCancelFee(b) : { fee: 0, isLate: false }
  const feeNote = isLate
    ? `A ${cancelSettings.latePct}% late cancellation fee of $${fee.toFixed(2)} applies.`
    : `A $${fee.toFixed(2)} admin fee applies.`

  const cancelFeeDisplay = b.cancel_fee != null
    ? `<p class="mt-1 text-xs text-red-400">Fee charged: $${parseFloat(b.cancel_fee).toFixed(2)}</p>`
    : ''

  return `
    <div class="rounded-xl border border-slate-800 bg-[#161C28] p-6 shadow-lg transition-all hover:border-slate-700"
         data-booking-id="${escapeHtml(b.id)}"
         data-fee-note="${escapeHtml(feeNote)}"
         data-cancel-fee="${fee}">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

        <!-- Vehicle -->
        <div class="flex items-center gap-4">
          <div class="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800 flex items-center justify-center">
            ${b.vehicles?.image
              ? `<img src="${escapeHtml(b.vehicles.image)}"
                      alt="${escapeHtml(b.vehicles.name || 'Vehicle')}"
                      class="h-full w-full object-cover"
                      loading="lazy" />`
              : `<span class="material-symbols-outlined text-3xl text-slate-600">directions_car</span>`
            }
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-[#C5A059]">${escapeHtml(b.vehicles?.class || '')}</p>
            <h3 class="font-bold text-white">${escapeHtml(b.vehicles?.name || 'Vehicle TBD')}</h3>
            <p class="font-mono text-xs text-slate-500">${escapeHtml(b.booking_ref)}</p>
          </div>
        </div>

        <!-- Route -->
        <div class="text-sm">
          <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">${t('bookings.col_route')}</p>
          <p class="mt-1 font-semibold text-white">${escapeHtml(b.pickup)}</p>
          <p class="text-xs text-slate-500">→ ${escapeHtml(b.dropoff)}</p>
        </div>

        <!-- Date -->
        <div class="text-sm">
          <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">${t('bookings.col_date')}</p>
          <p class="mt-1 font-bold text-white">${escapeHtml(tripDate)}</p>
          <p class="text-xs text-slate-400">${escapeHtml(b.trip_time || '')}</p>
        </div>

        <!-- Total & Status -->
        <div class="text-right">
          <p class="text-2xl font-black text-[#1152d4]">${formatPrice(b.fare_total)}</p>
          <span class="mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass}">
            ${escapeHtml(statusLabel)}
          </span>
          ${cancelFeeDisplay}
          ${cancellable ? `
            <button class="cancel-booking-btn mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors ml-auto">
              <span class="material-symbols-outlined text-sm">cancel</span>
              Cancel booking
            </button>
          ` : ''}
        </div>

      </div>

      <!-- Inline confirmation (hidden by default) -->
      <div class="cancel-confirm hidden mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p class="text-sm font-semibold text-red-300">Cancel this booking?</p>
        <p class="cancel-fee-note mt-1 text-xs text-slate-400">${escapeHtml(feeNote)}</p>
        <div class="mt-3 flex gap-2">
          <button class="cancel-confirm-btn rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-50">
            Yes, cancel
          </button>
          <button class="cancel-dismiss-btn rounded-lg border border-slate-700 px-4 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            Keep booking
          </button>
        </div>
        <p class="cancel-error hidden mt-2 text-xs text-red-400"></p>
      </div>
    </div>
  `
}

function initCancelHandlers(container) {
  container.addEventListener('click', async e => {
    const card = e.target.closest('[data-booking-id]')
    if (!card) return

    // Show confirmation panel
    if (e.target.closest('.cancel-booking-btn')) {
      card.querySelector('.cancel-confirm')?.classList.remove('hidden')
      card.querySelector('.cancel-booking-btn')?.classList.add('hidden')
      return
    }

    // Dismiss
    if (e.target.closest('.cancel-dismiss-btn')) {
      card.querySelector('.cancel-confirm')?.classList.add('hidden')
      card.querySelector('.cancel-booking-btn')?.classList.remove('hidden')
      return
    }

    // Confirm cancellation
    if (e.target.closest('.cancel-confirm-btn')) {
      const btn     = card.querySelector('.cancel-confirm-btn')
      const errEl   = card.querySelector('.cancel-error')
      const bookingId = card.dataset.bookingId

      btn.disabled = true
      btn.textContent = 'Cancelling…'
      errEl?.classList.add('hidden')

      try {
        const { data, error } = await supabase.functions.invoke('cancel-booking', {
          body: { bookingId },
        })

        if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Cancellation failed')

        // Replace card content with a cancelled confirmation
        card.innerHTML = `
          <div class="flex items-center gap-3 text-sm">
            <span class="material-symbols-outlined text-red-400">cancel</span>
            <div>
              <p class="font-semibold text-white">Booking cancelled</p>
              <p class="text-xs text-slate-400">
                A fee of <span class="text-red-400 font-semibold">$${parseFloat(data.cancelFee).toFixed(2)}</span>
                will be charged to your card on file.
              </p>
            </div>
          </div>
        `
      } catch (err) {
        btn.disabled = false
        btn.textContent = 'Yes, cancel'
        if (errEl) {
          errEl.textContent = err.message
          errEl.classList.remove('hidden')
        }
      }
    }
  })
}
