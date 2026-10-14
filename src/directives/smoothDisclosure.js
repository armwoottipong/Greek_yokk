// Keep native details semantics and mounted form drafts while animating its measured height.
const cleanups = new WeakMap()
export const vSmoothDisclosure = {
 mounted(el) {
  const summary = el.querySelector(':scope > summary')
  if (!summary) return
  let animation = null
  let expanded = el.open
  const originalHeight = el.style.height
  const originalOverflow = el.style.overflow
  const body = [...el.children].filter(child => child !== summary)
  const restore = () => {
   el.style.height = originalHeight
   el.style.overflow = originalOverflow
   body.forEach(child => child.removeAttribute('inert'))
  }
  const stop = () => {
   if (animation) {
    animation.onfinish = null
    animation.cancel()
    animation = null
   }
  }
  const toggle = event => {
   event.preventDefault()
   const start = el.getBoundingClientRect().height
   stop()
   expanded = !expanded
   summary.setAttribute('aria-expanded', String(expanded))
   if (!expanded && body.some(child => child.contains(document.activeElement))) summary.focus()
   if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !el.animate) {
    el.open = expanded
    restore()
    return
   }
   restore()
   el.style.height = 'auto'
   el.open = expanded
   const end = el.getBoundingClientRect().height
   el.open = true // Keep the body rendered until the closing animation finishes.
   if (!expanded) body.forEach(child => child.setAttribute('inert', ''))
   el.style.height = `${start}px`
   el.style.overflow = 'hidden'
   animation = el.animate([{height:`${start}px`},{height:`${end}px`}], {
    duration: expanded ? 260 : 200, easing:'cubic-bezier(.2,.8,.3,1)', fill:'forwards'
   })
   animation.onfinish = () => {
    el.open = expanded
    stop()
    restore()
   }
  }
  summary.setAttribute('aria-expanded', String(expanded))
  summary.addEventListener('click', toggle)
  cleanups.set(el, () => { stop(); restore(); summary.removeEventListener('click', toggle) })
 },
 unmounted(el) { cleanups.get(el)?.(); cleanups.delete(el) }
}
