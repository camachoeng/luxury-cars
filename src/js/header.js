import { getUser, signOut, onAuthChange } from './auth.js'
import { getLang, setLang, applyTranslations } from './i18n.js'

export async function initHeader() {
  const userBtn = document.getElementById('nav-user-btn')
  if (!userBtn) return

  // Wire up language toggle
  const langBtn = document.getElementById('lang-toggle')
  if (langBtn) {
    langBtn.textContent = getLang() === 'en' ? 'ES' : 'EN'
    langBtn.addEventListener('click', () => {
      setLang(getLang() === 'en' ? 'es' : 'en')
    })
  }

  const user = await getUser()
  renderUserNav(userBtn, user)

  onAuthChange(updatedUser => renderUserNav(userBtn, updatedUser))
}

function renderUserNav(container, user) {
  if (user) {
    container.innerHTML = `<span class="material-symbols-outlined text-xl text-[#C5A059]">account_circle</span>`
    container.title = user.email

    // Update "Book Now" → "My Bookings" in desktop nav
    document.querySelectorAll('a[href="/pages/fleet.html"]').forEach(link => {
      if (link.classList.contains('rounded-lg') && link.classList.contains('bg-\\[\\#1152d4\\]')) {
        link.href = '/pages/my-bookings.html'
        // Re-apply translations so the span text updates if already translated
        const span = link.querySelector('[data-i18n]')
        if (span) {
          span.dataset.i18n = 'common.my_bookings'
          applyTranslations()
        } else {
          link.textContent = 'My Bookings'
        }
      }
    })

    container.onclick = () => {
      window.location.href = '/pages/my-bookings.html'
    }
  } else {
    container.innerHTML = `<span class="material-symbols-outlined text-xl">person</span>`
    container.title = 'Sign In'
    container.onclick = () => {
      window.location.href = '/pages/login.html'
    }
  }
}
