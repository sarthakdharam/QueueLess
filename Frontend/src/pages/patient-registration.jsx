import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAppLanguage } from '../i18n.jsx'
import PatientShell from '../components/PatientShell.jsx'
import { api } from '../api/client.js'

export default function PatientRegistration() {
  const { locale } = useAppLanguage()
  const [secret] = useState(() => window.location.hash.slice(1) || sessionStorage.getItem('queueless.patient-link') || '')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { if (!secret) return; sessionStorage.setItem('queueless.patient-link', secret); api.get('/patient/registration', { headers: { Authorization: `Bearer ${secret}` } }).then(({ data: response }) => setData(response)).catch((e) => setError(e.response?.data?.error || 'This private link could not be opened.')) }, [secret])
  if (!secret) return <Navigate to="/patient/recover" replace />
  return <PatientShell><section className="patient-content">{error ? <><div className="eyebrow">PRIVATE VISIT LINK</div><h1>Link unavailable</h1><p className="patient-intro">{error}</p><Link className="button button-dark" to="/patient/recover">Recover access</Link></> : !data ? <p>Loading your registration…</p> : <><div className="eyebrow">YOUR REGISTRATION</div><h1>{data.clinic.name}</h1><p className="patient-intro">Reference {data.registration.reference} · Token A{String(data.registration.tokenNumber).padStart(2, '0')}</p><div className="confirmation-card"><span>STATUS</span><strong>{data.registration.queueStatus || data.registration.status}</strong>{data.registration.queuePosition && <p>Queue position: {data.registration.queuePosition}</p>}{data.appointment && <p>Appointment: {new Date(data.appointment.scheduledAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: data.clinic.timeZone })}</p>}<p>{data.arrivalInstructions}</p>{data.estimate && <small>Estimated wait: {data.estimate.minimumMinutes}–{data.estimate.maximumMinutes} minutes. {data.estimate.disclaimer}</small>}</div><p className="patient-intro">{data.clinic.address}, {data.clinic.city} · {data.clinic.contactNumber}</p><button className="text-button" onClick={async () => { try { const { data: rotated } = await api.post('/patient/access/rotate', {}, { headers: { Authorization: `Bearer ${secret}` } }); sessionStorage.setItem('queueless.patient-link', rotated.accessUrl.split('#')[1]); window.location.assign(rotated.accessUrl) } catch { setError('Could not create a replacement private link.') } }}>Create a new private link</button><button className="text-button danger-text" onClick={async () => { try { await api.delete('/patient/access', { headers: { Authorization: `Bearer ${secret}` } }); sessionStorage.removeItem('queueless.patient-link'); setError('This private link has been revoked.') } catch { setError('Could not revoke this link.') } }}>Revoke this link</button></>}</section></PatientShell>
}
