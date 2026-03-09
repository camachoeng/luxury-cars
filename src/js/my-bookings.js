import { escapeHtml, formatPrice } from './utils.js'
import { getUser } from './auth.js'
import { getUserBookings } from './bookings.js'
import { t, applyTranslations } from './i18n.js'

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

  try {
    const bookings = await getUserBookings()

    loadingEl?.classList.add('hidden')

    if (bookings.length === 0) {
      emptyEl?.classList.remove('hidden')
      applyTranslations()
      return
    }

    containerEl.innerHTML = bookings.map(b => renderBookingCard(b)).join('')
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

  return `
    <div class="rounded-xl border border-slate-800 bg-[#161C28] p-6 shadow-lg transition-all hover:border-slate-700">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

        <!-- Vehicle -->
        <div class="flex items-center gap-4">
          <div class="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
            <img src="${escapeHtml(b.vehicles?.image || '')}"
                 alt="${escapeHtml(b.vehicles?.name || 'Vehicle')}"
                 class="h-full w-full object-cover"
                 loading="lazy" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-[#C5A059]">${escapeHtml(b.vehicles?.class || '')}</p>
            <h3 class="font-bold text-white">${escapeHtml(b.vehicles?.name || 'Vehicle')}</h3>
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
        </div>

      </div>
    </div>
  `
}
