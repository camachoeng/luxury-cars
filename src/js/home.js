import { escapeHtml, setSearchParams, debounce } from './utils.js'
import { supabase } from './supabase.js'
import { t, applyTranslations } from './i18n.js'
let pickupPlace       = null   // { location: { latitude, longitude }, displayName }
let dropoffPlace      = null
let lastDistanceMiles = null
let lastDurationText  = null

export async function initHome() {
  initTabs()
  initBookingSearch()
  initPlacesAutocomplete()
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
    })
  })
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
    if (!date || !time) {
      showSearchError(t('home.err_date_time'))
      return
    }

    setSearchParams({
      pickup,
      dropoff,
      date,
      time,
      distanceMiles: lastDistanceMiles,
      durationText:  lastDurationText,
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

// ===== GOOGLE PLACES AUTOCOMPLETE (direct REST — no Maps JS library) =====
function initPlacesAutocomplete() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) return

  attachAutocomplete(document.getElementById('pickup-input'),  'pickup',  apiKey)
  attachAutocomplete(document.getElementById('dropoff-input'), 'dropoff', apiKey)
}

function attachAutocomplete(input, type, apiKey) {
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
      const res  = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
        body:    JSON.stringify({ input: query, includedRegionCodes: ['us'] }),
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

    // Fetch lat/lng for distance calculation
    try {
      const placeId  = s.placePrediction.placeId
      const res      = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'location,displayName' },
      })
      const detail = await res.json()

      if (type === 'pickup') pickupPlace = detail
      else dropoffPlace = detail

      tryCalculateFare(apiKey)
    } catch { /* place detail failed — fare estimate won't show */ }
  })

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) dropdown.classList.add('hidden')
  })
}

async function tryCalculateFare(apiKey) {
  const p1 = pickupPlace?.location
  const p2 = dropoffPlace?.location
  if (!p1 || !p2) return

  try {
    // Routes API (New) — CORS-enabled, same key as Places API (New)
    const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Goog-Api-Key':  apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration',
      },
      body: JSON.stringify({
        origins:      [{ waypoint: { location: { latLng: { latitude: p1.latitude,  longitude: p1.longitude } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: p2.latitude, longitude: p2.longitude } } } }],
        travelMode: 'DRIVE',
      }),
    })
    const rows = await res.json()
    const route = Array.isArray(rows) ? rows[0] : null

    if (route?.distanceMeters) {
      const miles    = route.distanceMeters / 1609.344
      const secs     = parseInt(route.duration) || 0
      const hrs      = Math.floor(secs / 3600)
      const mins     = Math.floor((secs % 3600) / 60)
      const duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`

      lastDistanceMiles = miles
      lastDurationText  = duration

      let ratePerMile = 4.0
      try {
        const { data } = await supabase.from('admin_settings').select('value').eq('key', 'rate_per_mile').single()
        if (data?.value) ratePerMile = parseFloat(data.value)
      } catch { /* use fallback */ }

      showFareEstimate(miles * ratePerMile, miles, duration)
      return
    }
  } catch { /* Routes API not enabled — fall through to haversine */ }

  // Fallback: haversine straight-line distance × 1.15 road factor
  const R    = 3958.8
  const dLat = (p2.latitude  - p1.latitude)  * Math.PI / 180
  const dLon = (p2.longitude - p1.longitude) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2 + Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  const miles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.15

  lastDistanceMiles = miles
  lastDurationText  = 'est.'

  let ratePerMile = 4.0
  try {
    const { data } = await supabase.from('admin_settings').select('value').eq('key', 'rate_per_mile').single()
    if (data?.value) ratePerMile = parseFloat(data.value)
  } catch { /* use fallback */ }

  showFareEstimate(miles * ratePerMile, miles, 'est.')
}

function showFareEstimate(amount, miles, duration) {
  const card = document.getElementById('fare-estimate')
  if (!card) return

  document.getElementById('fare-amount').textContent   = `$${Math.round(amount)}`
  document.getElementById('fare-distance').textContent = `${miles.toFixed(1)} mi`
  document.getElementById('fare-duration').textContent = duration

  card.classList.remove('hidden')
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
