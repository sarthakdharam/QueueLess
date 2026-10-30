import { useEffect, useRef, useState } from 'react'
import { INDIAN_REGIONS } from './validation.js'
import { useTranslate } from '../i18n.jsx'

function isOneCharacterAway(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false
  let leftIndex = 0
  let rightIndex = 0
  let differences = 0
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1
      rightIndex += 1
      continue
    }
    differences += 1
    if (differences > 1) return false
    if (left.length > right.length) leftIndex += 1
    else if (right.length > left.length) rightIndex += 1
    else {
      leftIndex += 1
      rightIndex += 1
    }
  }
  return differences + (leftIndex < left.length || rightIndex < right.length ? 1 : 0) <= 1
}

export default function StateSelect({ value, onChange, id = 'clinic-state', invalid = false, errorId }) {
  const t = useTranslate()
  const [query, setQuery] = useState(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef(null)
  const displayedQuery = query === null ? value || '' : query
  const normalizedQuery = displayedQuery.trim().toLowerCase()
  const matchingRegions = INDIAN_REGIONS.filter((region) => region.toLowerCase().includes(normalizedQuery))
  const matches = matchingRegions.length || normalizedQuery.length < 5
    ? matchingRegions
    : INDIAN_REGIONS.filter((region) => isOneCharacterAway(normalizedQuery, region.toLowerCase()))
  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const choose = (region) => { onChange(region); setQuery(region); setOpen(false) }
  return <div className="state-select" ref={root}>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open && matches[active] ? `${id}-option-${INDIAN_REGIONS.indexOf(matches[active])}` : undefined} aria-invalid={invalid || undefined} aria-describedby={errorId} autoComplete="off" required value={displayedQuery} onFocus={() => setOpen(true)} onClick={(event) => {
      const end = event.currentTarget.value.length
      event.currentTarget.setSelectionRange(end, end)
    }} onBlur={() => {
      const exactMatch = INDIAN_REGIONS.find((region) => region.toLowerCase() === displayedQuery.trim().toLowerCase())
      if (exactMatch) choose(exactMatch)
      else if (matches.length === 1) choose(matches[0])
      else setOpen(false)
    }} onChange={(event) => { setQuery(event.target.value); onChange(''); setActive(0); setOpen(true) }} onKeyDown={(event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, matches.length - 1)) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)) }
      if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[active]) choose(matches[active]) }
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'Tab') setOpen(false)
    }} />
    {open && <ul className="state-options" id={`${id}-options`} role="listbox" aria-label={t('Indian states and union territories')}>{matches.length ? matches.map((region) => <li id={`${id}-option-${INDIAN_REGIONS.indexOf(region)}`} role="option" aria-selected={value === region} key={region} className={matches[active] === region ? 'active' : ''} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(matches.indexOf(region))} onClick={() => choose(region)}>{region}</li>) : <li className="state-no-results" role="status">{t('No state or Union Territory matches “')}{displayedQuery.trim()}”.</li>}</ul>}
    <span className="sr-only" aria-live="polite">{value ? `${t('Selected')} ${value}` : ''}</span>
  </div>
}
