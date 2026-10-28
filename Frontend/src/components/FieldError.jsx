export function RequiredLabel({ children, htmlFor, optional = false }) {
  return <label htmlFor={htmlFor}>{children}{optional ? <small className="optional-label">Optional</small> : <span className="required-mark" aria-hidden="true"> *</span>}</label>
}

export function FieldError({ id, children }) {
  return children ? <small className="field-error" id={id} role="alert">{children}</small> : null
}
