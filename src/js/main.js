// ===== YMV Limo — Main entry point =====
// Routes to the correct page module based on URL path.
// Follows the yoga-v2 module-per-page pattern.

import '../style.css'
import { applyTranslations } from './i18n.js'

// Inject favicon dynamically so BASE_URL is resolved correctly in dev + prod
const faviconLink = document.createElement('link')
faviconLink.rel = 'icon'
faviconLink.type = 'image/svg+xml'
faviconLink.href = import.meta.env.BASE_URL + 'images/logo/ymv-limo.svg'
document.head.appendChild(faviconLink)

const path = window.location.pathname

// ===== GLOBAL: mobile nav toggle =====
function initMobileNav() {
  const btn = document.getElementById('nav-mobile-btn')
  const menu = document.getElementById('nav-mobile-menu')
  if (!btn || !menu) return

  btn.addEventListener('click', () => {
    menu.classList.toggle('hidden')
    const icon = btn.querySelector('.material-symbols-outlined')
    if (icon) icon.textContent = menu.classList.contains('hidden') ? 'menu' : 'close'
  })
}

// ===== ROUTER =====
async function route() {
  initMobileNav()

  const { initHeader } = await import('./header.js')
  await initHeader()

  // Apply translations on initial load (header is now in DOM)
  applyTranslations()

  if (path === '/' || path === '/index.html' || path.endsWith('luxury-cars/')) {
    const { initHome } = await import('./home.js')
    await initHome()
    applyTranslations()
    return
  }

  if (path.includes('/fleet')) {
    const { initFleet } = await import('./fleet.js')
    await initFleet()
    applyTranslations()
    return
  }

  if (path.includes('/checkout')) {
    const { initCheckout } = await import('./checkout.js')
    await initCheckout()
    applyTranslations()
    return
  }

  if (path.includes('/login')) {
    const { initLogin } = await import('./login.js')
    await initLogin()
    applyTranslations()
    return
  }

  if (path.includes('/register')) {
    const { initRegister } = await import('./register.js')
    await initRegister()
    applyTranslations()
    return
  }

  if (path.includes('/my-bookings')) {
    const { initMyBookings } = await import('./my-bookings.js')
    await initMyBookings()
    applyTranslations()
    return
  }
}

route().catch(err => {
  console.error('[YMV Limo] Routing error:', err)
})
