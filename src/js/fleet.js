import { escapeHtml, debounce, setBookingData, getSearchParams } from './utils.js'
import { FLEET } from './data/fleet.js'

let allCars = [...FLEET]
let filteredCars = [...FLEET]
let activeCategory = 'all'
let activeBrands = new Set(['rolls-royce', 'mercedes', 'bentley', 'bmw'])
let maxPrice = 1500

export async function initFleet() {
  displaySearchContext()
  renderGrid(filteredCars)
  initCategoryFilters()
  initBrandFilters()
  initPriceFilter()
  initSearch()
  initViewToggle()
  initResetFilters()
}

// ===== DISPLAY SEARCH CONTEXT =====
function displaySearchContext() {
  const params = getSearchParams()
  if (params.pickup && params.dropoff) {
    const banner = document.createElement('div')
    banner.className = 'mb-4 flex items-center gap-3 rounded-xl border border-[#1152d4]/20 bg-[#1152d4]/5 px-5 py-3 text-sm text-slate-300'
    banner.innerHTML = `
      <span class="material-symbols-outlined text-[#1152d4] text-lg">route</span>
      <span>
        <strong class="text-white">${escapeHtml(params.pickup)}</strong>
        <span class="mx-2 text-slate-500">→</span>
        <strong class="text-white">${escapeHtml(params.dropoff)}</strong>
        ${params.date ? `<span class="ml-3 text-slate-400">${params.date}</span>` : ''}
      </span>
    `
    const mainContent = document.querySelector('.flex-1.flex.flex-col.gap-6')
    mainContent?.prepend(banner)
  }
}

// ===== RENDER =====
function renderGrid(cars) {
  const grid = document.getElementById('fleet-grid')
  const empty = document.getElementById('fleet-empty')
  if (!grid) return

  if (cars.length === 0) {
    grid.classList.add('hidden')
    empty?.classList.remove('hidden')
    empty?.classList.add('flex')
    return
  }

  grid.classList.remove('hidden')
  empty?.classList.add('hidden')
  empty?.classList.remove('flex')

  grid.innerHTML = cars.map(car => renderCarCard(car)).join('')

  // Attach "Select & Continue" click handlers
  grid.querySelectorAll('.select-car-btn').forEach(btn => {
    btn.addEventListener('click', () => selectCar(btn.dataset.id))
  })

  // Attach wishlist handlers
  grid.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const icon = btn.querySelector('.material-symbols-outlined')
      icon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
      icon.classList.add('text-red-500')
    })
  })
}

function renderCarCard(car) {
  return `
    <div class="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#161e2d] transition-all duration-300 hover:border-[#1152d4]/40 hover:shadow-2xl hover:shadow-[#1152d4]/5 card-glow">
      <div class="relative h-56 overflow-hidden">
        <img
          src="${escapeHtml(car.image)}"
          alt="${escapeHtml(car.name)}"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80'"
        />
        <div class="absolute left-4 top-4">
          <span class="${escapeHtml(car.badgeColor || 'bg-[#1152d4]')} rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            ${escapeHtml(car.badge)}
          </span>
        </div>
        <button class="wishlist-btn absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white backdrop-blur-md transition-all hover:bg-white hover:text-red-500">
          <span class="material-symbols-outlined text-lg">favorite</span>
        </button>
      </div>

      <div class="flex flex-1 flex-col p-6">
        <div class="mb-2 flex items-start justify-between">
          <h3 class="text-xl font-bold text-white">${escapeHtml(car.name)}</h3>
          <div class="text-right">
            <span class="text-2xl font-bold text-[#1152d4]">$${car.pricePerMile}</span>
            <span class="text-xs text-slate-500">/mi</span>
          </div>
        </div>

        <p class="mb-5 line-clamp-2 text-sm text-slate-400">${escapeHtml(car.description)}</p>

        <div class="mb-6 grid grid-cols-2 gap-3">
          <div class="flex items-center gap-2 text-slate-300">
            <span class="material-symbols-outlined text-[#1152d4] text-base">person</span>
            <span class="text-xs font-semibold">${car.seats} Seats</span>
          </div>
          <div class="flex items-center gap-2 text-slate-300">
            <span class="material-symbols-outlined text-[#1152d4] text-base">luggage</span>
            <span class="text-xs font-semibold">${car.bags} Bags</span>
          </div>
          ${car.featureIcons.slice(0, 2).map((icon, i) => `
            <div class="flex items-center gap-2 text-slate-300">
              <span class="material-symbols-outlined text-[#1152d4] text-base">${escapeHtml(icon)}</span>
              <span class="text-xs font-semibold">${escapeHtml(car.features[i])}</span>
            </div>
          `).join('')}
        </div>

        <button
          class="select-car-btn mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#1152d4] py-3 text-sm font-bold text-white transition-all hover:bg-[#0d3fa8] active:scale-95"
          data-id="${escapeHtml(car.id)}"
        >
          Select &amp; Continue
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  `
}

