export async function initLegal() {
  const tabs    = document.querySelectorAll('.legal-tab')
  const panels  = document.querySelectorAll('.legal-panel')

  // Read hash to open correct tab on load (#privacy, #cookies)
  const hash = window.location.hash.replace('#', '') || 'terms'
  switchTab(hash)

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab)
      history.replaceState(null, '', '#' + btn.dataset.tab)
    })
  })

  function switchTab(name) {
    tabs.forEach(btn => {
      const active = btn.dataset.tab === name
      btn.classList.toggle('border-[#C5A059]', active)
      btn.classList.toggle('text-white', active)
      btn.classList.toggle('border-transparent', !active)
      btn.classList.toggle('text-slate-500', !active)
    })
    panels.forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + name))
  }
}
