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
  const dropdown   = document.getElementById('nav-user-dropdown')
  const signoutBtn = document.getElementById('nav-signout-btn')
  const adminBtn   = document.getElementById('nav-admin-btn')

  if (user) {
    container.innerHTML = `<span class="material-symbols-outlined text-xl text-[#C5A059]">account_circle</span>`
    container.title = user.email

    // Show admin badge for admin users
    if (adminBtn && user.app_metadata?.is_admin) {
      adminBtn.classList.remove('hidden')
      adminBtn.classList.add('flex')
    }

    // Update "Book Now" → "My Bookings" in desktop nav
    const bookNowBtn = document.getElementById('nav-book-now-btn')
    if (bookNowBtn) {
      bookNowBtn.href = `${import.meta.env.BASE_URL}pages/my-bookings.html`
      const span = bookNowBtn.querySelector('[data-i18n]')
      if (span) {
        span.dataset.i18n = 'common.my_bookings'
        applyTranslations()
      } else {
        bookNowBtn.textContent = 'My Bookings'
      }
    }

    // Toggle dropdown on person button click
    container.onclick = e => {
      e.stopPropagation()
      dropdown?.classList.toggle('hidden')
    }

    // Sign out
    signoutBtn?.addEventListener('click', async () => {
      dropdown?.classList.add('hidden')
      try {
        await signOut()
        window.location.href = import.meta.env.BASE_URL
      } catch (err) {
        console.error('[Header] Sign out failed:', err)
      }
    })

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown?.classList.add('hidden')
    }, { capture: true, once: false })

  } else {
    container.innerHTML = `<span class="material-symbols-outlined text-xl">person</span>`
    container.title = 'Sign In'
    container.onclick = () => {
      window.location.href = `${import.meta.env.BASE_URL}pages/login.html`
    }
    dropdown?.classList.add('hidden')
    if (adminBtn) {
      adminBtn.classList.add('hidden')
      adminBtn.classList.remove('flex')
    }
  }
}
