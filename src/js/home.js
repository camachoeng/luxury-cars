import L from 'leaflet'
import { escapeHtml, setSearchParams, debounce } from './utils.js'
import { supabase } from './supabase.js'
import { t, applyTranslations } from './i18n.js'

let pickupPlace         = null   // intercity pickup
let dropoffPlace        = null
let hourlyPickupPlace   = null   // hourly pickup
let lastDistanceMiles   = null
let lastDurationText    = null
let lastEncodedPolyline = null
let hourlyHours         = 2      // current hours value in stepper
let hourlyMinHours      = 2      // loaded from admin_settings
let hourlyRate          = 100    // loaded from admin_settings

export async function initHome() {
  initTabs()
  initDateTimeConstraints()
  initBookingSearch()
  initPlacesAutocomplete()
  initGeolocation()
  initMapPicker()
  initHourlyForm()
  await renderFleetPreview()
}

// ===== TABS =====
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn')
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('text-[#C5A059]', 'border-[#C5A059]', 'border-b-2')
        t.classList.add('text-slate-500', 'border-transparent')
      })
      tab.classList.remove('text-slate-500', 'border-transparent')
      tab.classList.add('text-[#C5A059]', 'border-[#C5A059]', 'border-b-2')

      const isHourly = tab.dataset.tab === 'hourly'
      document.getElementById('tab-intercity-panel')?.classList.toggle('hidden', isHourly)
      document.getElementById('tab-hourly-panel')?.classList.toggle('hidden', !isHourly)
    })
  })
}

