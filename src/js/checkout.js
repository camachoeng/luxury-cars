import { getSearchParams, clearBookingSession } from './utils.js'
import { getUser } from './auth.js'
import { saveBooking } from './bookings.js'
import { supabase } from './supabase.js'
import { t, applyTranslations } from './i18n.js'
import { initStripe, mountCardElement } from './stripe.js'

let stripeInstance  = null
let cardElementInst = null
let computedFareTotal = null

export async function initCheckout() {
  // 1. Auth guard
  const user = await getUser()
  if (!user) {
    sessionStorage.setItem('ld_return_to', `${import.meta.env.BASE_URL}pages/checkout.html`)
    window.location.href = `${import.meta.env.BASE_URL}pages/login.html`
    return
  }

  // 2. Validate search params
  const search = getSearchParams()
  const isHourly = search.serviceType === 'hourly'
  if (!search.pickup || !search.date || !search.time) {
    window.location.href = import.meta.env.BASE_URL
    return
  }
  if (!isHourly && !search.dropoff) {
    window.location.href = import.meta.env.BASE_URL
    return
  }
  // Normalise: store hours as dropoff string so DB column is never null
  if (isHourly && !search.dropoff) {
    search.dropoff = `Hourly – ${search.hours}h`
  }

  populateRouteInfo(search)
  prefillPassengerInfo(user)
  applyTranslations()
  initMusicOtherToggle()

  // 3. Load Stripe and mount card element (non-blocking — UI is usable while Stripe loads)
  loadAndMountCard()

  initConfirmButton(search)
}

// ===== POPULATE ROUTE =====
function populateRouteInfo(search) {
  const pickupEl   = document.getElementById('checkout-pickup')
  const dropoffEl  = document.getElementById('checkout-dropoff')
  const durationEl = document.getElementById('checkout-duration')

  if (search.serviceType === 'hourly') {
    if (pickupEl)  pickupEl.textContent  = search.pickup
    if (dropoffEl) dropoffEl.textContent = t('checkout.hourly_service')
    if (durationEl) durationEl.textContent = `${search.hours}h`
  } else {
    if (pickupEl)  pickupEl.textContent  = search.pickup
    if (dropoffEl) dropoffEl.textContent = search.dropoff
    loadRouteMap(search)
  }
  populateFareBreakdown(search)
}

async function populateFareBreakdown(search) {
  const isHourly = search.serviceType === 'hourly'

  // Fetch rates from Supabase
  let ratePerMile    = 4.0
  let ratePerHour    = 100.0
  let gratuityPct    = 20
  try {
    const { data } = await supabase.from('admin_settings').select('key, value')
      .in('key', ['rate_per_mile', 'rate_per_hour', 'gratuity_percent'])
    data?.forEach(row => {
      if (row.key === 'rate_per_mile')    ratePerMile = parseFloat(row.value) || 4.0
      if (row.key === 'rate_per_hour')    ratePerHour = parseFloat(row.value) || 100.0
      if (row.key === 'gratuity_percent') gratuityPct = parseFloat(row.value) || 20
    })
  } catch { /* use fallbacks */ }

  const fmt = n => `$${n.toFixed(2)}`

  if (isHourly) {
    const hours     = parseFloat(search.hours) || 2
    const subtotal  = hours * ratePerHour
    const gratuity  = subtotal * (gratuityPct / 100)
    document.getElementById('fare-basis-label').textContent    = t('home.hourly_hours_label') || 'Duration'
    document.getElementById('fare-basis-value').textContent    = `${hours}h`
    document.getElementById('fare-rate-label').textContent     = t('home.hourly_rate_label') || 'Rate'
    document.getElementById('fare-rate-value').textContent     = `${fmt(ratePerHour)}/hr`
    document.getElementById('fare-gratuity-label').textContent = `${t('checkout.gratuity')} (${gratuityPct}%)`
    document.getElementById('fare-gratuity-value').textContent = fmt(gratuity)
    document.getElementById('fare-total').textContent          = fmt(subtotal + gratuity)
    computedFareTotal = +(subtotal + gratuity).toFixed(2)
  } else {
    const miles     = parseFloat(search.distanceMiles) || 0
    const subtotal  = miles * ratePerMile
    const gratuity  = subtotal * (gratuityPct / 100)
    document.getElementById('fare-basis-label').textContent    = t('home.fare_distance_label') || 'Distance'
    document.getElementById('fare-basis-value').textContent    = miles > 0 ? `${miles.toFixed(1)} mi` : '—'
    document.getElementById('fare-rate-label').textContent     = t('home.fare_duration_label') || 'Drive Time'
    document.getElementById('fare-rate-value').textContent     = search.durationText || '—'
    document.getElementById('fare-gratuity-label').textContent = `${t('checkout.gratuity')} (${gratuityPct}%)`
    document.getElementById('fare-gratuity-value').textContent = miles > 0 ? fmt(gratuity) : '—'
    document.getElementById('fare-total').textContent          = miles > 0 ? fmt(subtotal + gratuity) : '—'
    computedFareTotal = miles > 0 ? +(subtotal + gratuity).toFixed(2) : null
  }
}

