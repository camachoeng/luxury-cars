// ===== LuxuryDrive — Main entry point =====
// Routes to the correct page module based on URL path.
// Follows the yoga-v2 module-per-page pattern.

import '../style.css'

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

  if (path === '/' || path === '/index.html' || path.endsWith('luxury-cars/')) {
    const { initHome } = await import('./home.js')
    await initHome()
    return
  }

  if (path.includes('/fleet')) {
    const { initFleet } = await import('./fleet.js')
    await initFleet()
    return
  }

  if (path.includes('/checkout')) {
    const { initCheckout } = await import('./checkout.js')
    await initCheckout()
    return
  }
}

route().catch(err => {
  console.error('[LuxuryDrive] Routing error:', err)
})