// ===== DATE / TIME CONSTRAINTS =====
// - Date cannot be before today
// - Time must be at least 2 hours from now when today is selected

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/** Returns the minimum allowed time string (HH:MM) for today: now + 2 hours, rounded up to nearest 15 min */
function minTimeForToday() {
  const d = new Date()
  d.setHours(d.getHours() + 2)
  const mins = Math.ceil(d.getMinutes() / 15) * 15
  if (mins >= 60) {
    d.setHours(d.getHours() + 1)
    d.setMinutes(0)
  } else {
    d.setMinutes(mins)
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function initDateTimeConstraints() {
  const pairs = [
    { dateId: 'date-input',        timeId: 'time-input' },
    { dateId: 'hourly-date-input', timeId: 'hourly-time-input' },
  ]

  pairs.forEach(({ dateId, timeId }) => {
    const dateEl = document.getElementById(dateId)
    const timeEl = document.getElementById(timeId)
    if (!dateEl || !timeEl) return

    dateEl.min = todayStr()

    const updateTimeMin = () => {
      if (dateEl.value === todayStr()) {
        timeEl.min = minTimeForToday()
        if (timeEl.value && timeEl.value < timeEl.min) timeEl.value = ''
      } else {
        timeEl.min = ''
      }
    }

    dateEl.addEventListener('change', updateTimeMin)
    updateTimeMin()
  })
}

/** Validates date + time against the 2-hour rule. Returns an error string or null. */
function validateDateTime(date, time) {
  if (!date || !time) return t('home.err_date_time')
  if (date < todayStr()) return t('home.err_date_past')
  if (date === todayStr() && time < minTimeForToday()) return t('home.err_time_too_soon')
  return null
}

// ===== BOOKING SEARCH =====
function initBookingSearch() {
  const searchBtn = document.getElementById('search-btn')
  if (!searchBtn) return

  searchBtn.addEventListener('click', () => {
    const pickup  = document.getElementById('pickup-input')?.value.trim()
    const dropoff = document.getElementById('dropoff-input')?.value.trim()
    const date    = document.getElementById('date-input')?.value
    const time    = document.getElementById('time-input')?.value

    if (!pickup || !dropoff) {
      showSearchError(t('home.err_pickup_dropoff'))
      return
    }
    const dtError = validateDateTime(date, time)
    if (dtError) { showSearchError(dtError); return }

    setSearchParams({
      pickup,
      dropoff,
      date,
      time,
      distanceMiles:   lastDistanceMiles,
      durationText:    lastDurationText,
      pickupCoords:    pickupPlace?.location  ?? null,
      dropoffCoords:   dropoffPlace?.location ?? null,
      encodedPolyline: lastEncodedPolyline    ?? null,
    })
    window.location.href = `${import.meta.env.BASE_URL}pages/checkout.html`
  })
}

function showSearchError(msg) {
  const existing = document.getElementById('search-error')
  if (existing) existing.remove()

  const err = document.createElement('p')
  err.id = 'search-error'
  err.className = 'mt-3 text-sm text-red-400 text-center'
  err.textContent = msg

  document.querySelector('#search-btn')?.closest('section')?.appendChild(err)
  setTimeout(() => err.remove(), 4000)
}

// ===== GOOGLE PLACES AUTOCOMPLETE (via maps-proxy edge function — key never hits browser) =====
const MAPS_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maps-proxy`

const HOUSTON_CENTER = { latitude: 29.7604, longitude: -95.3698 }
const HOUSTON_MAX_KM = 161  // 100 miles

// Allowed dropoff zones: Houston, Dallas, Austin, Louisiana (state center + wide radius)
const DROPOFF_ZONES = [
  { label: 'Houston',   center: { latitude: 29.7604, longitude: -95.3698 }, radiusKm: 161 },
  { label: 'Dallas',    center: { latitude: 32.7767, longitude: -96.7970 }, radiusKm: 70  },
  { label: 'Austin',    center: { latitude: 30.2672, longitude: -97.7431 }, radiusKm: 60  },
  { label: 'Louisiana', center: { latitude: 31.0000, longitude: -91.8000 }, radiusKm: 350 },
]

function isValidDropoff(location) {
  return DROPOFF_ZONES.some(z => distanceKm(location, z.center) <= z.radiusKm)
}

function distanceKm(a, b) {
  const R    = 6371
  const dLat = (b.latitude  - a.latitude)  * Math.PI / 180
  const dLon = (b.longitude - a.longitude) * Math.PI / 180
  const x    = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function initPlacesAutocomplete() {
  // Both fields biased toward Houston; dropoff also accepts Dallas, Austin, Louisiana
  const HOUSTON_BIAS = { circle: { center: { latitude: 29.7604, longitude: -95.3698 }, radius: 50000 } }
  attachAutocomplete(document.getElementById('pickup-input'),  'pickup',  HOUSTON_BIAS)
  attachAutocomplete(document.getElementById('dropoff-input'), 'dropoff', HOUSTON_BIAS)
}

function attachAutocomplete(input, type, locationBias = null) {
  if (!input) return

  const wrapper = input.parentElement
  wrapper.style.position = 'relative'

  const dropdown = document.createElement('ul')
  dropdown.className = 'absolute top-full left-0 z-[9999] mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-[#161C28] shadow-xl hidden'
  wrapper.appendChild(dropdown)

  let suggestions = []

  input.addEventListener('input', debounce(async () => {
    const query = input.value.trim()
    if (query.length < 3) { dropdown.classList.add('hidden'); return }

    try {
      const res  = await fetch(MAPS_PROXY, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'autocomplete', input: query, ...(locationBias && { locationBias }) }),
      })
      const data = await res.json()
      if (!res.ok) { console.error('[Places] API error:', res.status, data); return }
      suggestions = data.suggestions ?? []

      dropdown.innerHTML = suggestions.slice(0, 5).map((s, i) => {
        const main      = escapeHtml(s.placePrediction.structuredFormat?.mainText?.text      ?? s.placePrediction.text?.text ?? '')
        const secondary = escapeHtml(s.placePrediction.structuredFormat?.secondaryText?.text ?? '')
        return `<li data-idx="${i}" class="flex cursor-pointer items-start gap-3 border-b border-slate-800 px-4 py-3 last:border-0 hover:bg-[#1e293b]">
          <span class="material-symbols-outlined mt-0.5 shrink-0 text-sm text-slate-500">location_on</span>
          <span class="text-sm leading-snug">
            <span class="font-medium text-white">${main}</span>
            <span class="ml-1 text-slate-400">${secondary}</span>
          </span>
        </li>`
      }).join('')

      dropdown.classList.toggle('hidden', suggestions.length === 0)
    } catch { dropdown.classList.add('hidden') }
  }, 300))

  dropdown.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-idx]')
    if (!li) return

    const s = suggestions[parseInt(li.dataset.idx)]
    if (!s) return

    input.value = s.placePrediction.text?.text ?? ''
    dropdown.classList.add('hidden')

    try {
      const placeId = s.placePrediction.placeId
      const res     = await fetch(MAPS_PROXY, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'place', placeId }),
      })
      const detail = await res.json()
      applyPlaceToField(type, input, detail)
    } catch { /* place detail failed — fare estimate won't show */ }
  })

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) dropdown.classList.add('hidden')
  })
}

// Apply a resolved place detail to a field, with validation
function applyPlaceToField(type, input, detail) {
  if (type === 'pickup' || type === 'hourly-pickup') {
    if (distanceKm(detail.location, HOUSTON_CENTER) > HOUSTON_MAX_KM) {
      input.value = ''
      if (type === 'pickup') pickupPlace = null
      else hourlyPickupPlace = null
      showSearchError(t('home.err_pickup_houston'))
      return
    }
    if (type === 'pickup') pickupPlace = detail
    else { hourlyPickupPlace = detail; updateHourlyFare() }
  } else {
    if (!isValidDropoff(detail.location)) {
      input.value = ''
      dropoffPlace = null
      showSearchError(t('home.err_dropoff_zone'))
      return
    }
    dropoffPlace = detail
  }
  if (type !== 'hourly-pickup') tryCalculateFare()
}

// ===== GEOLOCATION (pickup only) =====
function initGeolocation() {
  wireGpsBtn('pickup-gps-btn', 'pickup', 'pickup-input')
  wireGpsBtn('hourly-pickup-gps-btn', 'hourly-pickup', 'hourly-pickup-input')
}

function wireGpsBtn(btnId, fieldType, inputId) {
  const btn = document.getElementById(btnId)
  if (!btn) return

  btn.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      showSearchError(t('home.err_geolocation_unavailable'))
      return
    }

    const icon = btn.querySelector('span')
    icon.textContent = 'progress_activity'
    icon.style.animation = 'spin 1s linear infinite'
    btn.disabled = true

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res  = await fetch(MAPS_PROXY, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ action: 'geocode', latitude, longitude }),
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error)

          const input = document.getElementById(inputId)
          input.value = data.formattedAddress
          applyPlaceToField(fieldType, input, { location: data.location, displayName: { text: data.formattedAddress } })
        } catch {
          showSearchError(t('home.err_geolocation_failed'))
        } finally {
          icon.textContent = 'my_location'
          icon.style.animation = ''
          btn.disabled = false
        }
      },
      () => {
        showSearchError(t('home.err_geolocation_failed'))
        icon.textContent = 'my_location'
        icon.style.animation = ''
        btn.disabled = false
      },
      { timeout: 8000 },
    )
  })
}

// ===== MAP PICKER (Leaflet + OpenStreetMap) =====
let leafletMap       = null
let leafletMarker    = null
let mapPickerType    = null   // 'pickup' | 'dropoff'
let pendingMapPlace  = null   // { location, displayName }

function initMapPicker() {
  document.querySelectorAll('.map-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => openMapPicker(btn.dataset.field))
  })

  document.getElementById('map-picker-cancel')?.addEventListener('click', closeMapPicker)

  document.getElementById('map-picker-confirm')?.addEventListener('click', () => {
    if (!pendingMapPlace) return

    const inputId = mapPickerType === 'pickup' ? 'pickup-input'
                  : mapPickerType === 'hourly-pickup' ? 'hourly-pickup-input'
                  : 'dropoff-input'
    const input   = document.getElementById(inputId)
    input.value   = pendingMapPlace.displayName?.text ?? ''
    applyPlaceToField(mapPickerType, input, pendingMapPlace)
    closeMapPicker()
  })
}

function openMapPicker(type) {
  mapPickerType   = type
  pendingMapPlace = null

  const modal     = document.getElementById('map-picker-modal')
  const addrEl    = document.getElementById('map-picker-address')
  const confirmBtn = document.getElementById('map-picker-confirm')

  addrEl.textContent    = t('home.map_picker_tap')
  confirmBtn.disabled   = true
  modal.classList.add('open')
  modal.classList.remove('hidden')

  // Init Leaflet on first open
  if (!leafletMap) {
    leafletMap = L.map('map-picker-container', { zoomControl: true }).setView(
      [HOUSTON_CENTER.latitude, HOUSTON_CENTER.longitude], 11
    )
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(leafletMap)

    leafletMap.on('click', onMapClick)
  }

  // Center on existing location if set
  const existing = type === 'pickup' ? pickupPlace
                 : type === 'hourly-pickup' ? hourlyPickupPlace
                 : dropoffPlace
  if (existing?.location) {
    leafletMap.setView([existing.location.latitude, existing.location.longitude], 13)
  } else {
    leafletMap.setView([HOUSTON_CENTER.latitude, HOUSTON_CENTER.longitude], 11)
  }

  // Leaflet needs a size recalculation after the modal becomes visible
  setTimeout(() => leafletMap.invalidateSize(), 50)
}

function closeMapPicker() {
  const modal = document.getElementById('map-picker-modal')
  modal.classList.remove('open')
  modal.classList.add('hidden')
  pendingMapPlace = null
}

async function onMapClick(e) {
  const { lat, lng } = e.latlng
  const addrEl     = document.getElementById('map-picker-address')
  const confirmBtn = document.getElementById('map-picker-confirm')

  // Move / create marker
  const icon = L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#C5A059;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.6)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], className: '',
  })
  if (leafletMarker) {
    leafletMarker.setLatLng([lat, lng])
  } else {
    leafletMarker = L.marker([lat, lng], { icon }).addTo(leafletMap)
  }

  addrEl.textContent  = t('home.map_picker_geocoding')
  confirmBtn.disabled = true

  try {
    const res  = await fetch(MAPS_PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'geocode', latitude: lat, longitude: lng }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    addrEl.textContent = data.formattedAddress
    pendingMapPlace    = { location: data.location, displayName: { text: data.formattedAddress } }
    confirmBtn.disabled = false
  } catch {
    addrEl.textContent  = t('home.map_picker_geocode_err')
    confirmBtn.disabled = true
    pendingMapPlace     = null
  }
}

// ===== HOURLY FORM =====
async function initHourlyForm() {
  // Load settings from Supabase (fallback to defaults if unavailable)
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['rate_per_hour', 'hourly_min_hours'])
    if (data) {
      data.forEach(row => {
        if (row.key === 'rate_per_hour')  hourlyRate     = parseFloat(row.value) || 100
        if (row.key === 'hourly_min_hours') hourlyMinHours = parseInt(row.value)  || 2
      })
    }
  } catch { /* use defaults */ }

  hourlyHours = hourlyMinHours
  document.getElementById('hourly-hours-display').textContent = hourlyHours

  // Wire autocomplete on the hourly pickup input
  const HOUSTON_BIAS = { circle: { center: { latitude: 29.7604, longitude: -95.3698 }, radius: 50000 } }
  attachAutocomplete(document.getElementById('hourly-pickup-input'), 'hourly-pickup', HOUSTON_BIAS)

  // Hours stepper
  document.getElementById('hourly-minus-btn')?.addEventListener('click', () => {
    if (hourlyHours > hourlyMinHours) {
      hourlyHours--
      document.getElementById('hourly-hours-display').textContent = hourlyHours
      updateHourlyFare()
    }
  })
  document.getElementById('hourly-plus-btn')?.addEventListener('click', () => {
    if (hourlyHours < 24) {
      hourlyHours++
      document.getElementById('hourly-hours-display').textContent = hourlyHours
      updateHourlyFare()
    }
  })

  // Book button
  document.getElementById('hourly-book-btn')?.addEventListener('click', () => {
    const pickup = document.getElementById('hourly-pickup-input')?.value.trim()
    const date   = document.getElementById('hourly-date-input')?.value
    const time   = document.getElementById('hourly-time-input')?.value

    if (!pickup) { showSearchError(t('home.err_pickup_dropoff')); return }
    const dtError = validateDateTime(date, time)
    if (dtError) { showSearchError(dtError); return }

    setSearchParams({
      serviceType: 'hourly',
      pickup,
      date,
      time,
      hours: hourlyHours,
    })
    window.location.href = `${import.meta.env.BASE_URL}pages/checkout.html`
  })
}

function updateHourlyFare() {
  const card = document.getElementById('hourly-fare-estimate')
  if (!card) return

  const total = hourlyHours * hourlyRate
  document.getElementById('hourly-fare-amount').textContent = `$${total}`
  document.getElementById('hourly-fare-hours').textContent  = `${hourlyHours} ${hourlyHours === 1 ? 'hr' : 'hrs'}`
  document.getElementById('hourly-fare-rate').textContent   = `$${hourlyRate}/hr`

  card.classList.remove('hidden')
}

// ===== FARE CALCULATION =====
async function tryCalculateFare() {
  const p1 = pickupPlace?.location
  const p2 = dropoffPlace?.location
  if (!p1 || !p2) return

  try {
    const res   = await fetch(MAPS_PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'distance', origin: p1, destination: p2 }),
    })
    const route = await res.json()

    if (route?.distanceMeters) {
      const miles    = route.distanceMeters / 1609.344
      const secs     = parseInt(route.duration) || 0
      const hrs      = Math.floor(secs / 3600)
      const mins     = Math.floor((secs % 3600) / 60)
      const duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`

      lastDistanceMiles   = miles
      lastDurationText    = duration
      lastEncodedPolyline = route.encodedPolyline ?? null

      let ratePerMile = 4.0
      try {
        const { data } = await supabase.from('admin_settings').select('value').eq('key', 'rate_per_mile').single()
        if (data?.value) ratePerMile = parseFloat(data.value)
      } catch { /* use fallback */ }

      showFareEstimate(miles * ratePerMile, miles, duration)
      showRouteMap(p1, p2, lastEncodedPolyline)
      return
    }
  } catch { /* Routes API unavailable — fall through to haversine */ }

  // Fallback: haversine straight-line × 1.15 road factor
  const R    = 3958.8
  const dLat = (p2.latitude  - p1.latitude)  * Math.PI / 180
  const dLon = (p2.longitude - p1.longitude) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2 + Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  const miles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.15

  lastDistanceMiles   = miles
  lastDurationText    = 'est.'
  lastEncodedPolyline = null

  let ratePerMile = 4.0
  try {
    const { data } = await supabase.from('admin_settings').select('value').eq('key', 'rate_per_mile').single()
    if (data?.value) ratePerMile = parseFloat(data.value)
  } catch { /* use fallback */ }

  showFareEstimate(miles * ratePerMile, miles, 'est.')
  showRouteMap(p1, p2, null)
}

