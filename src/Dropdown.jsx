import { useEffect, useId, useRef, useState } from 'react'

// Small custom select: button + listbox, mouse and keyboard (arrows, Enter, Escape).
export default function Dropdown({ value, options, onChange, label, className = '', compact = false }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listId = useId()

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  function openMenu() {
    setActive(selectedIndex)
    setOpen(true)
  }

  function choose(index) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      setActive((i) => (event.key === 'ArrowDown' ? (i + 1) % options.length : (i - 1 + options.length) % options.length))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) openMenu()
      else choose(active)
    }
  }

  return (
    <div ref={rootRef} className={`dropdown${compact ? ' dropdown-compact' : ''}${className ? ` ${className}` : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="dropdown-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="dropdown-value">{selected?.label}</span>
        <svg className="dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="dropdown-menu" role="listbox" id={listId} aria-label={label}>
          {options.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`dropdown-option${index === active ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
