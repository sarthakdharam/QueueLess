import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Localized } from '../i18n.jsx'
import { api } from '../api/client.js'
import ClinicSidebar from '../components/ClinicSidebar.jsx'
import DropdownSelect from '../components/DropdownSelect.jsx'
import ClinicLoading from '../components/ClinicLoading.jsx'

const toLocalValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
const initialForm = () => {
  const now = new Date()
  return { doctorId: '', mode: 'temporary', startsAt: toLocalValue(now), endsAt: toLocalValue(new Date(now.getTime() + 60 * 60000)), expectedReturnAt: '', note: '' }
}
const modeOptions = [{ value: 'temporary', label: 'Temporarily unavailable' }, { value: 'full_day', label: 'Unavailable for this day' }, { value: 'until_notice', label: 'Unavailable until further notice' }]

export default function ClinicDoctorAvailability() {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [calendarDate, setCalendarDate] = useState(() => toLocalValue().slice(0, 10))
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/clinic/doctor-availability')
      setBoard(data)
      setForm((old) => ({ ...old, doctorId: old.doctorId || data.doctors[0]?.id || '' }))
      setError('')
    } catch (requestError) { setError(requestError.response?.data?.error || 'Could not load doctor availability.') }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const visibleEvents = useMemo(() => (board?.events || []).filter((event) => event.startsAt.slice(0, 10) === calendarDate || event.endsAt?.slice(0, 10) === calendarDate || !calendarDate), [board, calendarDate])
  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  const changeMode = (mode) => {
    if (mode !== 'full_day') return setForm({ ...form, mode })
    const day = form.startsAt.slice(0, 10)
    return setForm({ ...form, mode, startsAt: `${day}T00:00`, endsAt: `${day}T23:59` })
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!form.doctorId) return
    setBusy(true)
    try {
      await api.post(`/clinic/doctors/${form.doctorId}/emergencies`, { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: form.mode === 'until_notice' ? null : new Date(form.endsAt).toISOString(), expectedReturnAt: form.expectedReturnAt ? new Date(form.expectedReturnAt).toISOString() : null }, { successMessage: 'Doctor availability updated.' })
      setForm((old) => ({ ...old, note: '' }))
      await load()
    } catch (requestError) { setError(requestError.response?.data?.error || 'Could not update availability.') } finally { setBusy(false) }
  }
  const resume = async (eventId) => {
    setBusy(true)
    try { await api.post(`/clinic/doctor-availability/${eventId}/resume`, {}, { successMessage: 'Doctor availability resumed.' }); await load() } catch (requestError) { setError(requestError.response?.data?.error || 'Could not resume availability.') } finally { setBusy(false) }
  }
  const doctorName = (id) => board?.doctors.find((doctor) => doctor.id === id)?.name || 'Doctor'
  return <Localized><main className="portal-shell clinic-availability-page"><ClinicSidebar clinicName={board?.clinic?.name || 'Clinic'} /><section className="portal-main"><header className="dashboard-header"><div><div className="eyebrow">DOCTOR AVAILABILITY</div><h1>Availability calendar</h1><p>Record emergencies, pause new bookings, and keep affected patients informed.</p></div><label className="availability-date-filter">View date<input type="date" value={calendarDate} onChange={(event) => setCalendarDate(event.target.value)} /></label></header>{error && <p className="portal-alert" role="alert">{error}</p>}{!board ? <ClinicLoading>Loading doctor availability…</ClinicLoading> : <><section className="queue-panel availability-form"><div className="panel-title"><div><h2>Update doctor availability</h2><p>Existing appointments are never silently cancelled.</p></div></div><form onSubmit={submit}><label>Doctor<DropdownSelect label="Doctor" value={form.doctorId} options={board.doctors.map((doctor) => ({ value: doctor.id, label: `${doctor.name}${doctor.affectedPatients ? ` · ${doctor.affectedPatients} need attention` : ''}` }))} onChange={(doctorId) => setForm({ ...form, doctorId })} /></label><label>Status<DropdownSelect label="Availability status" value={form.mode} options={modeOptions} onChange={changeMode} /></label><label>Unavailable from<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>{form.mode !== 'until_notice' && <label>Unavailable until<input required type="datetime-local" min={form.startsAt} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>}<label>Expected return <small>Optional</small><input type="datetime-local" value={form.expectedReturnAt} onChange={(event) => setForm({ ...form, expectedReturnAt: event.target.value })} /></label><label className="availability-note">Internal note <small>Optional · visible only to clinic staff</small><textarea maxLength="500" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Reason or handover note" /></label><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Record availability change'}</button></form></section><section className="queue-panel availability-events"><div className="panel-title"><div><h2>Emergency management</h2><p>Full-day closures let patients choose a genuinely available replacement slot.</p></div></div>{visibleEvents.length ? <div className="table-scroll"><table><thead><tr><th>DOCTOR</th><th>STATUS</th><th>PERIOD</th><th>RETURN</th><th>ACTION</th></tr></thead><tbody>{visibleEvents.map((item) => <tr key={item.id}><td>{doctorName(item.doctorId)}</td><td><span className={`status-pill status-${item.status}`}>{item.status === 'active' ? item.mode.replace('_', ' ') : item.status}</span></td><td>{new Date(item.startsAt).toLocaleString()} {item.endsAt ? `– ${new Date(item.endsAt).toLocaleString()}` : ''}</td><td>{item.expectedReturnAt ? new Date(item.expectedReturnAt).toLocaleString() : 'Not confirmed'}</td><td>{item.status === 'active' ? <button type="button" className="text-button" disabled={busy} onClick={() => resume(item.id)}>Resume availability</button> : '—'}</td></tr>)}</tbody></table></div> : <div className="queue-empty"><h3>No availability changes for this date</h3><p>All doctors follow their normal published schedule.</p></div>}</section></>}</section></main></Localized>
}