function showFareEstimate(amount, miles, duration) {
  const card = document.getElementById('fare-estimate')
  if (!card) return

  document.getElementById('fare-amount').textContent   = `$${Math.round(amount)}`
  document.getElementById('fare-distance').textContent = `${miles.toFixed(1)} mi`
  document.getElementById('fare-duration').textContent = duration

  card.classList.remove('hidden')
}

async function showRouteMap(origin, destination, encodedPolyline) {
  const container = document.getElementById('route-map')
  const img       = document.getElementById('route-map-img')
  if (!container || !img) return

  try {
    const res = await fetch(MAPS_PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'staticmap', origin, destination, encodedPolyline }),
    })
    if (!res.ok) return

    const blob = await res.blob()
    const prev = img.src
    const url  = URL.createObjectURL(blob)
    img.src    = url
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)

    // Also set lightbox image
    const lbImg = document.getElementById('route-map-lightbox-img')
    if (lbImg) lbImg.src = url

    container.classList.remove('hidden')
    initRouteLightbox()
  } catch { /* static map unavailable — silently skip */ }
}

function initRouteLightbox() {
  const img       = document.getElementById('route-map-img')
  const lightbox  = document.getElementById('route-map-lightbox')
  const closeBtn  = document.getElementById('route-map-lightbox-close')
  if (!img || !lightbox) return

  // Avoid adding duplicate listeners
  img.onclick = () => {
    lightbox.classList.remove('hidden')
    lightbox.classList.add('flex')
  }
  if (closeBtn) {
    closeBtn.onclick = closeLightbox
  }
  lightbox.onclick = (e) => {
    if (e.target === lightbox) closeLightbox()
  }

  function closeLightbox() {
    lightbox.classList.add('hidden')
    lightbox.classList.remove('flex')
  }
}