// ===== SELECT CAR =====
function selectCar(carId) {
  const car = FLEET.find(c => c.id === carId)
  if (!car) return

  const search = getSearchParams()

  // Calculate a simple base fare
  const distanceKm = 280 // placeholder
  const baseFare = +(car.pricePerMile * distanceKm * 0.621371).toFixed(2)
  const distanceSurcharge = +(baseFare * 0.142).toFixed(2)
  const amenities = 45
  const gratuity = +((baseFare + distanceSurcharge + amenities) * 0.15).toFixed(2)
  const taxes = +((baseFare + distanceSurcharge + amenities + gratuity) * 0.06).toFixed(2)
  const total = +(baseFare + distanceSurcharge + amenities + gratuity + taxes).toFixed(2)

  setBookingData({
    car,
    search,
    fare: { baseFare, distanceSurcharge, amenities, gratuity, taxes, total },
  })

  window.location.href = '/pages/checkout.html'
}

// ===== FILTERS =====
function applyFilters() {
  filteredCars = allCars.filter(car => {
    const categoryMatch = activeCategory === 'all' || car.category === activeCategory
    const brandMatch = activeBrands.size === 0 || activeBrands.has(car.brand)
    const priceMatch = car.pricePerMile <= maxPrice
    return categoryMatch && brandMatch && priceMatch
  })
  renderGrid(filteredCars)
}

function initCategoryFilters() {
  document.getElementById('category-filters')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]')
    if (!btn) return

    activeCategory = btn.dataset.filter

    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('bg-[#1152d4]', 'text-white', 'shadow-lg', 'shadow-[#1152d4]/20')
      b.classList.add('text-slate-400')
    })
    btn.classList.add('bg-[#1152d4]', 'text-white', 'shadow-lg', 'shadow-[#1152d4]/20')
    btn.classList.remove('text-slate-400')

    applyFilters()
  })
}

function initBrandFilters() {
  document.getElementById('brand-filters')?.addEventListener('change', e => {
    const checkbox = e.target
    if (checkbox.type !== 'checkbox') return

    if (checkbox.checked) {
      activeBrands.add(checkbox.value)
    } else {
      activeBrands.delete(checkbox.value)
    }
    applyFilters()
  })
}

function initPriceFilter() {
  const slider = document.getElementById('price-range')
  const label = document.getElementById('price-max-label')
  if (!slider) return

  slider.addEventListener('input', debounce(() => {
    maxPrice = Number(slider.value)
    if (label) label.textContent = `$${maxPrice}/mi`
    applyFilters()
  }, 200))
}

function initSearch() {
  const input = document.getElementById('fleet-search')
  if (!input) return

  input.addEventListener('input', debounce(() => {
    const query = input.value.toLowerCase().trim()
    if (!query) {
      filteredCars = [...allCars]
      applyFilters()
      return
    }
    filteredCars = allCars.filter(car =>
      car.name.toLowerCase().includes(query) ||
      car.brand.toLowerCase().includes(query) ||
      car.badge.toLowerCase().includes(query) ||
      car.description.toLowerCase().includes(query)
    )
    renderGrid(filteredCars)
  }, 300))
}

// ===== VIEW TOGGLE =====
function initViewToggle() {
  const gridBtn = document.getElementById('view-grid')
  const listBtn = document.getElementById('view-list')
  const grid = document.getElementById('fleet-grid')
  if (!gridBtn || !listBtn || !grid) return

  gridBtn.addEventListener('click', () => {
    grid.classList.remove('grid-cols-1')
    grid.classList.add('grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3')
    gridBtn.classList.add('bg-[#161C28]', 'text-white', 'shadow-sm')
    gridBtn.classList.remove('text-slate-400')
    listBtn.classList.remove('bg-[#161C28]', 'text-white', 'shadow-sm')
    listBtn.classList.add('text-slate-400')
  })

  listBtn.addEventListener('click', () => {
    grid.classList.remove('md:grid-cols-2', 'xl:grid-cols-3')
    grid.classList.add('grid-cols-1')
    listBtn.classList.add('bg-[#161C28]', 'text-white', 'shadow-sm')
    listBtn.classList.remove('text-slate-400')
    gridBtn.classList.remove('bg-[#161C28]', 'text-white', 'shadow-sm')
    gridBtn.classList.add('text-slate-400')
  })
}

// ===== RESET FILTERS =====
function initResetFilters() {
  document.getElementById('reset-filters')?.addEventListener('click', () => {
    activeCategory = 'all'
    activeBrands = new Set(['rolls-royce', 'mercedes', 'bentley', 'bmw'])
    maxPrice = 1500
    filteredCars = [...allCars]

    document.querySelectorAll('.filter-btn').forEach((b, i) => {
      if (i === 0) {
        b.classList.add('bg-[#1152d4]', 'text-white')
        b.classList.remove('text-slate-400')
      } else {
        b.classList.remove('bg-[#1152d4]', 'text-white')
        b.classList.add('text-slate-400')
      }
    })

    document.querySelectorAll('#brand-filters input[type=checkbox]').forEach(cb => {
      cb.checked = true
    })

    const slider = document.getElementById('price-range')
    if (slider) slider.value = 1500
    const label = document.getElementById('price-max-label')
    if (label) label.textContent = '$1500/mi'

    renderGrid(filteredCars)
  })
}
