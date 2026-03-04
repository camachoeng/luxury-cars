import { getUser, signOut, onAuthChange } from './auth.js'

export async function initHeader() {
  const userBtn = document.getElementById('nav-user-btn')
  if (!userBtn) return

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
        link.textContent = 'My Bookings'
      }
    })

    container.onclick = async () => {
      try {
        await signOut()
      } catch {
        // ignore sign-out errors
      }
      window.location.href = '/'
    }
  } else {
    container.innerHTML = `<span class="material-symbols-outlined text-xl">person</span>`
    container.title = 'Sign In'
    container.onclick = () => {
      window.location.href = '/pages/login.html'
    }
  }
}
