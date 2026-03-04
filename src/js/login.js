import { signIn } from './auth.js'

export async function initLogin() {
  const btn    = document.getElementById('login-btn')
  const errEl  = document.getElementById('login-error')

  btn?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email')?.value.trim()
    const password = document.getElementById('login-password')?.value

    if (!email || !password) {
      showError(errEl, 'Please enter your email and password.')
      return
    }

    btn.disabled = true
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> Signing in...'

    try {
      await signIn(email, password)
      const returnTo = sessionStorage.getItem('ld_return_to') || '/'
      sessionStorage.removeItem('ld_return_to')
      window.location.href = returnTo
    } catch (err) {
      showError(errEl, err.message || 'Sign-in failed. Please check your credentials.')
    } finally {
      btn.disabled = false
      btn.innerHTML = '<span class="material-symbols-outlined text-xl">login</span> Sign In'
    }
  })

  // Allow submitting with Enter key
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn?.click()
  })
}

function showError(el, msg) {
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
}
