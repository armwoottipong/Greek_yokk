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

export async function waitForPageImages(root) {
  const images = [...(root?.querySelectorAll('img[src]') || [])].filter(image => image.loading !== 'lazy')
  await Promise.all([document.fonts?.ready, ...images.map(image => waitForImage(image, false))])
}

const startupExits = new WeakMap()

async function animateStartupExit(screen, app) {
  const logo = screen.querySelector('.startup-mascot')
  if (!logo?.animate || !screen.animate || !app?.animate) return
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const duration = reducedMotion ? 180 : 800
  const options = { duration, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'both' }
  const animations = []
  startupExits.set(screen, animations)
  screen.dataset.state = 'exiting'
  try {
    if (!reducedMotion) {
      // The mascot occupies roughly two thirds of its transparent artboard.
      // Four viewport diagonals cover the corners even on tall phone screens.
      const scale = Math.max(1, 4 * Math.hypot(window.innerWidth, window.innerHeight) / Math.max(1, logo.offsetWidth))
      animations.push(logo.animate([
        { transform: 'scale(1)' },
        { transform: `scale(${scale})`, offset: .75 },
        { transform: `scale(${scale})` }
      ], options))
    }
    animations.push(screen.animate([
      { opacity: 1 },
      { opacity: 1, offset: reducedMotion ? 0 : .45 },
      { opacity: 0 }
    ], options))
    animations.push(app.animate([
      { opacity: 0 },
      { opacity: 0, offset: reducedMotion ? 0 : .35 },
      { opacity: 1 }
    ], options))
    await Promise.all(animations.map(animation => animation.finished))
  } catch {
    // Interrupted or unsupported animation must not trap a ready app.
  } finally {
    if (startupExits.get(screen) === animations) {
      animations.forEach(animation => animation.cancel())
      startupExits.delete(screen)
    }
  }
}

export async function finishAppStartup() {
  const screen = document.getElementById('app-loading')
  if (!screen || screen.dataset.state === 'error' || screen.dataset.state === 'exiting') return
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
  if (document.getElementById('app-loading') !== screen || screen.dataset.state === 'error' || screen.dataset.state === 'exiting') return
  await animateStartupExit(screen, app)
  if (document.getElementById('app-loading') !== screen || screen.dataset.state === 'error') return
  screen.remove()
  app?.removeAttribute('inert')
}

export function showAppStartupError() {
  const screen = document.getElementById('app-loading')
  if (!screen) return
  startupExits.get(screen)?.forEach(animation => animation.cancel())
  startupExits.delete(screen)
  screen.dataset.state = 'error'
  const message = screen.querySelector('[data-startup-message]')
  message.textContent = 'โหลดร้านไม่สำเร็จ ลองโหลดใหม่อีกครั้งนะ'
  message.setAttribute('role', 'alert')
  const retry = screen.querySelector('[data-startup-retry]')
  retry.hidden = false
  retry.onclick = () => window.location.reload()
}