// ===== FLEET PREVIEW (from Supabase) =====
async function renderFleetPreview() {
  const grid = document.getElementById('fleet-preview')
  if (!grid) return

  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, name, image, description, seats, bags, price_per_hour, badge, badge_color')
      .eq('is_active', true)
      .limit(3)

    if (error) throw error

    grid.innerHTML = vehicles.map(car => `
      <div class="group relative overflow-hidden rounded-xl border border-slate-800 bg-[#161C28] transition-all hover:border-[#C5A059]/50 card-glow">
        <div class="aspect-[16/10] w-full overflow-hidden">
          <img
            src="${escapeHtml(car.image)}"
            alt="${escapeHtml(car.name)}"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        </div>
        <div class="p-6">
          <div class="mb-4 flex items-start justify-between">
            <h3 class="text-xl font-bold text-white">${escapeHtml(car.name)}</h3>
            <span class="font-bold text-[#C5A059]">$${car.price_per_hour}/hr</span>
          </div>
          <p class="mb-5 line-clamp-2 text-sm text-slate-400">${escapeHtml(car.description)}</p>
          <div class="flex items-center gap-5 text-xs font-medium uppercase tracking-widest text-slate-300">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">person</span>
              ${car.seats}
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">luggage</span>
              ${car.bags}
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">wifi</span>
              Free
            </span>
          </div>
        </div>
      </div>
    `).join('')
  } catch {
    grid.innerHTML = `<p class="col-span-3 text-center text-slate-500">${t('home.fleet_unavailable')}</p>`
  }

  applyTranslations()
}