async function loadRouteMap(search) {
  const { pickupCoords, dropoffCoords, encodedPolyline } = search
  if (!pickupCoords || !dropoffCoords) return

  const mapDiv = document.getElementById('route-map-bg')
  if (!mapDiv) return

  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maps-proxy`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'staticmap', origin: pickupCoords, destination: dropoffCoords, encodedPolyline }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    mapDiv.style.backgroundImage = `url("${url}")`
  } catch { /* keep static placeholder */ }
}

// ===== MUSIC OTHER TOGGLE =====
function initMusicOtherToggle() {
  document.querySelectorAll('input[name="pref-music"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const otherInput = document.getElementById('music-other-text')
      if (otherInput) otherInput.classList.toggle('hidden', radio.value !== 'other' || !radio.checked)
    })
  })
}

// ===== PREFILL FROM AUTH =====
function prefillPassengerInfo(user) {
  const emailEl = document.getElementById('passenger-email')
  const nameEl  = document.getElementById('passenger-name')
  if (emailEl && user.email) emailEl.value = user.email
  if (nameEl && user.user_metadata?.full_name) nameEl.value = user.user_metadata.full_name
}

// ===== STRIPE CARD ELEMENT =====
async function loadAndMountCard() {
  const container = document.getElementById('card-element')
  if (!container) return

  try {
    stripeInstance  = await initStripe()
    const { cardElement } = mountCardElement(stripeInstance)
    cardElementInst = cardElement

    // Show inline card errors as the user types
    cardElement.on('change', e => {
      const errEl = document.getElementById('card-error')
      if (!errEl) return
      if (e.error) {
        errEl.textContent = e.error.message
        errEl.classList.remove('hidden')
      } else {
        errEl.textContent = ''
        errEl.classList.add('hidden')
      }
    })
  } catch {
    const errEl = document.getElementById('card-error')
    if (errEl) {
      errEl.textContent = t('checkout.err_stripe_load')
      errEl.classList.remove('hidden')
    }
  }
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

    // ── Validate passenger fields ──
    if (!passengerName || !passengerEmail || !passengerPhone) {
      showValidationError(t('checkout.err_fields'))
      return
    }
    if (!passengerEmail.includes('@')) {
      showValidationError(t('checkout.err_email'))
      return
    }

    // ── Stripe must be loaded before proceeding ──
    if (!stripeInstance || !cardElementInst) {
      showValidationError(t('checkout.err_stripe_load'))
      return
    }

    const preferences = {
      water:       document.getElementById('pref-water')?.checked ?? false,
      soda:        document.getElementById('pref-soda')?.checked ?? false,
      chips:       document.getElementById('pref-chips')?.checked ?? false,
      gum:         document.getElementById('pref-gum')?.checked ?? false,
      music:       document.querySelector('input[name="pref-music"]:checked')?.value === 'other'
                     ? (document.getElementById('music-other-text')?.value.trim() || 'other')
                     : (document.querySelector('input[name="pref-music"]:checked')?.value ?? null),
      temperature: `${document.getElementById('pref-temperature')?.value ?? 70}°F`,
      driver:      document.querySelector('input[name="pref-driver"]:checked')?.value ?? 'conversational',
    }
    const specialInstructions = document.getElementById('special-instructions')?.value.trim() || ''

    btn.disabled = true

    try {
      // Step A — Create SetupIntent via Supabase Edge Function
      btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> ${t('checkout.payment_securing')}`

      const { data, error: fnErr } = await supabase.functions.invoke('create-setup-intent')
      if (fnErr || !data?.clientSecret) {
        throw new Error(data?.error || t('checkout.err_setup_intent'))
      }
      const { clientSecret, customerId } = data

      // Step B — Confirm card setup (Stripe saves the card, handles 3DS if needed)
      btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> ${t('checkout.payment_securing')}`

      const { setupIntent, error: stripeErr } = await stripeInstance.confirmCardSetup(
        clientSecret,
        { payment_method: { card: cardElementInst } },
      )

      if (stripeErr) {
        const cardErrEl = document.getElementById('card-error')
        if (cardErrEl) {
          cardErrEl.textContent = stripeErr.message
          cardErrEl.classList.remove('hidden')
        }
        throw new Error(stripeErr.message)
      }

      // Step C — Save booking with Stripe references
      btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> ${t('checkout.saving')}`

      const booking = await saveBooking({
        search,
        passengerName, passengerEmail, passengerPhone, passengerCount,
        preferences, specialInstructions,
        fareTotal: computedFareTotal,
        stripeSetupIntentId:   setupIntent.id,
        stripePaymentMethodId: setupIntent.payment_method,
        stripeCustomerId:      customerId,
      })

      // Step D — Show confirmation modal
      if (refEl) refEl.textContent = booking.booking_ref
      modal.classList.remove('hidden')
      modal.classList.add('flex')
      applyTranslations()
      clearBookingSession()

    } catch (err) {
      // Only show generic error if we didn't already show a card-specific one
      const cardErrEl = document.getElementById('card-error')
      const alreadyShown = cardErrEl && !cardErrEl.classList.contains('hidden')
      if (!alreadyShown) {
        showValidationError(err.message || t('common.error_generic'))
      }
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
