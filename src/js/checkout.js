import { escapeHtml, formatPrice, generateBookingRef, getBookingData } from './utils.js'

export async function initCheckout() {
  const booking = getBookingData()

  populateRouteInfo(booking)
  populateCarInfo(booking)
  populateFareBreakdown(booking)
  initConfirmButton()
}

// ===== POPULATE ROUTE =====
function populateRouteInfo(booking) {
  const search = booking.search || {}

  const pickupEl = document.getElementById('checkout-pickup')
  const dropoffEl = document.getElementById('checkout-dropoff')
  const durationEl = document.getElementById('checkout-duration')

  if (pickupEl && search.pickup) pickupEl.textContent = search.pickup
  if (dropoffEl && search.dropoff) dropoffEl.textContent = search.dropoff
  if (durationEl) durationEl.textContent = '3h 45m' // TODO: calculate from route API
}

// ===== POPULATE CAR =====
function populateCarInfo(booking) {
  const car = booking.car
  if (!car) return

  const imgEl = document.getElementById('checkout-car-image')
  const nameEl = document.getElementById('checkout-car-name')
  const classEl = document.getElementById('checkout-car-class')
  const detailEl = document.getElementById('checkout-car-detail')

  if (imgEl) imgEl.style.backgroundImage = `url("${escapeHtml(car.image)}")`
  if (nameEl) nameEl.textContent = car.name
  if (classEl) classEl.textContent = car.class || 'Premium Class'
  if (detailEl) detailEl.textContent = car.detail || ''
}

// ===== POPULATE FARE =====
function populateFareBreakdown(booking) {
  const fare = booking.fare
  if (!fare) return

  const set = (id, val) => {
    const el = document.getElementById(id)
    if (el) el.textContent = formatPrice(val)
  }

  set('fare-base', fare.baseFare)
  set('fare-distance', fare.distanceSurcharge)
  set('fare-amenities', fare.amenities)
  set('fare-gratuity', fare.gratuity)
  set('fare-tax', fare.taxes)
  set('fare-total', fare.total)
}

// ===== CONFIRM BUTTON =====
function initConfirmButton() {
  const btn = document.getElementById('confirm-btn')
  const modal = document.getElementById('confirm-modal')
  const refEl = document.getElementById('booking-ref')

  if (!btn || !modal) return

  btn.addEventListener('click', () => {
    const name = document.getElementById('passenger-name')?.value.trim()
    const email = document.getElementById('passenger-email')?.value.trim()
    const phone = document.getElementById('passenger-phone')?.value.trim()

    if (!name || !email || !phone) {
      showValidationError('Please fill in all required passenger fields.')
      return
    }

    if (!email.includes('@')) {
      showValidationError('Please enter a valid email address.')
      return
    }

    // Show confirmation modal
    if (refEl) refEl.textContent = generateBookingRef()
    modal.classList.remove('hidden')
    modal.classList.add('flex')

    // Clear booking data from session
    sessionStorage.removeItem('ld_booking')
    sessionStorage.removeItem('ld_search')
  })

  // Close modal on backdrop click
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
