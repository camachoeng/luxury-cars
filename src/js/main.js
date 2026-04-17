// ===== YMV Limo — Main entry point =====
// Routes to the correct page module based on URL path.
// Follows the yoga-v2 module-per-page pattern.

import '../style.css'
import { initI18n, applyTranslations } from './i18n.js'

// Inject favicon dynamically so BASE_URL is resolved correctly in dev + prod
const faviconLink = document.createElement('link')
faviconLink.rel = 'icon'
faviconLink.type = 'image/svg+xml'
faviconLink.href = import.meta.env.BASE_URL + 'images/logo/ymv-favicon.svg'
document.head.appendChild(faviconLink)

const path = window.location.pathname

// ===== AUTH TOKEN INTERCEPT =====
// Supabase redirects password-reset and invite links to the site root.
// If there's a recovery/invite token in the hash, forward to the driver portal.
;(function interceptAuthToken() {
  const hash   = window.location.hash
  if (!hash) return
  const params = new URLSearchParams(hash.replace('#', ''))
  const type   = params.get('type')
  if (type === 'recovery' || type === 'invite') {
    // Preserve the full hash so driver-portal.js can process the token
    window.location.replace(
      import.meta.env.BASE_URL + 'pages/driver.html' + hash
    )
  }
})()

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
  // Load translations before anything else so the DOM is ready to receive them
  await initI18n()

  initMobileNav()

  const { initHeader } = await import('./header.js')
  await initHeader()

  // Re-apply after header renders (updates lang toggle + any header i18n attrs)
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

  if (path.includes('/about')) {
    const { initAbout } = await import('./about.js')
    await initAbout()
    applyTranslations()
    return
  }

  if (path.includes('/contact')) {
    const { initContact } = await import('./contact.js')
    await initContact()
    applyTranslations()
    return
  }

  if (path.includes('/404')) {
    const { initNotFound } = await import('./not-found.js')
    await initNotFound()
    return
  }

  if (path.includes('/admin')) {
    const { initAdmin } = await import('./admin.js')
    await initAdmin()
    return
  }

  if (path.includes('/reviews')) {
    const { initReviews } = await import('./reviews.js')
    await initReviews()
    applyTranslations()
    return
  }

  if (path.includes('/legal')) {
    const { initLegal } = await import('./legal.js')
    await initLegal()
    applyTranslations()
    return
  }

  if (path.includes('/driver')) {
    const { initDriverPortal } = await import('./driver-portal.js')
    await initDriverPortal()
    return
  }

  // Unknown route → redirect to 404
  window.location.replace(import.meta.env.BASE_URL + 'pages/404.html')
}

route().catch(err => {
  console.error('[YMV Limo] Routing error:', err)
})
