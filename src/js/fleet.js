import { escapeHtml } from './utils.js'
import { supabase } from './supabase.js'
import { applyTranslations } from './i18n.js'

let allCars = []

export async function initFleet() {
  await loadFleet()
  initViewToggle()
}

// ===== LOAD FLEET FROM SUPABASE =====
async function loadFleet() {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)

    if (error) throw error

    allCars = (data || []).map(mapVehicle)
    renderGrid(allCars)
  } catch {
    // grid stays visible with skeleton loaders on error
  }
}

// Map DB snake_case columns to camelCase shape used by renderCarCard
function mapVehicle(v) {
  return {
    id:           v.id,
    name:         v.name,
    brand:        v.brand,
    category:     v.category,
    badge:        v.badge,
    badgeColor:   v.badge_color,
    pricePerMile: Number(v.price_per_mile),
    pricePerHour: Number(v.price_per_hour),
    seats:        v.seats,
    bags:         v.bags,
    features:     v.features || [],
    featureIcons: v.feature_icons || [],
    description:  v.description,
    image:        v.image,
    detail:       v.detail,
    class:        v.class,
  }
}

// ===== RENDER =====
function renderGrid(cars) {
  const grid = document.getElementById('fleet-grid')
  if (!grid) return

  grid.innerHTML = cars.map(car => renderCarCard(car)).join('')
  applyTranslations()

  // Wishlist handlers (visual-only)
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
        <h3 class="mb-2 text-xl font-bold text-white">${escapeHtml(car.name)}</h3>

        <p class="mb-5 line-clamp-2 text-sm text-slate-400">${escapeHtml(car.description)}</p>

        <div class="mt-auto grid grid-cols-2 gap-3">
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
              <span class="text-xs font-semibold">${escapeHtml(car.features[i] || '')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
}

// ===== VIEW TOGGLE =====
function initViewToggle() {
  const gridBtn = document.getElementById('view-grid')
  const listBtn = document.getElementById('view-list')
  const grid    = document.getElementById('fleet-grid')
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
