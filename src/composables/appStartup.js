export function finishAppStartup() {
  const screen = document.getElementById('app-loading')
  if (!screen || screen.dataset.state === 'error') return
  screen.remove()
  document.getElementById('app')?.removeAttribute('inert')
}

export function showAppStartupError() {
  const screen = document.getElementById('app-loading')
  if (!screen) return
  screen.dataset.state = 'error'
  const message = screen.querySelector('[data-startup-message]')
  message.textContent = 'โหลดร้านไม่สำเร็จ ลองโหลดใหม่อีกครั้งนะ'
  message.setAttribute('role', 'alert')
  const retry = screen.querySelector('[data-startup-retry]')
  retry.hidden = false
  retry.onclick = () => window.location.reload()
}
