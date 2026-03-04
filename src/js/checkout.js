import { getSearchParams, clearBookingSession } from './utils.js'
import { getUser } from './auth.js'
import { saveBooking } from './bookings.js'
import { t, applyTranslations } from './i18n.js'

export async function initCheckout() {
  // 1. Auth guard
  const user = await getUser()
  if (!user) {
    sessionStorage.setItem('ld_return_to', '/pages/checkout.html')
    window.location.href = '/pages/login.html'
    return
  }

  // 2. Validate search params
  const search = getSearchParams()
  if (!search.pickup || !search.dropoff || !search.date || !search.time) {
    window.location.href = '/'
    return
  }

  populateRouteInfo(search)
  prefillPassengerInfo(user)
  initConfirmButton(search)
  applyTranslations()
}

// ===== POPULATE ROUTE =====
function populateRouteInfo(search) {
  const pickupEl  = document.getElementById('checkout-pickup')
  const dropoffEl = document.getElementById('checkout-dropoff')
  if (pickupEl)  pickupEl.textContent  = search.pickup
  if (dropoffEl) dropoffEl.textContent = search.dropoff
}

// ===== PREFILL FROM AUTH =====
function prefillPassengerInfo(user) {
  const emailEl = document.getElementById('passenger-email')
  const nameEl  = document.getElementById('passenger-name')
  if (emailEl && user.email) emailEl.value = user.email
  if (nameEl && user.user_metadata?.full_name) nameEl.value = user.user_metadata.full_name
}

// ===== CONFIRM BUTTON =====
function initConfirmButton(search) {
  const btn   = document.getElementById('confirm-btn')
  const modal = document.getElementById('confirm-modal')
  const refEl = document.getElementById('booking-ref')

  if (!btn || !modal) return

  btn.addEventListener('click', async () => {
    const passengerName  = document.getElementById('passenger-name')?.value.trim()
    const passengerEmail = document.getElementById('passenger-email')?.value.trim()
    const passengerPhone = document.getElementById('passenger-phone')?.value.trim()
    const passengerCount = Number(document.getElementById('passenger-count')?.value || 1)

    if (!passengerName || !passengerEmail || !passengerPhone) {
      showValidationError(t('checkout.err_fields'))
      return
    }
    if (!passengerEmail.includes('@')) {
      showValidationError(t('checkout.err_email'))
      return
    }

    const preferences = {
      champagne:      document.getElementById('pref-champagne')?.checked ?? false,
      customPlaylist: document.getElementById('pref-playlist')?.checked ?? false,
      dailyPress:     document.getElementById('pref-daily-press')?.checked ?? false,
      premiumWiFi:    document.getElementById('pref-wifi')?.checked ?? false,
    }
    const specialInstructions = document.getElementById('special-instructions')?.value.trim() || ''

    btn.disabled = true
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> ${t('checkout.saving')}`

    try {
      const booking = await saveBooking({
        vehicle_id: null, search,
        passengerName, passengerEmail, passengerPhone, passengerCount,
        preferences, specialInstructions,
      })

      if (refEl) refEl.textContent = booking.booking_ref
      modal.classList.remove('hidden')
      modal.classList.add('flex')
      // Apply translations so the modal text is in the correct language
      applyTranslations()
      clearBookingSession()
    } catch (err) {
      showValidationError(err.message || t('common.error_generic'))
    } finally {
      btn.disabled = false
      btn.innerHTML = `<span class="material-symbols-outlined text-xl">lock</span> ${t('checkout.complete_btn_label')}`
    }
  })

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.add('hidden')
      modal.classList.remove('flex')
    }
  })
}

function showValidationError(msg) {
  const existing = document.getElementById('checkout-error')
  if (existing) existing.remove()

  const err = document.createElement('p')
  err.id = 'checkout-error'
  err.className = 'mt-3 text-sm text-red-400 text-center'
  err.textContent = msg

  document.getElementById('confirm-btn')?.insertAdjacentElement('afterend', err)
  setTimeout(() => err.remove(), 5000)
}
