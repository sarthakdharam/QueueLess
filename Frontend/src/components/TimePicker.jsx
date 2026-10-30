import { useState } from 'react'
import DropdownSelect from './DropdownSelect.jsx'
import { useTranslate } from '../i18n.jsx'

const toParts = (value) => {
  const [rawHour = '09', minute = '00'] = (value || '09:00').split(':')
  const hour = Number(rawHour)
  return { hour: String(hour % 12 || 12), minute, period: hour >= 12 ? 'PM' : 'AM' }
}

const toValue = ({ hour, minute, period }) => {
  const hour24 = (Number(hour) % 12) + (period === 'PM' ? 12 : 0)
  return `${String(hour24).padStart(2, '0')}:${minute}`
}

const formatTime = (value) => {
  const parts = toParts(value)
  return `${parts.hour}:${parts.minute} ${parts.period}`
}

export default function TimePicker({ value, onChange, label, invalid = false, disabled = false }) {
  const t = useTranslate()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => toParts(value))

  const showPicker = () => {
    setDraft(toParts(value))
    setOpen(true)
  }

  return <div className="time-picker">
    <input type="text" readOnly value={formatTime(value)} aria-label={t(label)} aria-invalid={invalid || undefined} disabled={disabled} onClick={showPicker} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showPicker() } }}/>
    <button type="button" className="time-picker-trigger" aria-label={`${t('Choose ')}${t(label).toLowerCase()}`} aria-expanded={open} disabled={disabled} onClick={open ? () => setOpen(false) : showPicker}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/></svg>
    </button>
    {open && <div className="time-picker-popover" role="dialog" aria-label={`${t('Choose ')}${t(label).toLowerCase()}`}>
      <div className="time-picker-title">{t(label)}</div>
      <div className="time-picker-controls">
        <div className="time-picker-control"><span>{t('Hour')}</span><DropdownSelect label="Hour" value={draft.hour} options={Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => ({ value: hour, label: hour.padStart(2, '0') }))} onChange={(hour) => setDraft({ ...draft, hour })}/></div>
        <span className="time-picker-colon" aria-hidden="true">:</span>
        <div className="time-picker-control"><span>{t('Minute')}</span><DropdownSelect label="Minute" value={draft.minute} options={Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => ({ value: minute, label: minute }))} onChange={(minute) => setDraft({ ...draft, minute })}/></div>
        <div className="time-picker-control"><span>{t('Period')}</span><DropdownSelect label="AM or PM" value={draft.period} options={['AM', 'PM']} onChange={(period) => setDraft({ ...draft, period })}/></div>
      </div>
      <div className="time-picker-actions"><button type="button" onClick={() => setOpen(false)}>{t('Cancel')}</button><button type="button" onClick={() => { onChange(toValue(draft)); setOpen(false) }}>{t('Apply time')}</button></div>
    </div>}
  </div>
}
