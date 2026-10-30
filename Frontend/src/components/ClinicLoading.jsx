import { useTranslate } from '../i18n.jsx'

export default function ClinicLoading({ children = 'Loading clinic data…', compact = false }) {
  const t = useTranslate()
  return <div className={`clinic-page-loading${compact ? ' is-compact' : ''}`} role="status" aria-live="polite">
    <span className="clinic-loading-spinner" aria-hidden="true" />
    <span>{t(children)}</span>
  </div>
}
