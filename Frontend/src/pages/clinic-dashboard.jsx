import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Localized, useAppLanguage } from '../i18n.jsx'
import { api } from '../api/client.js'
import Brand from '../components/Brand.jsx'
import { connectClinicQueue } from '../api/realtime.js'
import { FieldError } from '../components/FieldError.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ClinicLoading from '../components/ClinicLoading.jsx'
import ClinicSidebar from '../components/ClinicSidebar.jsx'
import { mobileRule, minLength, required, validateFields } from '../components/validation.js'

export default function ClinicDashboard() {
  const { locale } = useAppLanguage()
  const [dashboard, setDashboard] = useState(null)
  const [setup, setSetup] = useState(null)
  const [billing, setBilling] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({ name: '', mobile: '', doctorId: '', notes: '' })
  const [error, setError] = useState('')
  const [walkInError, setWalkInError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [dialogAction, setDialogAction] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [patientsAhead, setPatientsAhead] = useState('0')
  const [pendingQueueId, setPendingQueueId] = useState('')
  const actionPendingRef = useRef(false)
  const load = useCallback(async () => { try { const [{ data: board }, { data: config }, { data: team }, { data: billingInfo }] = await Promise.all([api.get('/clinic/dashboard'), api.get('/clinic/setup'), api.get('/clinic/doctors'), api.get('/clinic/billing')]); setDashboard(board); setSetup(config); setDoctors(team.doctors); setBilling(billingInfo) } catch (requestError) { setError(requestError.response?.data?.error || 'Could not load the queue.') } }, [])
  useEffect(() => { const initialLoad = window.setTimeout(load, 0); const interval = window.setInterval(load, 20000); return () => { window.clearTimeout(initialLoad); window.clearInterval(interval) } }, [load])
  useEffect(() => { const token = localStorage.getItem('queueless.session'); if (!token) return undefined; const socket = connectClinicQueue(token); const refresh = () => { socket.emit('clinic:joinQueue'); socket.emit('queue:requestSnapshot'); load() }; socket.on('connect', refresh); socket.on('queue:updated', load); socket.on('registration:confirmed', load); return () => socket.disconnect() }, [load])
  const addWalkIn = async (event) => { event.preventDefault(); setWalkInError(''); const invalid = validateFields(form, { name: [required('Patient name'), minLength(2, 'Patient name')], mobile: [required('Mobile number'), mobileRule] }); setFieldErrors(invalid); if (Object.keys(invalid).length) return; setBusy(true); try { const { data } = await api.post('/clinic/walk-ins', form); setForm({ name: '', mobile: '', doctorId: '', notes: '' }); setFieldErrors({}); setToast(`Token ${data.registration.tokenNumber} added · ${data.registration.reference}`); await load() } catch (requestError) { setWalkInError(requestError.response?.data?.error || 'Could not register this patient.') } finally { setBusy(false) } }
  const updateWalkIn = (field, value) => { setForm((old) => ({ ...old, [field]: value })); if (!fieldErrors[field]) return; const rules = { name: [required('Patient name'), minLength(2, 'Patient name')], mobile: [required('Mobile number'), mobileRule] }; const nextError = validateFields({ [field]: value }, { [field]: rules[field] })[field]; setFieldErrors((old) => ({ ...old, [field]: nextError })) }
  const performAction = async (queueId, action) => {
    if (['cancel', 'miss', 'return-override'].includes(action)) {
      setDialogError('')
      setOverrideReason('')
      setPatientsAhead('0')
      setDialogAction({ queueId, action })
      return
    }
    await submitQueueAction(queueId, action)
  }
  const submitQueueAction = async (queueId, action, payload = {}, fromDialog = false) => {
    if (actionPendingRef.current) return false
    actionPendingRef.current = true
    setError('')
    setPendingQueueId(queueId)
    try {
      await api.post(`/clinic/queue/${queueId}/${action}`, payload)
      if (fromDialog) setDialogAction(null)
      const successMessage = action === 'cancel' ? 'Registration cancelled.' : action === 'miss' ? 'Patient marked as missed.' : action === 'return' ? 'Patient returned to the queue.' : 'Queue entry updated.'
      setToast(successMessage)
      await load()
      return true
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Could not update this queue entry.'
      if (fromDialog) setDialogError(message)
      else setError(message)
      return false
    } finally {
      actionPendingRef.current = false
      setPendingQueueId('')
    }
  }
  const confirmQueueAction = async () => {
    if (!dialogAction) return
    const { queueId, action } = dialogAction
    if (action === 'return-override') {
      const ahead = Number(patientsAhead)
      if (overrideReason.trim().length < 5) { setDialogError('Enter an override reason of at least five characters.'); return }
      if (!Number.isInteger(ahead) || ahead < 0 || ahead > 30) { setDialogError('Enter a whole number from 0 to 30.'); return }
      await submitQueueAction(queueId, 'return', { overrideReturnRule: true, overrideReason: overrideReason.trim(), patientsAhead: ahead }, true)
      return
    }
    await submitQueueAction(queueId, action, {}, true)
  }
  const callNext = async () => { if (actionPendingRef.current) return; actionPendingRef.current = true; setPendingQueueId('call-next'); setError(''); try { const { data } = await api.post('/clinic/queue/call-next', {}); setToast(`Now calling token ${data.queueEntry.tokenNumber}`); await load() } catch (requestError) { setError(requestError.response?.data?.error || 'Could not call the next patient.') } finally { actionPendingRef.current = false; setPendingQueueId('') } }
  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  if (!dashboard || !setup) return <main className="portal-shell clinic-dashboard-loading"><ClinicSidebar/><section className="portal-main"><header className="dashboard-header"><div><div className="eyebrow">CLINIC OVERVIEW</div><h1>Clinic dashboard</h1><p>{error || 'Preparing today’s queue…'}</p></div>{error && <button className="button button-dark" onClick={load}>Try again</button>}</header><div className="metric-grid" aria-hidden="true">{['Registered today', 'Waiting now', 'In consultation', 'Completed'].map((label) => <article className="metric-card loading-metric" key={label}><span>{label}</span><i/><small>Updating clinic data</small></article>)}</div><section className="dashboard-columns"><div className="queue-panel loading-panel"><ClinicLoading>Loading today’s queue…</ClinicLoading></div><aside className="walkin-panel loading-panel"><ClinicLoading>Loading registration form…</ClinicLoading></aside></section></section></main>
  if (!setup.setupComplete) return <Navigate to="/clinic/setup" replace />
  const cards = [['Registered today', dashboard.summary.registrations, 'people checked in'], ['Waiting now', dashboard.summary.waiting, 'in the queue'], ['In consultation', dashboard.summary.consulting, 'with a doctor'], ['Completed', dashboard.summary.completed, 'visits today']]
  return <Localized><main className="portal-shell"><aside className="portal-sidebar"><Brand to="/clinic/queue"/><div className="side-clinic"><span className="clinic-avatar">{setup.clinic.name.slice(0, 1)}</span><div><b>{setup.clinic.name}</b><small>Clinic workspace</small></div><span>⌄</span></div><div className="side-label">WORKSPACE</div><Link className="side-link selected" to="/clinic/queue"><span>▦</span> Queue dashboard</Link><Link className="side-link" to="/clinic/patients/today"><span>◷</span> Today's Patients</Link><Link className="side-link" to="/clinic/patients/history"><span>▤</span> Patient History</Link><Link className="side-link" to="/clinic/setup" state={{ from: "/clinic/queue" }}><span>⚙</span> Clinic settings</Link><div className="sidebar-bottom"><span className="clinic-avatar staff-avatar">{setup.clinic.name.slice(0, 1)}</span><div><b>Clinic administrator</b><small>Administrator</small></div><button aria-label="Sign out" title="Sign out" onClick={() => { localStorage.removeItem('queueless.session'); window.location.href = '/' }}>↗</button></div></aside><section className="portal-main"><header className="dashboard-header"><div><div className="eyebrow">CLINIC OVERVIEW</div><h1>Good morning</h1><p>Here’s what’s happening at your clinic today.</p></div><div className="header-actions"><span className="date-chip">{new Date(`${dashboard.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span><Link className="notification-icon-link" to="/clinic/setup" state={{ from: "/clinic/queue" }} aria-label="Clinic settings" title="Clinic settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3H3.7a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/></svg></Link><Link className="text-link" to="/clinic/billing">Subscription</Link><Link className="notification-icon-link" to="/clinic/notifications" aria-label="Notifications" title="Notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></Link></div></header>
  {billing && (billing.subscription.accessStatus === 'expired' || billing.subscription.daysRemaining <= 7) && <p className="portal-alert" role="status">{billing.subscription.accessStatus === 'expired' ? 'Your trial or subscription has expired. Existing queue records remain available; new registrations are paused.' : `${billing.subscription.daysRemaining} days remain on your ${billing.subscription.status}.`} <Link to="/clinic/billing">Manage subscription</Link></p>}{error && <p className="portal-alert" role="alert">{error}</p>}{toast && <p className="portal-toast" role="status">{toast}<button onClick={() => setToast('')}>×</button></p>}
  <section className="metric-grid">{cards.map(([title, value, note]) => <article className="metric-card" key={title}><span>{title}</span><strong>{typeof value === 'number' ? value.toLocaleString(locale) : value}</strong><small>{note}</small></article>)}</section>
  <section className="dashboard-columns"><div className="queue-panel"><div className="panel-title"><div><h2>Live queue</h2><p><span className="live-dot"/> Updates every 20 seconds</p></div><button className="button button-dark call-next" disabled={!!pendingQueueId} onClick={callNext}>Call next patient <span>↗</span></button></div>{dashboard.queue.length === 0 ? <div className="queue-empty"><span>☼</span><h3>Your queue is clear</h3><p>Registered patients will show here. Add a walk-in to get started.</p></div> : <div className="table-scroll"><table><thead><tr><th>TOKEN</th><th>PATIENT</th><th>DOCTOR</th><th>STATUS</th><th>POSITION</th><th>ACTION</th></tr></thead><tbody>{dashboard.queue.map((row) => <tr key={row.queue_id}><td><strong className="table-token">A{String(row.token_number).padStart(2, '0')}</strong><small>{row.reference}</small></td><td><b>{row.patient_name}</b><small>{row.patient_mobile}</small></td><td>{row.doctor_name || 'Any doctor'}</td><td><span className={`status-pill status-${row.queue_status}`}>{row.queue_status.replace('_', ' ')}</span></td><td>{row.position ? `#${row.position}` : '—'}</td><td><div className="row-actions">{row.queue_status === 'registered' && <button disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'check-in')}>Check in</button>}{row.queue_status === 'waiting' && <button disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'call')}>Call</button>}{row.queue_status === 'called' && <><button disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'start')}>Start</button><button className="quiet-action" disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'miss')}>Missed</button></>}{row.queue_status === 'missed' && <><button disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'return')}>Return to queue</button><button className="quiet-action" disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'return-override')}>Administrator override</button></>}{row.queue_status === 'in_consultation' && <button disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'complete')}>Complete</button>}{['waiting', 'called'].includes(row.queue_status) && <button className="quiet-action" disabled={!!pendingQueueId} onClick={() => performAction(row.queue_id, 'cancel')}>Cancel</button>}</div></td></tr>)}</tbody></table></div>}</div>
  <aside className="walkin-panel"><div className="panel-title"><div><h2>Register a walk-in</h2><p>New patient or returning visitor</p></div><span className="plus-mark">＋</span></div><form noValidate onSubmit={addWalkIn}><label className={fieldErrors.name ? 'has-field-error' : ''}>Patient name<span className="required-mark">*</span><input required minLength="2" maxLength="160" value={form.name} aria-invalid={!!fieldErrors.name} onChange={(e) => updateWalkIn('name', e.target.value)} placeholder="Full name"/><FieldError>{fieldErrors.name}</FieldError></label><label className={fieldErrors.mobile ? 'has-field-error' : ''}>Mobile number<span className="required-mark"> *</span><input required type="tel" value={form.mobile} aria-invalid={!!fieldErrors.mobile} onChange={(e) => updateWalkIn('mobile', e.target.value)} placeholder="+91 98765 43210"/><FieldError>{fieldErrors.mobile}</FieldError></label><label>Doctor <small className="optional-label">Optional</small><select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}><option value="">Any available doctor</option>{doctors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Reception note <small className="optional-label">Optional</small><textarea maxLength="500" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Brief note for the clinic team" rows="3"/></label>{walkInError && <p className="form-error" role="alert">{walkInError}</p>}<button className="button button-dark form-submit" disabled={busy}>{busy ? 'Adding patient…' : 'Add to today’s queue'} <span>↗</span></button><p className="walkin-note">Walk-ins can be registered during configured clinic hours. A permanent reference and token are assigned.</p></form></aside></section>
  <div className="dashboard-foot"><span>{dashboard.summary.missed} missed turns</span><span>{dashboard.summary.cancelled} cancelled</span><span>Reception actions are recorded in the activity log.</span></div></section>{dialogAction && <ConfirmDialog title={dialogAction.action === 'cancel' ? 'Cancel registration?' : dialogAction.action === 'miss' ? 'Mark patient as missed?' : 'Override return queue rule?'} description={dialogAction.action === 'cancel' ? 'The patient will be removed from the active queue and this registration will be marked cancelled.' : dialogAction.action === 'miss' ? 'The patient will be marked as having missed their turn. You can return them to the queue later.' : 'Set how many eligible waiting patients should remain ahead. This override will be recorded in the activity log.'} confirmLabel={dialogAction.action === 'cancel' ? 'Confirm cancellation' : dialogAction.action === 'miss' ? 'Confirm missed turn' : 'Apply override'} cancelLabel={dialogAction.action === 'cancel' ? 'Keep registration' : dialogAction.action === 'miss' ? 'Keep in queue' : 'Cancel'} destructive={dialogAction.action !== 'return-override'} busy={pendingQueueId === dialogAction.queueId} error={dialogError} onClose={() => { if (pendingQueueId) return; setDialogAction(null); setDialogError('') }} onConfirm={confirmQueueAction}>{dialogAction.action === 'return-override' && <div className="dialog-fields"><label htmlFor="override-reason">Reason</label><input id="override-reason" value={overrideReason} maxLength="500" onChange={(event) => { setOverrideReason(event.target.value); setDialogError('') }} placeholder="At least 5 characters"/><label htmlFor="patients-ahead">Eligible patients to keep ahead</label><input id="patients-ahead" type="number" min="0" max="30" step="1" value={patientsAhead} onChange={(event) => { setPatientsAhead(event.target.value); setDialogError('') }}/></div>}</ConfirmDialog>}</main></Localized>
}
