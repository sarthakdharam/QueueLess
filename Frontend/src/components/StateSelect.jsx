import { useEffect, useRef, useState } from 'react'
import { INDIAN_REGIONS } from './validation.js'

export default function StateSelect({ value, onChange, id = 'clinic-state', invalid = false, errorId }) {
  const [query, setQuery] = useState(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef(null)
  const displayedQuery = query === null ? value || '' : query
  const matches = INDIAN_REGIONS.filter((region) => region.toLowerCase().includes(displayedQuery.trim().toLowerCase()))
  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const choose = (region) => { onChange(region); setQuery(region); setOpen(false) }
  return <div className="state-select" ref={root}>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open && matches[active] ? `${id}-option-${INDIAN_REGIONS.indexOf(matches[active])}` : undefined} aria-invalid={invalid || undefined} aria-describedby={errorId} autoComplete="off" required value={displayedQuery} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); onChange(''); setActive(0); setOpen(true) }} onKeyDown={(event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, matches.length - 1)) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)) }
      if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[active]) choose(matches[active]) }
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'Tab') setOpen(false)
    }} />
    {open && <ul className="state-options" id={`${id}-options`} role="listbox" aria-label="Indian states and union territories">{matches.length ? matches.map((region) => <li id={`${id}-option-${INDIAN_REGIONS.indexOf(region)}`} role="option" aria-selected={value === region} key={region} className={matches[active] === region ? 'active' : ''} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(matches.indexOf(region))} onClick={() => choose(region)}>{region}</li>) : <li className="state-no-results" role="status">No state or Union Territory matches “{query}”.</li>}</ul>}
    <span className="sr-only" aria-live="polite">{value ? `Selected ${value}` : ''}</span>
  </div>
}
