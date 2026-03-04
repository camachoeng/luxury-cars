import { signUp } from './auth.js'

const PASSWORD_RULES = [
  { id: 'rule-length',  label: 'At least 8 characters',          test: p => p.length >= 8 },
  { id: 'rule-upper',   label: 'One uppercase letter',            test: p => /[A-Z]/.test(p) },
  { id: 'rule-number',  label: 'One number',                      test: p => /[0-9]/.test(p) },
  { id: 'rule-special', label: 'One special character (!@#$%^&*)', test: p => /[!@#$%^&*]/.test(p) },
]

const BAR_COLORS = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400']

function updateStrengthUI(password) {
  const passed = PASSWORD_RULES.map(r => r.test(password))
  const score  = passed.filter(Boolean).length

  for (let i = 0; i < 4; i++) {
    const bar = document.getElementById(`bar-${i}`)
    if (!bar) continue
    BAR_COLORS.forEach(c => bar.classList.remove(c))
    bar.classList.remove('bg-slate-700')
    if (i < score) {
      bar.classList.add(BAR_COLORS[score - 1])
    } else {
      bar.classList.add('bg-slate-700')
    }
  }

  PASSWORD_RULES.forEach((rule, i) => {
    const li   = document.getElementById(rule.id)
    if (!li) return
    const icon = li.querySelector('.material-symbols-outlined')
    if (passed[i]) {
      li.classList.replace('text-slate-500', 'text-green-400')
      if (icon) icon.textContent = 'check_circle'
    } else {
      li.classList.replace('text-green-400', 'text-slate-500')
      if (icon) icon.textContent = 'radio_button_unchecked'
    }
  })
}

export async function initRegister() {
  const btn       = document.getElementById('register-btn')
  const errEl     = document.getElementById('register-error')
  const formEl    = document.getElementById('register-form')
  const successEl = document.getElementById('register-success')

  initPasswordToggle('register-password', 'toggle-password')
  initPasswordToggle('register-confirm',  'toggle-confirm')

  document.getElementById('register-password')?.addEventListener('input', e => {
    updateStrengthUI(e.target.value)
  })

  btn?.addEventListener('click', async () => {
    const name     = document.getElementById('register-name')?.value.trim()
    const email    = document.getElementById('register-email')?.value.trim()
    const password = document.getElementById('register-password')?.value
    const confirm  = document.getElementById('register-confirm')?.value

    if (!name || !email || !password || !confirm) {
      showError(errEl, 'Please fill in all fields.')
      return
    }
    const failedRule = PASSWORD_RULES.find(r => !r.test(password))
    if (failedRule) {
      showError(errEl, `Password must include: ${failedRule.label.toLowerCase()}.`)
      return
    }
    if (password !== confirm) {
      showError(errEl, 'Passwords do not match.')
      return
    }

    btn.disabled = true
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> Creating account...'

    try {
      await signUp(email, password, name)
      formEl?.classList.add('hidden')
      successEl?.classList.remove('hidden')
    } catch (err) {
      showError(errEl, err.message || 'Registration failed. Please try again.')
    } finally {
      btn.disabled = false
      btn.innerHTML = '<span class="material-symbols-outlined text-xl">person_add</span> Create Account'
    }
  })
}

function initPasswordToggle(inputId, btnId) {
  const input = document.getElementById(inputId)
  const btn   = document.getElementById(btnId)
  if (!input || !btn) return

  btn.addEventListener('click', () => {
    const isHidden = input.type === 'password'
    input.type = isHidden ? 'text' : 'password'
    btn.querySelector('.material-symbols-outlined').textContent = isHidden ? 'visibility_off' : 'visibility'
  })
}

function showError(el, msg) {
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
}
