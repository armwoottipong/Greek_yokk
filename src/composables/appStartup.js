async function waitForImage(image, required) {
  if (!image.complete) {
    await new Promise(resolve => {
      function settled() {
        image.removeEventListener('load', settled)
        image.removeEventListener('error', settled)
        resolve()
      }
      image.addEventListener('load', settled)
      image.addEventListener('error', settled)
    })
  }
  if (!image.naturalWidth) {
    if (required) throw new Error('Startup logo could not load')
    return
  }
  if (typeof image.decode === 'function') {
    try { await image.decode() } catch (error) { if (required) throw error }
  }
}

export async function finishAppStartup() {
  const screen = document.getElementById('app-loading')
  if (!screen || screen.dataset.state === 'error') return
  const app = document.getElementById('app')
  try {
    if (document.readyState !== 'complete') {
      await new Promise(resolve => window.addEventListener('load', resolve, { once: true }))
    }
    const logos = [...screen.querySelectorAll('img[src]')]
    const pageImages = [...(app?.querySelectorAll('img[src]') || [])]
      .filter(image => image.loading !== 'lazy')
    const startedAt = Number(screen.dataset.startedAt)
    const remaining = Number.isFinite(startedAt) ? Math.max(0, 3000 - (performance.now() - startedAt)) : 0
    const minimumDisplay = remaining > 0 ? new Promise(resolve => setTimeout(resolve, remaining)) : undefined
    await Promise.all([
      minimumDisplay,
      document.fonts?.ready,
      ...logos.map(image => waitForImage(image, true)),
      ...pageImages.map(image => waitForImage(image, false))
    ])
  } catch {
    if (document.getElementById('app-loading') === screen) showAppStartupError()
    return
  }
  if (document.getElementById('app-loading') !== screen || screen.dataset.state === 'error') return
  screen.remove()
  app?.removeAttribute('inert')
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
