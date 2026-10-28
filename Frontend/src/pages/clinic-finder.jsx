import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PatientShell from '../components/PatientShell.jsx'
import { api } from '../api/client.js'

export default function ClinicFinder() {
  const [q, setQ] = useState('')
  const [clinics, setClinics] = useState([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/public/clinics').then(({ data }) => setClinics(data.clinics)).catch(() => setError('Clinics could not be loaded. Please try again.')).finally(() => setBusy(false)) }, [])
  const search = async (event) => { event.preventDefault(); setBusy(true); try { const { data } = await api.get('/public/clinics', { params: { q } }); setClinics(data.clinics); setError('') } catch { setError('Search is temporarily unavailable.') } finally { setBusy(false) } }
  return <PatientShell><section className="patient-content"><div className="eyebrow">PATIENT PORTAL</div><h1>Find a clinic</h1><p className="patient-intro">Search for a clinic to view its details and book an appointment.</p><form className="patient-search" onSubmit={search}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Clinic name, city, or address" aria-label="Search clinics"/><button className="button button-dark">Search</button></form>{error && <p className="form-error" role="alert">{error}</p>}{busy ? <p className="muted">Loading clinics…</p> : clinics.length ? <div className="clinic-results">{clinics.map((clinic) => <article className="clinic-result" key={clinic.id}><div><h2>{clinic.name}</h2><p>{clinic.address}{clinic.city ? `, ${clinic.city}` : ''}{clinic.state ? `, ${clinic.state}` : ''}</p>{clinic.contact_number && <small>{clinic.contact_number}</small>}</div><Link className="button button-dark" to={`/clinic/${clinic.id}/book`}>View clinic <span>↗</span></Link></article>)}</div> : <div className="patient-empty"><h2>No clinics found yet</h2><p>Try a different search or check back later.</p></div>}</section></PatientShell>
}
