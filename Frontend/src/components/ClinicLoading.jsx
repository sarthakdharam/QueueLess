export default function ClinicLoading({ children = 'Loading clinic data…', compact = false }) {
  return <div className={`clinic-page-loading${compact ? ' is-compact' : ''}`} role="status" aria-live="polite">
    <span className="clinic-loading-spinner" aria-hidden="true" />
    <span>{children}</span>
  </div>
}
