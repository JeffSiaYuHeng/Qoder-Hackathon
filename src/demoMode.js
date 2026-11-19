// HACK: stage-demo mode. Open the app with ?demo=1 and the Call / Email buttons show an
// in-app confirmation instead of launching FaceTime or Mail on the presenting laptop.
// Off unless the URL asks for it, so real users always get real tel:/mailto: links.

const DEMO = new URLSearchParams(window.location.search).has('demo')

let timer
function toast(text) {
  let el = document.querySelector('.demo-toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'demo-toast no-print'
    el.setAttribute('role', 'status')
    document.body.appendChild(el)
  }
  el.textContent = text
  el.classList.remove('show')
  void el.offsetWidth // restart the entrance animation
  el.classList.add('show')
  clearTimeout(timer)
  timer = setTimeout(() => el.classList.remove('show'), 2600)
}

if (DEMO) {
  document.documentElement.dataset.demo = 'on'
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest?.('a[href^="tel:"], a[href^="mailto:"]')
      if (!link) return
      event.preventDefault()
      const href = link.getAttribute('href')
      if (href.startsWith('tel:')) {
        const number = decodeURIComponent(href.slice(4)).replace(/^\+60/, '0')
        toast(`Calling ${number}… (demo: no real call)`)
      } else {
        const to = decodeURIComponent(href.slice(7).split('?')[0])
        toast(`Email draft ready for ${to} (demo: nothing sent)`)
      }
    },
    true,
  )
}
