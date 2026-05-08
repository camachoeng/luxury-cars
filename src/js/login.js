import { signIn } from './auth.js'
import { supabase } from './supabase.js'
import { t } from './i18n.js'

export async function initLogin() {
  // ── Show/hide password toggles ──────────────────────────────────────────────
  initPasswordToggle('toggle-password',     'login-password',   'toggle-password-icon')
  initPasswordToggle('toggle-new-password', 'new-password',     'toggle-new-password-icon')

  // ── View switching (signin ↔ forgot) ────────────────────────────────────────
  document.getElementById('forgot-link')?.addEventListener('click', () => showView('forgot'))
  document.getElementById('back-to-login')?.addEventListener('click', () => showView('signin'))

  // ── Recovery token detection (user clicked reset-password email link) ────────
  // Supabase appends #access_token=...&type=recovery to the redirectTo URL
  if (window.location.hash.includes('type=recovery')) {
    showView('new-password')
  }

  // ── Sign-in form ─────────────────────────────────────────────────────────────
  const btn   = document.getElementById('login-btn')
  const errEl = document.getElementById('login-error')

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

      const returnTo = sessionStorage.getItem('ld_return_to')
      sessionStorage.removeItem('ld_return_to')
      if (returnTo) { window.location.href = returnTo; return }

      const { data: driverRows } = await supabase
        .from('drivers')
        .select('id')
        .eq('email', email)
        .eq('is_active', true)
        .limit(1)

      window.location.href = driverRows?.length
        ? `${import.meta.env.BASE_URL}pages/driver.html`
        : import.meta.env.BASE_URL
    } catch (err) {
      showError(errEl, err.message || t('login.err_invalid'))
    } finally {
      btn.disabled = false
      btn.innerHTML = `<span class="material-symbols-outlined text-xl">login</span> <span data-i18n="login.submit_btn">${t('login.submit_btn')}</span>`
    }
  })

  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn?.click()
  })

  // ── Forgot password form ──────────────────────────────────────────────────────
  const resetBtn   = document.getElementById('reset-btn')
  const resetErr   = document.getElementById('reset-error')
  const resetOk    = document.getElementById('reset-success')

  resetBtn?.addEventListener('click', async () => {
    const email = document.getElementById('reset-email')?.value.trim()
    resetErr?.classList.add('hidden')
    resetOk?.classList.add('hidden')

    if (!email) {
      showError(resetErr, t('login.err_fields'))
      return
    }

    resetBtn.disabled = true
    resetBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> ${t('login.signing_in')}`

    try {
      // redirectTo brings the user back to login.html; Supabase appends #type=recovery
      const loginUrl = window.location.origin + window.location.pathname
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: loginUrl,
      })
      if (error) throw error
      resetOk?.classList.remove('hidden')
    } catch (err) {
      showError(resetErr, err.message || t('login.err_invalid'))
    } finally {
      resetBtn.disabled = false
      resetBtn.innerHTML = `<span class="material-symbols-outlined text-xl">send</span> <span data-i18n="login.reset_btn">${t('login.reset_btn')}</span>`
    }
  })

  // ── Set new password form ─────────────────────────────────────────────────────
  const newPwBtn  = document.getElementById('new-password-btn')
  const newPwErr  = document.getElementById('new-password-error')

  newPwBtn?.addEventListener('click', async () => {
    const password = document.getElementById('new-password')?.value
    newPwErr?.classList.add('hidden')

    if (!password || password.length < 8) {
      showError(newPwErr, t('login.err_password_length'))
      return
    }

    newPwBtn.disabled = true
    newPwBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> ${t('login.signing_in')}`

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      // Password updated — redirect to home (signed in)
      window.location.href = import.meta.env.BASE_URL
    } catch (err) {
      showError(newPwErr, err.message || t('login.err_invalid'))
      newPwBtn.disabled = false
      newPwBtn.innerHTML = `<span class="material-symbols-outlined text-xl">lock_reset</span> <span data-i18n="login.new_password_btn">${t('login.new_password_btn')}</span>`
    }
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showView(view) {
  const views = {
    signin:       document.getElementById('signin-form'),
    forgot:       document.getElementById('forgot-form'),
    'new-password': document.getElementById('new-password-form'),
  }
  const registerRow = document.getElementById('register-link-row')

  Object.entries(views).forEach(([name, el]) => {
    if (!el) return
    el.classList.toggle('hidden', name !== view)
  })

  // Hide register link when showing forgot / new-password
  if (registerRow) {
    registerRow.classList.toggle('hidden', view !== 'signin')
  }
}

function initPasswordToggle(btnId, inputId, iconId) {
  const btn   = document.getElementById(btnId)
  const input = document.getElementById(inputId)
  const icon  = document.getElementById(iconId)
  if (!btn || !input || !icon) return

  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password'
    input.type = isPassword ? 'text' : 'password'
    icon.textContent = isPassword ? 'visibility_off' : 'visibility'
  })
}

function showError(el, msg) {
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
}
