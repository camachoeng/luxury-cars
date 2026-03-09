import { escapeHtml, setSearchParams } from './utils.js'
import { supabase } from './supabase.js'
import { t, applyTranslations } from './i18n.js'

export async function initHome() {
  initTabs()
  initBookingSearch()
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

    setSearchParams({ pickup, dropoff, date, time })
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

  // Re-apply translations in case any data-i18n elements were injected
  applyTranslations()
}
