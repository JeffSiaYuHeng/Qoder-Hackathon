import { useState } from 'react'

// Light/dark switch. Starts from the device setting (or the last choice on this device,
// applied before first paint by the inline script in index.html) and remembers a change.
function currentTheme() {
  const set = document.documentElement.dataset.theme
  return set || 'dark' // dark is the brand default (see index.html)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  function toggle() {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // private mode: the choice just isn't remembered
    }
    setTheme(next)
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
