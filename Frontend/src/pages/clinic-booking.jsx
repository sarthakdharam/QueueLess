import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAppLanguage } from '../i18n.jsx'
import PatientShell from '../components/PatientShell.jsx'
import { api } from '../api/client.js'
import { FieldError } from '../components/FieldError.jsx'
import DropdownSelect from '../components/DropdownSelect.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { mobileRule, minLength, required, validateFields } from '../components/validation.js'

export default function ClinicBooking() {
  const { locale } = useAppLanguage()
  const { clinicId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const currentPathRef = useRef('')
  const currentHistoryStateRef = useRef(null)
  const idempotencyKeyRef = useRef(sessionStorage.getItem(`queueless.booking-key.${clinicId}`) || '')
  const [clinic, setClinic] = useState(null)
  const [availability, setAvailability] = useState({ appointmentBookingEnabled: false, walkInsEnabled: false })
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({ doctorId: '', name: '', mobile: '', visitType: 'appointment', appointmentDate: '', slotTime: '', consentToContact: false })
  const [slots, setSlots] = useState([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [result, setResult] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const [copyMessage, setCopyMessage] = useState('')
  const currentPath = `${location.pathname}${location.search}${location.hash}`
  useEffect(() => {
    currentPathRef.current = currentPath
    currentHistoryStateRef.current = window.history.state
  }, [currentPath])
  const requestNavigation = (to) => {
    if (isDirty) setPendingNavigation({ to, replace: false })
    else navigate(to)
  }
  const handleNavigationCapture = (event) => {
    if (!isDirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target.closest?.('a[href]')
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
    const target = new URL(anchor.href, window.location.href)
    if (target.origin !== window.location.origin) return
    event.preventDefault()
    event.stopPropagation()
    setPendingNavigation({ to: `${target.pathname}${target.search}${target.hash}`, replace: false })
  }
  useEffect(() => {
    if (!isDirty) return undefined
    const guardPopstate = (event) => {
      const current = currentPathRef.current
      const destination = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (destination === current) return
      event.stopImmediatePropagation()
      window.history.pushState(currentHistoryStateRef.current, '', current)
      setPendingNavigation({ to: destination, replace: true })
    }
    window.addEventListener('popstate', guardPopstate, true)
    return () => window.removeEventListener('popstate', guardPopstate, true)
  }, [isDirty])
  const copyPrivateLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopyMessage('Private appointment link copied.')
    } catch {
      setCopyMessage('Copy is unavailable here. Use “View registration” to save your visit link.')
    }
  }
  useEffect(() => { api.get(`/public/clinics/${clinicId}`).then(({ data }) => { setClinic(data.clinic); setDoctors(data.doctors); setAvailability(data); setForm((old) => ({ ...old, visitType: data.appointmentBookingEnabled || !data.walkInsEnabled ? 'appointment' : 'walk_in', ...(data.doctors.length === 1 ? { doctorId: data.doctors[0].id } : {}) })) }).catch(() => setError('Clinic not found or unavailable.')).finally(() => setLoading(false)) }, [clinicId])
  useEffect(() => { if (form.visitType !== 'appointment' || !form.doctorId || !form.appointmentDate) return; let active = true; api.get(`/public/clinics/${clinicId}/slots`, { params: { doctorId: form.doctorId, date: form.appointmentDate } }).then(({ data }) => { if (active) setSlots(data.slots) }).catch(() => { if (active) setSlots([]) }); return () => { active = false } }, [clinicId, form.doctorId, form.appointmentDate, form.visitType])
  const change = (field, value) => { setForm((old) => ({ ...old, [field]: value })); setIsDirty(true); if (!fieldErrors[field]) return; const rules = { name: [required('Your name'), minLength(2, 'Your name')], mobile: [required('Mobile number'), mobileRule], consentToContact: [{ test: Boolean, message: 'Consent is required to receive registration updates.' }], doctorId: [required('Doctor')], appointmentDate: [required('Appointment date'), { test: (date) => date >= new Date().toISOString().slice(0, 10), message: 'Choose today or a future date.' }], slotTime: [required('Appointment time')], visitType: [required('Visit type')] }; const nextError = validateFields({ [field]: value }, { [field]: rules[field] })[field]; setFieldErrors((old) => ({ ...old, [field]: nextError })) }
  const submit = async (event) => { event.preventDefault(); setError(''); const rules = { name: [required('Your name'), minLength(2, 'Your name')], mobile: [required('Mobile number'), mobileRule], consentToContact: [{ test: Boolean, message: 'Consent is required to receive registration updates.' }] }; if (form.visitType === 'appointment') Object.assign(rules, { doctorId: [required('Doctor')], appointmentDate: [required('Appointment date')], slotTime: [required('Appointment time')] }); const invalid = validateFields(form, rules); setFieldErrors(invalid); if (Object.keys(invalid).length) return; setBusy(true); try { if (!idempotencyKeyRef.current) { idempotencyKeyRef.current = crypto.randomUUID(); sessionStorage.setItem(`queueless.booking-key.${clinicId}`, idempotencyKeyRef.current) } const { data } = await api.post('/public/registrations', { ...form, clinicId }, { headers: { 'Idempotency-Key': idempotencyKeyRef.current } }); sessionStorage.removeItem(`queueless.booking-key.${clinicId}`); idempotencyKeyRef.current = ''; sessionStorage.setItem('queueless.patient-link', data.accessUrl.split('#')[1]); setIsDirty(false); setResult(data); window.history.replaceState(null, '', data.accessUrl) } catch (requestError) { const details = requestError.response?.data?.details || []; if (details.length) { const mapped = Object.fromEntries(details.map((item) => [item.path, item.msg])); setFieldErrors((old) => ({ ...old, ...mapped })) } setError(requestError.response?.data?.error || 'Unable to register. Please try again.') } finally { setBusy(false) } }
  if (loading) return <PatientShell><section className="patient-content"><p>Loading clinic…</p></section></PatientShell>
  if (result) return <PatientShell><section className="patient-content patient-confirmation"><Link className="back-arrow-link patient-top-back" to="/clinics">Back to clinic search</Link><div className="eyebrow">REGISTRATION CONFIRMED</div><h1>You’re on the list.</h1><p className="patient-intro">{result.clinic.name} · {result.clinic.address}, {result.clinic.city}</p><p className="muted">Your private visit link is ready. Copy it somewhere safe to reopen the registration from another device, or check My Appointment with your mobile number.</p><div className="patient-confirmation-actions"><button type="button" className="button button-light" onClick={() => copyPrivateLink(result.accessUrl)}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>Copy private appointment link</button>{copyMessage && <p className="copy-status" role="status">{copyMessage}</p>}</div><div className="confirmation-card"><span>REFERENCE</span><strong>{result.registration.reference}</strong><span>REGISTRATION STATUS</span><strong>{result.registration.status}</strong><span>TOKEN</span><strong>A{String(result.registration.tokenNumber).padStart(2, '0')}</strong>{result.doctor && <p>Doctor: {result.doctor.name}{result.doctor.specialization ? ` · ${result.doctor.specialization}` : ''}</p>}{result.appointment && <p>Appointment time: {new Date(result.appointment.scheduledAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: result.appointment.timeZone })} ({result.appointment.timeZone}). This is your scheduled appointment time, not a live queue position.</p>}<p>{result.arrivalInstructions}</p><a className="button button-dark" href={result.accessUrl}>View My Appointment <span>↗</span></a></div></section></PatientShell>
  return <PatientShell onNavigationCapture={handleNavigationCapture}>{pendingNavigation && <ConfirmDialog title="Discard appointment details?" description="Your appointment details have not been submitted. Leaving will clear this form." confirmLabel="Leave booking" cancelLabel="Continue booking" destructive onClose={() => setPendingNavigation(null)} onConfirm={() => { const destination = pendingNavigation; setPendingNavigation(null); setIsDirty(false); navigate(destination.to, { replace: destination.replace }) }}/>}<section className="patient-content"><button type="button" className="back-link back-arrow-link inline-back patient-back-button" onClick={() => requestNavigation('/clinics')}>All clinics</button><div className="eyebrow">BOOK A VISIT</div><h1>{clinic?.name || 'Clinic'}</h1><p className="patient-intro">{clinic?.address}{clinic?.city ? `, ${clinic.city}` : ''}{clinic?.state ? `, ${clinic.state}` : ''}</p>{clinic?.contactNumber && <p className="muted">Clinic phone: {clinic.contactNumber}</p>}{!availability.appointmentBookingEnabled && !availability.walkInsEnabled ? <div className="patient-empty"><h2>Online registration unavailable</h2><p>Call the clinic to arrange your visit.</p></div> : <><form noValidate className="patient-form" onSubmit={submit}><label>Visit type<span className="required-mark"> *</span><DropdownSelect label="Visit type" required value={form.visitType} options={[{ value: 'appointment', label: 'Book an appointment', disabled: !availability.appointmentBookingEnabled }, { value: 'walk_in', label: 'Join today’s walk-in queue', disabled: !availability.walkInsEnabled }]} onChange={(value) => change('visitType', value)}/></label>{form.visitType === 'walk_in' && doctors.length > 1 && <label>Doctor <small className="optional-label">Optional</small><DropdownSelect label="Doctor" value={form.doctorId} options={[{ value: '', label: 'Any available doctor' }, ...doctors.map((d) => ({ value: d.id, label: `${d.name}${d.specialization ? ` · ${d.specialization}` : ''}` }))]} onChange={(value) => change('doctorId', value)}/></label>}{form.visitType === 'appointment' && <><label className={fieldErrors.doctorId ? 'has-field-error' : ''}>Doctor<span className="required-mark"> *</span><DropdownSelect label="Doctor" required invalid={!!fieldErrors.doctorId} value={form.doctorId} options={[{ value: '', label: 'Choose a doctor' }, ...doctors.map((d) => ({ value: d.id, label: `${d.name}${d.specialization ? ` · ${d.specialization}` : ''}` }))]} onChange={(value) => { change('doctorId', value); change('slotTime', '') }}/><FieldError>{fieldErrors.doctorId}</FieldError></label><label className={fieldErrors.appointmentDate ? 'has-field-error' : ''}>Appointment date<span className="required-mark"> *</span><input required aria-invalid={!!fieldErrors.appointmentDate} type="date" min={new Date().toISOString().slice(0, 10)} value={form.appointmentDate} onChange={(e) => { change('appointmentDate', e.target.value); change('slotTime', '') }}/><FieldError>{fieldErrors.appointmentDate}</FieldError></label>{form.doctorId && form.appointmentDate && <fieldset className={`slot-picker ${fieldErrors.slotTime ? 'has-field-error' : ''}`}><legend>Available times<span className="required-mark"> *</span></legend>{slots.length ? slots.map((slot) => <label key={slot.time} className={form.slotTime === slot.time ? 'slot selected' : 'slot'}><input type="radio" required name="slotTime" value={slot.time} checked={form.slotTime === slot.time} onChange={(e) => change('slotTime', e.target.value)}/><span>{slot.time}</span><small>{slot.remaining} left</small></label>) : <p className="muted">No times available. Choose another date.</p>}<FieldError>{fieldErrors.slotTime}</FieldError></fieldset>}</>}<label className={fieldErrors.name ? 'has-field-error' : ''}>Your name<span className="required-mark"> *</span><input required minLength="2" maxLength="160" autoComplete="name" value={form.name} aria-invalid={!!fieldErrors.name} onChange={(e) => change('name', e.target.value)}/><FieldError>{fieldErrors.name}</FieldError></label><label className={fieldErrors.mobile ? 'has-field-error' : ''}>Mobile number<span className="required-mark"> *</span><input required type="tel" autoComplete="tel" value={form.mobile} aria-invalid={!!fieldErrors.mobile} onChange={(e) => change('mobile', e.target.value)} placeholder="+91 98765 43210"/><FieldError>{fieldErrors.mobile}</FieldError></label><label className={`terms-check ${fieldErrors.consentToContact ? 'has-field-error' : ''}`}><input type="checkbox" required checked={form.consentToContact} aria-invalid={!!fieldErrors.consentToContact} onChange={(e) => change('consentToContact', e.target.checked)}/><span>I agree to receive registration updates from the clinic.<span className="required-mark"> *</span><FieldError>{fieldErrors.consentToContact}</FieldError></span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark form-submit" disabled={busy}>{busy ? 'Registering…' : 'Confirm registration'} <span>↗</span></button></form></>}</section></PatientShell>
}
