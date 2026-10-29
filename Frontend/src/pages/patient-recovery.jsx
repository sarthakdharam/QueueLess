import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PatientShell from '../components/PatientShell.jsx'
import { api } from '../api/client.js'
import { FieldError } from '../components/FieldError.jsx'
import { mobileRule, required, validateFields } from '../components/validation.js'

const ACTIVE = new Set(['registered', 'waiting', 'called', 'in_consultation', 'missed'])

export default function PatientRecovery() {
  const [mobile, setMobile] = useState('+91 ')
  const [code, setCode] = useState('')
  const [developmentCode, setDevelopmentCode] = useState('')
  const [lookupToken, setLookupToken] = useState('')
  const [appointments, setAppointments] = useState([])
  const [privateLinks, setPrivateLinks] = useState({})
  const [selectedReference, setSelectedReference] = useState('')
  const [step, setStep] = useState('request')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!cooldown) return undefined
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const loadAppointments = useCallback(async (token, showError = true) => {
    if (showError) setLoadingAppointments(true)
    try {
      const { data } = await api.get('/patient/recovery/appointments', { headers: { Authorization: `Bearer ${token}` } })
      setAppointments(data.appointments)
      setError('')
      if (showError) setLoadingAppointments(false)
      return true
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setLookupToken('')
        setAppointments([])
        setStep('request')
        setError('Your secure lookup session expired. Verify your mobile number again.')
      } else if (showError) setError(requestError.response?.data?.error || 'Appointments could not be loaded.')
      if (showError) setLoadingAppointments(false)
      return false
    }
  }, [])

  useEffect(() => {
    if (!lookupToken) return undefined
    const initialLoad = window.setTimeout(() => { void loadAppointments(lookupToken) }, 0)
    const timer = window.setInterval(() => { void loadAppointments(lookupToken, false) }, 30000)
    return () => { window.clearTimeout(initialLoad); window.clearInterval(timer) }
  }, [lookupToken, loadAppointments])

  const updateMobile = (value) => {
    setMobile(value)
    if (!fieldErrors.mobile) return
    const nextError = validateFields({ mobile: value }, { mobile: [required('Mobile number'), mobileRule] }).mobile
    setFieldErrors((old) => ({ ...old, mobile: nextError }))
  }
  const updateCode = (value) => {
    const next = value.replace(/\D/g, '').slice(0, 6)
    setCode(next)
    if (!fieldErrors.code) return
    const nextError = validateFields({ code: next }, { code: [required('Verification code'), { test: (entry) => /^\d{6}$/.test(entry), message: 'Enter the six-digit verification code.' }] }).code
    setFieldErrors((old) => ({ ...old, code: nextError }))
  }

  const requestCode = async (event) => {
    event.preventDefault()
    setError('')
    const invalid = validateFields({ mobile }, { mobile: [required('Mobile number'), mobileRule] })
    setFieldErrors(invalid)
    if (Object.keys(invalid).length || busy) return
    setBusy(true)
    try {
      const { data } = await api.post('/patient/recovery/request', { mobile })
      setDevelopmentCode(data.developmentCode || '')
      setCode('')
      setStep('verify')
      setCooldown(60)
    } catch (requestError) { setError(requestError.response?.data?.error || 'Could not request a verification code.') }
    finally { setBusy(false) }
  }

  const verify = async (event) => {
    event.preventDefault()
    setError('')
    const invalid = validateFields({ code }, { code: [required('Verification code'), { test: (value) => /^\d{6}$/.test(value), message: 'Enter the six-digit verification code.' }] })
    setFieldErrors(invalid)
    if (Object.keys(invalid).length || busy) return
    setBusy(true)
    try {
      const { data } = await api.post('/patient/recovery/verify', { mobile, code })
      setLookupToken(data.lookupToken)
      setLoadingAppointments(true)
      setStep('appointments')
    } catch (requestError) { setError(requestError.response?.data?.error || 'The code could not be verified.') }
    finally { setBusy(false) }
  }

  const resend = async () => {
    if (cooldown || busy) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/patient/recovery/request', { mobile })
      setDevelopmentCode(data.developmentCode || '')
      setCooldown(60)
      setCode('')
    } catch (requestError) { setError(requestError.response?.data?.error || 'Could not resend the code.') }
    finally { setBusy(false) }
  }

  const logout = async () => {
    if (!lookupToken) return
    setBusy(true)
    try { await api.delete('/patient/recovery/session', { headers: { Authorization: `Bearer ${lookupToken}` } }) }
    finally {
      setBusy(false)
      setLookupToken('')
      setAppointments([])
      setPrivateLinks({})
      setSelectedReference('')
      setStep('request')
    }
  }

  const replacePrivateLink = async (reference) => {
    if (!lookupToken || busy) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/patient/recovery/appointments/${reference}/access`, {}, { headers: { Authorization: `Bearer ${lookupToken}` } })
      setPrivateLinks((links) => ({ ...links, [reference]: data.accessUrl }))
    } catch (requestError) { setError(requestError.response?.data?.error || 'Could not create a private appointment link.') }
    finally { setBusy(false) }
  }

  const activeAppointments = useMemo(() => appointments.filter((item) => ACTIVE.has(item.registrationStatus) || (item.appointment && !['cancelled', 'rescheduled'].includes(item.appointment.status) && new Date(item.appointment.scheduledAt) >= new Date())), [appointments])
  const pastAppointments = useMemo(() => appointments.filter((item) => !activeAppointments.includes(item)), [appointments, activeAppointments])
  const formatTime = (item) => item.appointment ? new Date(item.appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: item.clinic.timeZone || 'Asia/Kolkata' }) : 'Walk-in'
  const appointmentCard = (item) => {
    const expanded = selectedReference === item.reference
    return <article className="clinic-result my-appointment-card" key={item.reference}>
      <div className="my-appointment-summary"><span className="appointment-status">{item.appointment?.status || item.registrationStatus}</span><h2>{item.clinic.name}</h2><p>{formatTime(item)} · Token A{String(item.tokenNumber).padStart(2, '0')}</p><small>{item.doctor?.name || 'No doctor selected'}{item.doctor?.specialization ? ` · ${item.doctor.specialization}` : ''}</small></div>
      <button type="button" className="button button-light" aria-expanded={expanded} onClick={() => setSelectedReference(expanded ? '' : item.reference)}>{expanded ? 'Hide details' : 'View details'}</button>
      {expanded && <div className="my-appointment-details"><p><strong>Reference:</strong> {item.reference}</p><p><strong>Visit type:</strong> {item.visitType === 'walk_in' ? 'Walk-in' : 'Appointment'}</p><p><strong>Registration:</strong> {item.registrationStatus}{item.queueStatus ? ` · ${item.queueStatus}` : ''}</p><p><strong>Physical arrival:</strong> {item.arrivalStatus}</p><p><strong>Clinic:</strong> {item.clinic.address}, {item.clinic.city}{item.clinic.state ? `, ${item.clinic.state}` : ''}</p>{item.appointment && <p><strong>Scheduled appointment:</strong> {formatTime(item)}. This is the scheduled time, not a live queue position.</p>}{item.queuePosition && <p><strong>Current live queue position:</strong> {item.queuePosition}</p>}{item.estimate && <p><strong>Estimated wait:</strong> {item.estimate.minimumMinutes}–{item.estimate.maximumMinutes} minutes. {item.estimate.disclaimer}</p>}<p>{item.arrivalInstructions}</p>{privateLinks[item.reference] ? <a className="button button-light" href={privateLinks[item.reference]}>Open private appointment link ↗</a> : <button type="button" className="text-button" disabled={busy} onClick={() => replacePrivateLink(item.reference)}>{busy ? 'Creating link…' : 'Create a new private appointment link'}</button>}</div>}
    </article>
  }

  return <PatientShell><section className="patient-content">
    <div className="eyebrow">PATIENT PORTAL</div>
    <h1>{step === 'appointments' ? 'My appointments' : 'My Appointment'}</h1>
    {step === 'request' && <><p className="patient-intro">Enter your registered mobile number. We’ll send a verification code if appointments are associated with it.</p><p className="required-hint"><span className="required-mark">*</span> Required field</p><form noValidate className="patient-form" onSubmit={requestCode}><label className={fieldErrors.mobile ? 'has-field-error' : ''}>Mobile number<span className="required-mark"> *</span><input required type="tel" inputMode="tel" autoComplete="tel" value={mobile} aria-invalid={!!fieldErrors.mobile} onChange={(event) => updateMobile(event.target.value)} placeholder="+91 98765 43210"/><FieldError>{fieldErrors.mobile}</FieldError></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark form-submit" disabled={busy}>{busy ? 'Sending code…' : 'Continue'}</button></form></>}
    {step === 'verify' && <><p className="patient-intro">Enter the six-digit code sent to your registered mobile number. If no appointment matches, the response remains private.</p><form noValidate className="patient-form" onSubmit={verify}><label className={fieldErrors.code ? 'has-field-error' : ''}>Verification code<span className="required-mark"> *</span><input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" value={code} aria-invalid={!!fieldErrors.code} onChange={(event) => updateCode(event.target.value)}/><FieldError>{fieldErrors.code}</FieldError></label>{developmentCode && <p className="dev-code">Local development simulator code: <strong>{developmentCode}</strong></p>}{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark form-submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}</button></form><button type="button" className="text-button" disabled={busy || cooldown > 0} onClick={resend}>{cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}</button><button type="button" className="text-button" onClick={() => { setStep('request'); setError(''); setCode('') }}>← Change mobile number</button></>}
    {step === 'appointments' && <><p className="patient-intro">Your appointment details are refreshed from the clinic system every 30 seconds. Queue position and waiting estimates can change.</p>{loadingAppointments ? <p className="muted" role="status">Loading your appointments…</p> : appointments.length === 0 ? <div className="patient-empty"><h2>No appointments found</h2><p>There are no upcoming or recent appointments for this number. You can book a visit or check the mobile number.</p><Link className="button button-dark" to="/clinics">Book an appointment</Link></div> : <><h2 className="appointment-section-title">Upcoming and active</h2>{activeAppointments.length ? <div className="clinic-results">{activeAppointments.map(appointmentCard)}</div> : <div className="patient-empty"><p>No upcoming or active visits.</p></div>}{pastAppointments.length > 0 && <><h2 className="appointment-section-title">Recent and past visits</h2><div className="clinic-results">{pastAppointments.map(appointmentCard)}</div></>}</>}{error && <p className="form-error" role="alert">{error}</p>}<button type="button" className="text-button" disabled={busy} onClick={logout}>{busy ? 'Signing out…' : 'Sign out of appointment lookup'}</button></>}
    <Link className="patient-home-link" to="/">Return to QueueLess home</Link>
  </section></PatientShell>
}
