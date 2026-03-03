import { escapeHtml, setSearchParams } from './utils.js'
import { FLEET } from './data/fleet.js'

export async function initHome() {
  initTabs()
  initBookingSearch()
  renderFleetPreview()
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
    const pickup = document.getElementById('pickup-input')?.value.trim()
    const dropoff = document.getElementById('dropoff-input')?.value.trim()
    const date = document.getElementById('date-input')?.value
    const time = document.getElementById('time-input')?.value

    if (!pickup || !dropoff) {
      showSearchError('Please enter pickup and drop-off locations.')
      return
    }

    setSearchParams({ pickup, dropoff, date, time })
    window.location.href = '/pages/fleet.html'
  })
}

function showSearchError(msg) {
  const existing = document.getElementById('search-error')
  if (existing) existing.remove()

  const err = document.createElement('p')
  err.id = 'search-error'
  err.className = 'mt-3 text-sm text-red-400 text-center'
  err.textContent = msg

  const form = document.querySelector('#search-btn')?.closest('section')
  form?.appendChild(err)

  setTimeout(() => err.remove(), 4000)
}

// ===== FLEET PREVIEW =====
function renderFleetPreview() {
  const grid = document.getElementById('fleet-preview')
  if (!grid) return

  const preview = FLEET.slice(0, 3)

  grid.innerHTML = preview.map(car => `
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
          <span class="font-bold text-[#C5A059]">$${car.pricePerHour}/hr</span>
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
}
