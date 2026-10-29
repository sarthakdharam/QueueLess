import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Localized } from '../i18n.jsx'
import { api } from '../api/client.js'
import Brand from '../components/Brand.jsx'
import StateSelect from '../components/StateSelect.jsx'
import { FieldError } from '../components/FieldError.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ClinicLoading from '../components/ClinicLoading.jsx'
import { INDIAN_REGIONS, mobileRule, minLength, normalizeAppointmentCapacityInput, parseAppointmentCapacity, required, validateFields } from '../components/validation.js'

export default function ClinicSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPathRef = useRef('')
  const currentHistoryStateRef = useRef(null)
  const [data, setData] = useState(null)
  const [profile, setProfile] = useState({})
  const [settings, setSettings] = useState(null)
  const [appointmentCapacityInput, setAppointmentCapacityInput] = useState('')
  const [doctors, setDoctors] = useState([])
  const [doctor, setDoctor] = useState({ name: '', specialization: '', details: '' })
  const [breakEnabled, setBreakEnabled] = useState(false)
  const [breakTime, setBreakTime] = useState({ start: '13:00', end: '14:00' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const currentPath = `${location.pathname}${location.search}${location.hash}`
  useEffect(() => {
    currentPathRef.current = currentPath
    currentHistoryStateRef.current = window.history.state
  }, [currentPath])
  const fromPath = location.state?.from
  const fallbackPath = data?.setupComplete ? '/clinic/queue' : '/'
  const backPath = typeof fromPath === 'string' && /^\/clinic(?:\/|$)/.test(fromPath) ? fromPath : fallbackPath
  const requestNavigation = (to, replace = false) => {
    if (isDirty) setPendingNavigation({ to, replace })
    else navigate(to, { replace })
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
  useEffect(() => { api.get('/clinic/setup').then(({ data: initial }) => { setData(initial); setProfile({ name: initial.clinic.name, address: initial.clinic.address, city: initial.clinic.city, state: initial.clinic.state, contactNumber: initial.clinic.contactNumber, timeZone: initial.clinic.timeZone || 'Asia/Kolkata' }); setSettings(initial.settings); setAppointmentCapacityInput(String(initial.settings.appointmentCapacity ?? 4)); setDoctors(initial.doctors); if (initial.settings.breaks?.length) { setBreakEnabled(true); setBreakTime(initial.settings.breaks[0]) } if (initial.doctors[0]) setDoctor({ name: '', specialization: '', details: '' }) }).catch(() => setError('Could not load clinic setup. Please sign in again.')) }, [])
  const setHour = (day, field, value) => {
    setSettings((old) => ({ ...old, workingHours: { ...old.workingHours, [day]: { ...old.workingHours[day], [field]: value } } }))
    const key = `${day}.${field}`
    if (!fieldErrors[key]) return
    const other = field === 'open' ? settings.workingHours[day].close : settings.workingHours[day].open
    const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) && (field === 'open' || value > other)
    setFieldErrors((old) => ({ ...old, [key]: valid ? undefined : field === 'open' ? 'Enter a valid opening time.' : 'Closing time must be later than opening time.' }))
  }
  const updateProfile = (field, value) => {
    setProfile((old) => ({ ...old, [field]: value }))
    if (!fieldErrors[field]) return
    const rules = { name: [required('Clinic name'), minLength(2, 'Clinic name')], address: [required('Address'), minLength(5, 'Address')], city: [required('City'), minLength(2, 'City')], contactNumber: [required('Contact number'), mobileRule] }
    const nextError = field === 'state' ? (INDIAN_REGIONS.includes(value) ? undefined : 'Select a state or Union Territory from the list.') : validateFields({ [field]: value }, { [field]: rules[field] })[field]
    setFieldErrors((old) => ({ ...old, [field]: nextError }))
  }
  const updateSetting = (field, value) => {
    setSettings((old) => ({ ...old, [field]: value }))
    if (!fieldErrors[field]) return
    const rules = { appointmentCapacity: [{ test: (entry) => Number.isInteger(entry) && entry >= 1 && entry <= 100, message: 'Enter between 1 and 100 appointments per slot.' }], notifyAtPatientsAhead: [{ test: (entry) => Number.isInteger(entry) && entry >= 1 && entry <= 30, message: 'Enter a value from 1 to 30.' }], returnPatientsAhead: [{ test: (entry) => Number.isInteger(entry) && entry >= 0 && entry <= 30, message: 'Enter a value from 0 to 30.' }] }
    setFieldErrors((old) => ({ ...old, [field]: validateFields({ [field]: value }, { [field]: rules[field] })[field] }))
  }
  const capacityError = (value) => parseAppointmentCapacity(value) !== null ? undefined : 'Enter a whole number from 1 to 100.'
  const updateCapacity = (value) => {
    setAppointmentCapacityInput(value)
    if (fieldErrors.appointmentCapacity !== undefined) setFieldErrors((old) => ({ ...old, appointmentCapacity: capacityError(value) }))
  }
  const normalizeCapacityOnBlur = () => {
    const invalid = capacityError(appointmentCapacityInput)
    setFieldErrors((old) => ({ ...old, appointmentCapacity: invalid }))
    if (!invalid) setAppointmentCapacityInput(normalizeAppointmentCapacityInput(appointmentCapacityInput))
  }
  const save = async (event) => {
    event.preventDefault(); setError('')
    const rules = { name: [required('Clinic name'), minLength(2, 'Clinic name')], contactNumber: [required('Contact number'), mobileRule], address: [required('Address'), minLength(5, 'Address')], city: [required('City'), minLength(2, 'City')], state: [{ test: (value) => INDIAN_REGIONS.includes(value), message: 'Select a state or Union Territory from the list.' }], appointmentCapacity: [{ test: (value) => !capacityError(value), message: capacityError(appointmentCapacityInput) || 'Enter a whole number from 1 to 100.' }], notifyAtPatientsAhead: [{ test: (value) => Number.isInteger(value) && value >= 1 && value <= 30, message: 'Enter a value from 1 to 30.' }], returnPatientsAhead: [{ test: (value) => Number.isInteger(value) && value >= 0 && value <= 30, message: 'Enter a value from 0 to 30.' }] }
    Object.entries(settings.workingHours).forEach(([day, hours]) => {
      if (!hours.enabled) return
      rules[`${day}.open`] = [{ test: (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value), message: `${day} opening time is required.` }]
      rules[`${day}.close`] = [{ test: (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) && value > hours.open, message: `${day} closing time must be later than opening time.` }]
    })
    if (breakEnabled) {
      rules.breakStart = [{ test: (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value), message: 'Enter a valid break start time.' }]
      rules.breakEnd = [{ test: (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) && value > breakTime.start, message: 'Break end time must be later than its start.' }]
    }
    if (!doctors.length) Object.assign(rules, { doctorName: [required('Doctor name'), minLength(2, 'Doctor name')] })
    const hourValues = Object.fromEntries(Object.entries(settings.workingHours).flatMap(([day, hours]) => [[`${day}.open`, hours.open], [`${day}.close`, hours.close]]))
    const invalid = validateFields({ ...profile, ...settings, appointmentCapacity: appointmentCapacityInput, ...hourValues, breakStart: breakTime.start, breakEnd: breakTime.end, doctorName: doctor.name }, rules); setFieldErrors(invalid)
    if (Object.keys(invalid).length) return
    setBusy(true)
    try {
      await api.put('/clinic/profile', profile)
      await api.put('/clinic/settings', { ...settings, appointmentCapacity: parseAppointmentCapacity(appointmentCapacityInput), breaks: breakEnabled ? [breakTime] : [] })
      if (doctor.name.trim() && !doctors.some((item) => item.name.toLowerCase() === doctor.name.trim().toLowerCase())) {
        const { data: created } = await api.post('/clinic/doctors', { ...doctor, availability: { workingHours: settings.workingHours } })
        setDoctors([...doctors, created.doctor])
      }
      const { data: refreshed } = await api.get('/clinic/setup'); setData(refreshed); setIsDirty(false)
      if (refreshed.setupComplete) navigate('/clinic/queue', { replace: true })
      else if (!doctor.name.trim() && doctors.length === 0) setError('Add at least one doctor to finish setup.')
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save setup. Please try again.') }
    finally { setBusy(false) }
  }
  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  if (!data) return <main className="clinic-welcome clinic-loading-shell"><Brand/>{error ? <p role="alert">{error}</p> : <ClinicLoading>Loading clinic settings…</ClinicLoading>}</main>
  return <Localized><main className="setup-shell" onClickCapture={handleNavigationCapture}><header className="portal-header"><Brand/><div className="portal-header-right"><span>{data.clinic.name}</span><button onClick={() => requestNavigation('/')}>Sign out</button></div></header><section className="setup-content"><div className="setup-heading"><button type="button" className="button setup-back" onClick={() => requestNavigation(backPath)}>← Back</button><div className="eyebrow">PHASE 2 · CLINIC SETUP</div><h1>Set up your clinic</h1><p>Configure your team and opening hours. You can adjust these any time.</p></div><p className="required-hint"><span className="required-mark">*</span> Required field</p><form noValidate onChange={() => setIsDirty(true)} onSubmit={save} className="setup-form"><section className="setup-panel"><div className="panel-heading"><span>01</span><div><h2>Clinic profile</h2><p>Confirm the details patients will use to find you.</p></div></div><div className="setup-grid"><label className={fieldErrors.name ? 'has-field-error' : ''}>Clinic name<span className="required-mark"> *</span><input required value={profile.name || ''} aria-invalid={!!fieldErrors.name} onChange={(e) => updateProfile('name', e.target.value)}/><FieldError>{fieldErrors.name}</FieldError></label><label className={fieldErrors.contactNumber ? 'has-field-error' : ''}>Contact number<span className="required-mark"> *</span><input required type="tel" value={profile.contactNumber || ''} aria-invalid={!!fieldErrors.contactNumber} onChange={(e) => updateProfile('contactNumber', e.target.value)}/><FieldError>{fieldErrors.contactNumber}</FieldError></label><label className={`wide-field ${fieldErrors.address ? 'has-field-error' : ''}`}>Address<span className="required-mark"> *</span><input required value={profile.address || ''} aria-invalid={!!fieldErrors.address} onChange={(e) => updateProfile('address', e.target.value)}/><FieldError>{fieldErrors.address}</FieldError></label><label className={fieldErrors.city ? 'has-field-error' : ''}>City<span className="required-mark"> *</span><input required value={profile.city || ''} aria-invalid={!!fieldErrors.city} onChange={(e) => updateProfile('city', e.target.value)}/><FieldError>{fieldErrors.city}</FieldError></label><label className={fieldErrors.state ? 'has-field-error' : ''}>State<span className="required-mark"> *</span><StateSelect value={profile.state} onChange={(state) => updateProfile('state', state)} invalid={!!fieldErrors.state}/><FieldError>{fieldErrors.state}</FieldError></label><label>Time zone<select value={profile.timeZone || 'Asia/Kolkata'} onChange={(e) => setProfile({ ...profile, timeZone: e.target.value })}><option value="Asia/Kolkata">India Standard Time · Asia/Kolkata</option><option value="Asia/Dubai">Gulf Standard Time · Asia/Dubai</option><option value="UTC">UTC</option></select></label></div></section>
    <section className="setup-panel"><div className="panel-heading"><span>02</span><div><h2>Doctors and availability</h2><p>Add a doctor and set the clinic's regular hours.</p></div></div><div className="doctor-fields"><label className={fieldErrors.doctorName ? 'has-field-error' : ''}>Doctor name{!doctors.length && <span className="required-mark"> *</span>}<input required={!doctors.length} value={doctor.name} aria-invalid={!!fieldErrors.doctorName} onChange={(e) => { setDoctor({ ...doctor, name: e.target.value }); setFieldErrors((old) => ({ ...old, doctorName: undefined })) }} placeholder="e.g. Dr. Ananya Mehta"/><FieldError>{fieldErrors.doctorName}</FieldError></label><label>Specialization <small className="optional-label">Optional</small><input value={doctor.specialization} onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })} placeholder="e.g. General physician"/></label></div><button type="button" className="add-doctor-button" onClick={async () => { const invalid = validateFields({ doctorName: doctor.name }, { doctorName: [required('Doctor name'), minLength(2, 'Doctor name')] }); setFieldErrors((old) => ({ ...old, ...invalid })); if (Object.keys(invalid).length) return; try { const { data: created } = await api.post('/clinic/doctors', { ...doctor, availability: { workingHours: settings.workingHours } }); setDoctors([...doctors, created.doctor]); setDoctor({ name: '', specialization: '', details: '' }); setFieldErrors((old) => ({ ...old, doctorName: undefined })) } catch (requestError) { setError(requestError.response?.data?.error || 'Could not add this doctor.') } }}>＋ Add doctor</button>{doctors.length > 0 && <div className="doctor-list">{doctors.map((item) => <span key={item.id}><b>{item.name}</b>{item.specialization && ` · ${item.specialization}`}</span>)}</div>}<div className="hours-table"><div className="hours-header"><span>DAY</span><span>OPEN</span><span>CLOSE</span></div>{Object.entries(settings.workingHours).map(([day, hours]) => <div className={`hours-row ${hours.enabled ? '' : 'day-off'}`} key={day}><label className="day-toggle"><input type="checkbox" checked={hours.enabled} onChange={(e) => setHour(day, 'enabled', e.target.checked)}/><span>{day}</span></label><label className="hour-input">{hours.enabled && <span className="required-mark" aria-hidden="true">*</span>}<span className="sr-only">{day} opening time</span><input type="time" required={hours.enabled} aria-invalid={!!fieldErrors[`${day}.open`]} disabled={!hours.enabled} value={hours.open} onChange={(e) => setHour(day, 'open', e.target.value)}/><FieldError>{fieldErrors[`${day}.open`]}</FieldError></label><label className="hour-input">{hours.enabled && <span className="required-mark" aria-hidden="true">*</span>}<span className="sr-only">{day} closing time</span><input type="time" required={hours.enabled} aria-invalid={!!fieldErrors[`${day}.close`]} disabled={!hours.enabled} value={hours.close} onChange={(e) => setHour(day, 'close', e.target.value)}/><FieldError>{fieldErrors[`${day}.close`]}</FieldError></label></div>)}</div><div className="break-config"><label className="check-setting"><input type="checkbox" checked={breakEnabled} onChange={(e) => setBreakEnabled(e.target.checked)}/> Add a daily consultation break</label>{breakEnabled && <div className="break-times"><label>From<span className="required-mark"> *</span><input required type="time" aria-invalid={!!fieldErrors.breakStart} value={breakTime.start} onChange={(e) => { setBreakTime({ ...breakTime, start: e.target.value }); setFieldErrors((old) => ({ ...old, breakStart: /^([01]\d|2[0-3]):[0-5]\d$/.test(e.target.value) ? undefined : 'Enter a valid break start time.' })) }}/><FieldError>{fieldErrors.breakStart}</FieldError></label><label>To<span className="required-mark"> *</span><input required type="time" aria-invalid={!!fieldErrors.breakEnd} value={breakTime.end} onChange={(e) => { setBreakTime({ ...breakTime, end: e.target.value }); setFieldErrors((old) => ({ ...old, breakEnd: e.target.value > breakTime.start ? undefined : 'Break end time must be later than its start.' })) }}/><FieldError>{fieldErrors.breakEnd}</FieldError></label></div>}</div></section>
    <section className="setup-panel"><div className="panel-heading"><span>03</span><div><h2>Queue preferences</h2><p>Choose a few defaults for the reception team.</p></div></div><div className="setup-grid"><label>Appointment slot length<span className="required-mark"> *</span><select required value={settings.slotDurationMinutes} onChange={(e) => setSettings({ ...settings, slotDurationMinutes: Number(e.target.value) })}><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select></label><label>Appointments per slot<span className="required-mark"> *</span><input required type="text" inputMode="numeric" maxLength="3" value={appointmentCapacityInput} aria-invalid={!!fieldErrors.appointmentCapacity} aria-describedby={fieldErrors.appointmentCapacity ? 'appointment-capacity-error' : undefined} onChange={(e) => updateCapacity(e.target.value)} onBlur={normalizeCapacityOnBlur}/><FieldError id="appointment-capacity-error">{fieldErrors.appointmentCapacity}</FieldError></label><label>Turn approaching reminder<span className="required-mark"> *</span><input required type="number" min="1" max="30" value={settings.notifyAtPatientsAhead} aria-invalid={!!fieldErrors.notifyAtPatientsAhead} onChange={(e) => updateSetting('notifyAtPatientsAhead', Number(e.target.value))} aria-label="Notify when this many patients are ahead"/><FieldError>{fieldErrors.notifyAtPatientsAhead}</FieldError></label><label>Walk-in registrations<span className="required-mark"> *</span><select required value={String(settings.walkInsEnabled)} onChange={(e) => setSettings({ ...settings, walkInsEnabled: e.target.value === 'true' })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label><label>Returned patient queue rule<span className="required-mark"> *</span><input required type="number" min="0" max="30" value={settings.returnPatientsAhead} aria-invalid={!!fieldErrors.returnPatientsAhead} onChange={(e) => updateSetting('returnPatientsAhead', Number(e.target.value))}/><FieldError>{fieldErrors.returnPatientsAhead}</FieldError><small>Patients placed ahead on return; the default is five.</small></label><label>Missed turn policy<span className="required-mark"> *</span><select required value={settings.missedTurnPolicy || 'after_waiting'} onChange={(e) => setSettings({ ...settings, missedTurnPolicy: e.target.value })}><option value="after_waiting">Rejoin after eligible waiting patients</option><option value="at_end">Rejoin at the end of the queue</option></select></label></div></section>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="setup-submit"><span>Changes are saved to your clinic workspace.</span><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'} <span>↗</span></button></div></form></section>{pendingNavigation && <ConfirmDialog title="Leave without saving?" description="Your clinic settings have unsaved changes. Leave this page and discard them?" confirmLabel="Leave page" cancelLabel="Stay on page" destructive onClose={() => setPendingNavigation(null)} onConfirm={() => { const destination = pendingNavigation; setPendingNavigation(null); setIsDirty(false); navigate(destination.to, { replace: destination.replace }) }}/>}</main></Localized>
}
