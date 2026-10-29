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
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [revokeError, setRevokeError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  useEffect(() => {
    if (!secret) return
    sessionStorage.setItem('queueless.patient-link', secret)
    api.get('/patient/registration', { headers: { Authorization: `Bearer ${secret}` } })
      .then(({ data: response }) => setData(response))
      .catch((requestError) => setError(requestError.response?.data?.error || 'This private link could not be opened.'))
  }, [secret])

  useEffect(() => {
    if (!secret) return undefined
    const socket = connectPatientQueue(secret)
    const refresh = () => {
      socket.emit('patient:joinQueue')
      socket.emit('queue:requestSnapshot')
      api.get('/patient/registration', { headers: { Authorization: `Bearer ${secret}` } })
        .then(({ data: response }) => setData(response)).catch(() => {})
    }
    socket.on('connect', refresh)
    socket.on('queue:updated', refresh)
    socket.on('registration:confirmed', refresh)
    return () => socket.disconnect()
  }, [secret])

  if (!secret) return <Navigate to="/patient/recover" replace />

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

  return <PatientShell><section className="patient-content">
    {error && !data ? <><div className="eyebrow">PRIVATE VISIT LINK</div><h1>Link unavailable</h1><p className="patient-intro">{error}</p><Link className="button button-dark" to="/patient/recover">Recover access</Link></> : !data ? <p>{error || 'Loading your registration…'}</p> : <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="eyebrow">YOUR REGISTRATION</div><h1>{data.clinic.name}</h1>
      <p className="patient-intro">Reference {data.registration.reference} · Token A{String(data.registration.tokenNumber).padStart(2, '0')}</p>
      <div className="confirmation-card"><span>REGISTRATION STATUS</span><strong>{data.registration.queueStatus || data.registration.status}</strong>
        {data.doctor && <p>Doctor: {data.doctor.name}{data.doctor.specialization ? ` · ${data.doctor.specialization}` : ''}</p>}
        {data.appointment && <><span>APPOINTMENT STATUS</span><strong>{data.appointment.status}</strong><p>Scheduled appointment: {new Date(data.appointment.scheduledAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: data.clinic.timeZone })}. This is your appointment time, not a live queue position.</p></>}
        {data.registration.queuePosition && <p>Current live queue position: {data.registration.queuePosition}</p>}
        <p>{data.arrivalInstructions}</p>
        {data.estimate && <small>Estimated wait: {data.estimate.minimumMinutes}–{data.estimate.maximumMinutes} minutes. Queue position and wait estimates can change: {data.estimate.disclaimer}</small>}
      </div>
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
