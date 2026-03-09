import { signIn } from './auth.js'
import { t } from './i18n.js'

export async function initLogin() {
  const btn    = document.getElementById('login-btn')
  const errEl  = document.getElementById('login-error')

  btn?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email')?.value.trim()
    const password = document.getElementById('login-password')?.value

    if (!email || !password) {
      showError(errEl, t('login.err_fields'))
      return
    }

    btn.disabled = true
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> ${t('login.signing_in')}`

    try {
      await signIn(email, password)
      const returnTo = sessionStorage.getItem('ld_return_to') || import.meta.env.BASE_URL
      sessionStorage.removeItem('ld_return_to')
      window.location.href = returnTo
    } catch (err) {
      showError(errEl, err.message || t('login.err_invalid'))
    } finally {
      btn.disabled = false
      btn.innerHTML = `<span class="material-symbols-outlined text-xl">login</span> ${t('login.submit_btn')}`
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
