import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAppLanguage } from '../i18n.jsx'
import PatientShell from '../components/PatientShell.jsx'
import { api } from '../api/client.js'
import { connectPatientQueue } from '../api/realtime.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function PatientRegistration() {
  const { locale } = useAppLanguage()
  const [secret] = useState(() => window.location.hash.slice(1) || sessionStorage.getItem('queueless.patient-link') || '')
  const [data, setData] = useState(null)
  const [estimateReferenceTime, setEstimateReferenceTime] = useState(null)
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [revokeError, setRevokeError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [rescheduleOptions, setRescheduleOptions] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const formatClinicTime = (value) => new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: data?.clinic?.timeZone })
  const appointmentStatusLabel = (status) => ({ needs_attention: 'Needs attention', needs_rescheduling: 'Needs rescheduling', checked_in: 'Checked in' }[status] || status)

  useEffect(() => {
    if (!secret) return
    sessionStorage.setItem('queueless.patient-link', secret)
    api.get('/patient/registration', { headers: { Authorization: `Bearer ${secret}` } })
      .then(({ data: response }) => { setData(response); setEstimateReferenceTime(Date.now()) })
      .catch((requestError) => setError(requestError.response?.data?.error || 'This private link could not be opened.'))
  }, [secret])

  useEffect(() => {
    if (!secret) return undefined
    const socket = connectPatientQueue(secret)
    const refresh = () => {
      socket.emit('patient:joinQueue')
      socket.emit('queue:requestSnapshot')
      api.get('/patient/registration', { headers: { Authorization: `Bearer ${secret}` } })
        .then(({ data: response }) => { setData(response); setEstimateReferenceTime(Date.now()) }).catch(() => {})
    }
    socket.on('connect', refresh)
    socket.on('queue:updated', refresh)
    socket.on('registration:confirmed', refresh)
    return () => socket.disconnect()
  }, [secret])

  if (!secret) return <Navigate to="/patient/recover" replace />
  const estimateWindow = data?.estimate && estimateReferenceTime ? {
    start: estimateReferenceTime + data.estimate.minimumMinutes * 60000,
    end: estimateReferenceTime + data.estimate.maximumMinutes * 60000,
  } : null

  const updateNotifications = async () => {
    if (actionBusy) return
    setActionBusy(true)
    try {
      const enabled = !data.notificationsAllowed
      await api.put('/patient/notifications/preferences', { enabled }, { headers: { Authorization: `Bearer ${secret}` } })
      setData({ ...data, notificationsAllowed: enabled })
      setError('')
    } catch {
      setError('Could not update your messaging preference.')
    } finally { setActionBusy(false) }
  }

  const rotateAccess = async () => {
    if (actionBusy) return
    setActionBusy(true)
    try {
      const { data: rotated } = await api.post('/patient/access/rotate', {}, { headers: { Authorization: `Bearer ${secret}` } })
      sessionStorage.setItem('queueless.patient-link', rotated.accessUrl.split('#')[1])
      window.location.assign(rotated.accessUrl)
    } catch {
      setError('Could not create a replacement private link.')
    } finally { setActionBusy(false) }
  }

  const revokeAccess = async () => {
    if (actionBusy) return
    setActionBusy(true)
    try {
      await api.delete('/patient/access', { headers: { Authorization: `Bearer ${secret}` } })
      sessionStorage.removeItem('queueless.patient-link')
      setData(null)
      setError('This private link has been revoked.')
      setRevokeError('')
      setShowRevokeDialog(false)
    } catch {
      setRevokeError('Could not revoke this link.')
    } finally { setActionBusy(false) }
  }

  const copyPrivateLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyMessage('Private appointment link copied.')
    } catch {
      setCopyMessage('Copy is unavailable here. Keep this page bookmarked or use Recover access later.')
    }
  }

  const loadRescheduleOptions = async () => {
    setActionBusy(true)
    try {
      const { data: options } = await api.get('/patient/reschedule/options', { headers: { Authorization: `Bearer ${secret}` } })
      setRescheduleOptions(options)
      setSelectedDate(options.days[0]?.date || '')
      setSelectedSlot('')
      setError(options.days.length ? '' : 'No future appointment slots are available. Please contact the clinic.')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load replacement appointment times.')
    } finally { setActionBusy(false) }
  }

  const confirmReschedule = async () => {
    if (!selectedDate || !selectedSlot) return
    setActionBusy(true)
    try {
      await api.post('/patient/reschedule', { date: selectedDate, slotTime: selectedSlot }, { headers: { Authorization: `Bearer ${secret}` }, successMessage: 'Your new appointment has been confirmed.' })
      const { data: response } = await api.get('/patient/registration', { headers: { Authorization: `Bearer ${secret}` } })
      setData(response)
      setEstimateReferenceTime(Date.now())
      setRescheduleOptions(null)
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'That slot is no longer available. Please choose another time.')
      await loadRescheduleOptions()
    } finally { setActionBusy(false) }
  }

  return <PatientShell><section className="patient-content">
    {error && !data ? <><div className="eyebrow">PRIVATE VISIT LINK</div><h1>Link unavailable</h1><p className="patient-intro">{error}</p><Link className="button button-dark" to="/patient/recover">Recover access</Link></> : !data ? <p>{error || 'Loading your registration…'}</p> : <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="eyebrow">YOUR REGISTRATION</div><h1>{data.clinic.name}</h1>
      <p className="patient-intro">Reference {data.registration.reference} · Token A{String(data.registration.tokenNumber).padStart(2, '0')}</p>
      <div className="confirmation-card"><span>REGISTRATION STATUS</span><strong>{data.registration.queueStatus || data.registration.status}</strong>
        {data.doctor && <p>Doctor: {data.doctor.name}{data.doctor.specialization ? ` · ${data.doctor.specialization}` : ''}</p>}
        {data.appointment && <><span>APPOINTMENT STATUS</span><strong>{appointmentStatusLabel(data.appointment.status)}</strong>{data.appointment.status === 'needs_attention' && <p className="appointment-status-note">Your doctor is temporarily unavailable during this appointment period. The clinic will update you when the queue can continue.</p>}<div className="patient-time-estimate"><span>Your appointment</span><b>{formatClinicTime(data.appointment.scheduledAt)}</b><small>Please arrive about 10 minutes early to check in.</small></div></>}
        {data.registration.queuePosition && <p>Current live queue position: {data.registration.queuePosition}</p>}
        <p>{data.arrivalInstructions}</p>
        {data.estimate && estimateWindow && <div className="patient-time-estimate live-estimate"><span>Estimated time until your turn</span><b>{data.estimate.minimumMinutes}–{data.estimate.maximumMinutes} minutes</b><small>Expected consultation window: {formatClinicTime(estimateWindow.start)} – {formatClinicTime(estimateWindow.end)}. This can change as the queue moves.</small></div>}
      </div>
      {data.appointment?.status === 'needs_rescheduling' && <section className="patient-reschedule-panel" aria-labelledby="reschedule-title"><div><div className="eyebrow">APPOINTMENT CHANGE</div><h2 id="reschedule-title">Choose a new appointment time</h2><p>Your doctor is unavailable for this visit. Your existing booking stays protected until you confirm a replacement.</p></div>{!rescheduleOptions ? <button type="button" className="button button-dark" disabled={actionBusy} onClick={loadRescheduleOptions}>{actionBusy ? 'Finding available times…' : 'View available times'}</button> : rescheduleOptions.days.length ? <div className="reschedule-controls"><label>Choose a date<select value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedSlot('') }}>{rescheduleOptions.days.map((day) => <option key={day.date} value={day.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })}</option>)}</select></label><label>Choose a time<select value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)}><option value="">Select a time</option>{(rescheduleOptions.days.find((day) => day.date === selectedDate)?.slots || []).map((slot) => <option key={slot.time} value={slot.time}>{slot.label}</option>)}</select></label><button type="button" className="button button-dark" disabled={actionBusy || !selectedSlot} onClick={confirmReschedule}>{actionBusy ? 'Confirming…' : 'Confirm new appointment'}</button></div> : <p className="form-error">No future slots are currently available. Please contact the clinic for help.</p>}</section>}
      <div className="patient-contact-details"><p className="patient-intro">{data.clinic.address}, {data.clinic.city} · {data.clinic.contactNumber}</p>
        <p className="patient-intro">WhatsApp updates <span className={data.notificationsAllowed ? 'status-indicator is-on' : 'status-indicator is-off'}>{data.notificationsAllowed ? 'On' : 'Off'}</span></p>
      </div>
      <section className="private-link-actions" aria-labelledby="private-link-actions-title">
        <h2 id="private-link-actions-title">Manage your appointment link</h2>
        <p>Keep this link to reopen your visit details. You can change its settings below.</p>
        <button type="button" className="button button-light patient-copy-link" onClick={copyPrivateLink}>Copy private appointment link</button>
        {copyMessage && <p className="copy-status" role="status">{copyMessage}</p>}
        <div className="patient-secondary-actions">
          <button type="button" className="text-button" disabled={actionBusy} onClick={updateNotifications}>{data.notificationsAllowed ? 'Turn WhatsApp updates off' : 'Turn WhatsApp updates on'}</button>
          <button type="button" className="text-button" disabled={actionBusy} onClick={rotateAccess}>{actionBusy ? 'Updating private link…' : 'Create a new private link'}</button>
          <button type="button" className="text-button danger-text" disabled={actionBusy} onClick={() => { setRevokeError(''); setShowRevokeDialog(true) }}>Revoke this link</button>
        </div>
      </section>
      <Link className="text-button patient-back-link" to="/clinics">Find another clinic</Link>
    </>}
    {showRevokeDialog && <ConfirmDialog title="Revoke private link?" description="This link will stop working immediately. You can recover access again using your mobile number and a verification code." confirmLabel="Revoke link" cancelLabel="Keep link" destructive busy={actionBusy} error={revokeError} onClose={() => { if (!actionBusy) { setShowRevokeDialog(false); setRevokeError('') } }} onConfirm={revokeAccess}/>}
  </section></PatientShell>
}
