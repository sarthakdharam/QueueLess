import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from '../i18n.jsx'

export default function DropdownSelect({ value = '', options = [], onChange, label, required = false, invalid = false, placeholder = 'Choose an option', className = '', searchable }) {
  const t = useTranslate()
  const root = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const normalizedOptions = options.map((option) => {
    const item = typeof option === 'string' ? { value: option, label: option } : option
    return { ...item, label: t(item.label) }
  })
  const showSearch = searchable ?? normalizedOptions.length > 8
  const selected = normalizedOptions.find((option) => String(option.value) === String(value))
  const filtered = useMemo(() => normalizedOptions.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())), [normalizedOptions, query])

  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (option) => {
    if (option.disabled) return
    onChange(option.value)
    setQuery('')
    setOpen(false)
  }

  return <div className={`dropdown-select state-select ${className}`} ref={root}>
    <button type="button" className="dropdown-trigger" role="combobox" aria-label={t(label)} aria-haspopup="listbox" aria-expanded={open} aria-required={required || undefined} aria-invalid={invalid || undefined} onClick={() => { setOpen((wasOpen) => !wasOpen); setQuery('') }} onKeyDown={(event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, filtered.length - 1)) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)) }
      if (event.key === 'Enter' && open && filtered[active]) { event.preventDefault(); choose(filtered[active]) }
      if (event.key === 'Escape') setOpen(false)
    }}><span className={selected ? '' : 'dropdown-placeholder'}>{selected?.label || t(placeholder)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    {open && <div className="dropdown-popover">
      {showSearch && <input className="dropdown-search" type="search" aria-label={`${t('Search')} ${t(label)}`} autoComplete="off" placeholder={`${t('Search')} ${t(label).toLowerCase()}…`} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0) }} onKeyDown={(event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, filtered.length - 1)) }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)) }
        if (event.key === 'Enter' && filtered[active]) { event.preventDefault(); choose(filtered[active]) }
        if (event.key === 'Escape') setOpen(false)
      }}/>} 
      <ul className="state-options dropdown-options" role="listbox" aria-label={t(label)}>{filtered.length ? filtered.map((option, index) => <li key={String(option.value)} role="option" aria-selected={String(value) === String(option.value)} aria-disabled={option.disabled || undefined} className={`${index === active ? 'active' : ''} ${option.disabled ? 'option-disabled' : ''}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>{option.label}</li>) : <li className="state-no-results" role="status">{t(`No ${label.toLowerCase()} found for “`)}{query}”.</li>}</ul>
    </div>}
  </div>
}
