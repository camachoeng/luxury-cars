import { escapeHtml, formatPrice, getSearchParams, setBookingData, clearBookingSession } from './utils.js'
import { getUser } from './auth.js'
import { assignVehicle, calculateFare, saveBooking } from './bookings.js'

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
  showAssignmentSpinner()

  let vehicle, fare
  try {
    vehicle = await assignVehicle(search.date, search.time)
    if (!vehicle) {
      showNoVehicleError()
      return
    }
    fare = calculateFare(vehicle)
    setBookingData({ car: vehicle, search, fare })
  } catch (err) {
    showAssignmentError(err.message)
    return
  }

  populateCarInfo(vehicle)
  populateFareBreakdown(fare)
  prefillPassengerInfo(user)
  initConfirmButton(vehicle, search, fare)
}

// ===== POPULATE ROUTE =====
function populateRouteInfo(search) {
  const pickupEl  = document.getElementById('checkout-pickup')
  const dropoffEl = document.getElementById('checkout-dropoff')
  if (pickupEl)  pickupEl.textContent  = search.pickup
  if (dropoffEl) dropoffEl.textContent = search.dropoff
}

// ===== POPULATE CAR =====
function populateCarInfo(vehicle) {
  const imgEl    = document.getElementById('checkout-car-image')
  const nameEl   = document.getElementById('checkout-car-name')
  const classEl  = document.getElementById('checkout-car-class')
  const detailEl = document.getElementById('checkout-car-detail')

  if (imgEl)    imgEl.style.backgroundImage = `url("${escapeHtml(vehicle.image)}")`
  if (nameEl)   nameEl.textContent  = vehicle.name
  if (classEl)  classEl.textContent = vehicle.class || 'Premium Class'
  if (detailEl) detailEl.textContent = vehicle.detail || ''
}

// ===== POPULATE FARE =====
function populateFareBreakdown(fare) {
  const set = (id, val) => {
    const el = document.getElementById(id)
    if (el) el.textContent = formatPrice(val)
  }
  set('fare-base',      fare.baseFare)
  set('fare-distance',  fare.distanceSurcharge)
  set('fare-amenities', fare.amenities)
  set('fare-gratuity',  fare.gratuity)
  set('fare-tax',       fare.taxes)
  set('fare-total',     fare.total)
}

// ===== PREFILL FROM AUTH =====
function prefillPassengerInfo(user) {
  const emailEl = document.getElementById('passenger-email')
  const nameEl  = document.getElementById('passenger-name')
  if (emailEl && user.email) emailEl.value = user.email
  if (nameEl && user.user_metadata?.full_name) nameEl.value = user.user_metadata.full_name
}

// ===== ASSIGNMENT STATES =====
function showAssignmentSpinner() {
  const panel = document.querySelector('.sticky.top-24')
  if (!panel) return
  panel.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-4 py-16 px-6">
      <div class="skeleton h-16 w-16 rounded-full"></div>
      <p class="text-sm text-slate-400">Finding your perfect vehicle...</p>
    </div>
  `
}

function showNoVehicleError() {
  const panel = document.querySelector('.sticky.top-24')
  if (!panel) return
  panel.innerHTML = `
    <div class="flex flex-col items-center gap-4 p-8 text-center">
      <span class="material-symbols-outlined text-5xl text-red-400">car_crash</span>
      <h3 class="font-bold text-white">No vehicles available</h3>
      <p class="text-sm text-slate-400">All vehicles are booked for that slot. Please choose a different date or time.</p>
      <a href="/" class="rounded-lg bg-[#1152d4] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0d3fa8]">Change Journey Details</a>
    </div>
  `
}

function showAssignmentError(msg) {
  const panel = document.querySelector('.sticky.top-24')
  if (!panel) return
  panel.innerHTML = `
    <div class="flex flex-col items-center gap-4 p-8 text-center">
      <span class="material-symbols-outlined text-5xl text-red-400">error</span>
      <h3 class="font-bold text-white">Something went wrong</h3>
      <p class="text-sm text-slate-400">${escapeHtml(msg)}</p>
      <a href="/" class="rounded-lg bg-[#1152d4] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0d3fa8]">Try Again</a>
    </div>
  `
}

// ===== CONFIRM BUTTON =====
function initConfirmButton(vehicle, search, fare) {
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
      showValidationError('Please fill in all required passenger fields.')
      return
    }
    if (!passengerEmail.includes('@')) {
      showValidationError('Please enter a valid email address.')
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
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> Saving...'

    try {
      const booking = await saveBooking({
        vehicle, search, fare,
        passengerName, passengerEmail, passengerPhone, passengerCount,
        preferences, specialInstructions,
      })

      if (refEl) refEl.textContent = booking.booking_ref
      modal.classList.remove('hidden')
      modal.classList.add('flex')
      clearBookingSession()
    } catch (err) {
      showValidationError(err.message || 'Booking failed. Please try again.')
    } finally {
      btn.disabled = false
      btn.innerHTML = '<span class="material-symbols-outlined text-xl">lock</span> Complete Reservation'
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
