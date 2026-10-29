import { useEffect, useId, useRef } from 'react'

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'

export default function ConfirmDialog({ title, description, confirmLabel, cancelLabel = 'Keep me here', busy = false, error = '', destructive = false, onConfirm, onClose, children }) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!busy) onClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])]
    if (!items.length) {
      event.preventDefault()
      dialogRef.current?.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return <div className="app-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section ref={dialogRef} className="app-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex="-1" onKeyDown={handleKeyDown}>
      <div className="app-dialog-mark" aria-hidden="true">{destructive ? '!' : '?'}</div>
      <h2 id={titleId}>{title}</h2>
      {description && <p id={descriptionId} className="app-dialog-description">{description}</p>}
      {children && <div className="app-dialog-content">{children}</div>}
      {error && <p className="app-dialog-error" role="alert">{error}</p>}
      <div className="app-dialog-actions">
        <button ref={cancelRef} type="button" className="button app-dialog-cancel" disabled={busy} onClick={onClose}>{cancelLabel}</button>
        <button type="button" className={`button button-dark app-dialog-confirm ${destructive ? 'is-destructive' : ''}`} disabled={busy} onClick={onConfirm}>{busy ? 'Please wait…' : confirmLabel}</button>
      </div>
    </section>
  </div>
}
