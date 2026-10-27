import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './App.css'

const api = axios.create({ baseURL: '/api/v1' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('queueless.session')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function Brand() {
  return <Link className="brand" to="/" aria-label="QueueLess home"><span className="brand-mark">Q</span><span>queue<span className="brand-accent">less</span></span></Link>
}

function Landing() {
  return <main className="landing">
    <header className="topbar"><Brand /><nav><a href="#how-it-works">How it works</a><a href="#for-clinics">For clinics</a><Link className="nav-login" to="/login">Clinic login</Link><Link className="button button-dark button-small" to="/register">Register clinic <span>↗</span></Link></nav></header>
    <section className="hero-section">
      <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> A calmer way to care</div><h1>Less waiting.<br/><em>More caring.</em></h1><p className="hero-description">A clearer queue for your clinic. Patients know where they stand, and your team stays in control.</p><div className="hero-actions"><Link className="button button-dark" to="/register">Get started for free <span>↗</span></Link><a className="text-link" href="#how-it-works">See how it works <span>↓</span></a></div><div className="hero-proof"><div className="proof-avatars"><span>R</span><span>A</span><span>M</span></div><p>Made for independent clinics<br/><strong>Across India</strong></p></div></div>
      <div className="queue-card" aria-label="Example live clinic queue"><div className="card-top"><div><span className="clinic-label">TODAY AT</span><h2>Greenleaf Clinic</h2></div><span className="open-pill"><i/> Open</span></div><div className="queue-status"><div><span className="clinic-label">NOW SERVING</span><strong className="serving-token">A<span>08</span></strong><span className="serving-name">Dr. Mehta · Room 1</span></div><div className="queue-count"><strong>06</strong><span>waiting</span></div></div><div className="queue-divider"/><div className="queue-next"><span className="next-icon">↗</span><div><span className="clinic-label">UP NEXT</span><strong>A09 <span>· Priya S.</span></strong></div><span className="wait-time">~12 min</span></div><div className="card-foot"><span className="live-dot"/> Queue updates live <span>Updated just now</span></div></div>
      <span className="hero-orbit orbit-one"/><span className="hero-orbit orbit-two"/><span className="hero-star">✳</span>
    </section>
    <section className="trust-strip"><span>BUILT FOR THE PEOPLE WHO KEEP CLINICS MOVING</span><div><span>Independent clinics</span><b>·</b><span>Reception teams</span><b>·</b><span>Patients on the go</span></div></section>
    <section className="steps-section" id="how-it-works"><div><div className="eyebrow">A BETTER VISIT, STEP BY STEP</div><h2>Good care starts<br/>before the consult.</h2></div><div className="step-list"><article><span>01</span><div><h3>Know where you stand</h3><p>Patients get a token and a live view of their place in line.</p></div></article><article><span>02</span><div><h3>Wait on your terms</h3><p>Come back when your turn is getting close, with clear guidance.</p></div></article><article><span>03</span><div><h3>Keep the day flowing</h3><p>Your team manages walk-ins and appointments from one simple queue.</p></div></article></div></section>
    <section className="cta-section" id="for-clinics"><div><div className="eyebrow">YOUR CLINIC, IN BETTER FLOW</div><h2>Make room for<br/>what matters.</h2><p>Set up your clinic and start a one-month free trial. No payment details needed to begin.</p></div><Link className="button button-light" to="/register">Create your clinic <span>↗</span></Link></section>
    <footer><Brand/><span>© 2026 QueueLess · Thoughtful queues, better visits.</span><div><a href="mailto:hello@queueless.in">Contact</a><a href="#">Privacy</a><a href="#">Terms</a></div></footer>
  </main>
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const [form, setForm] = useState({ clinicName: '', address: '', city: '', state: '', contactNumber: '', email: '', adminName: '', password: '', acceptedTerms: false })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value })
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await api.post(`/auth/${isRegister ? 'register' : 'login'}`, isRegister ? form : { email: form.email, password: form.password })
      localStorage.setItem('queueless.session', response.data.token)
      navigate('/clinic')
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to connect. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="auth-shell"><div className="auth-side"><Brand/><div className="auth-side-copy"><div className="eyebrow"><span className="live-dot"/> Better flow starts here</div><h1>More time for<br/><em>good care.</em></h1><p>QueueLess brings a little more calm to the everyday clinic visit.</p></div><span className="auth-note">Thoughtful queues, better visits.</span></div><section className="auth-main"><Link className="back-link" to="/">← Back to home</Link><div className="auth-card"><div className="eyebrow">{isRegister ? 'GET STARTED' : 'WELCOME BACK'}</div><h2>{isRegister ? 'Set up your clinic' : 'Sign in to QueueLess'}</h2><p className="auth-intro">{isRegister ? 'Create your clinic workspace. Your first month is on us.' : 'Manage your clinic queue and appointments.'}</p><form onSubmit={submit}>
    {isRegister && <><label>Clinic name<input name="clinicName" autoComplete="organization" required minLength="2" maxLength="160" value={form.clinicName} onChange={update} placeholder="e.g. Greenleaf Clinic"/></label><label>Clinic address<input name="address" autoComplete="street-address" required value={form.address} onChange={update} placeholder="Street address"/></label><div className="form-row"><label>City<input name="city" autoComplete="address-level2" required value={form.city} onChange={update}/></label><label>State<input name="state" autoComplete="address-level1" required value={form.state} onChange={update}/></label></div><label>Clinic phone<input name="contactNumber" type="tel" autoComplete="tel" required value={form.contactNumber} onChange={update} placeholder="+91 98765 43210"/></label><label>Your name<input name="adminName" autoComplete="name" required minLength="2" value={form.adminName} onChange={update} placeholder="Clinic administrator"/></label></>}
    <label>Email address<input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} placeholder="you@clinic.com"/></label><label>Password<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 10 : undefined} value={form.password} onChange={update} placeholder={isRegister ? 'At least 10 characters' : 'Your password'}/></label>
    {isRegister && <label className="terms-check"><input type="checkbox" name="acceptedTerms" checked={form.acceptedTerms} onChange={update} required/><span>I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</span></label>}
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark form-submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create clinic account' : 'Sign in'} <span>↗</span></button>
  </form><p className="auth-switch">{isRegister ? 'Already set up?' : 'New to QueueLess?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Register your clinic'}</Link></p></div></section></main>
}

function ClinicHome() {
  const [session] = useState(() => localStorage.getItem('queueless.session'))
  const [setup, setSetup] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!session) return
    api.get('/clinic/setup').then(({ data }) => setSetup(data)).catch(() => { localStorage.removeItem('queueless.session'); setError('Your session expired. Please sign in again.') }).finally(() => setLoading(false))
  }, [session])
  if (!session) return <Navigate to="/login" replace />
  if (!loading && setup && !setup.setupComplete) return <Navigate to="/clinic/setup" replace />
  if (!loading && setup?.setupComplete) return <Navigate to="/clinic/queue" replace />
  return <main className="clinic-welcome"><Brand/>{loading ? <p>Loading your clinic…</p> : <><p>{error}</p><Link className="button button-dark" to="/login">Sign in again</Link></>}</main>
}

function ClinicSetup() {
  const [data, setData] = useState(null)
  const [profile, setProfile] = useState({})
  const [settings, setSettings] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [doctor, setDoctor] = useState({ name: '', specialization: '', details: '' })
  const [breakEnabled, setBreakEnabled] = useState(false)
  const [breakTime, setBreakTime] = useState({ start: '13:00', end: '14:00' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.get('/clinic/setup').then(({ data: initial }) => { setData(initial); setProfile({ name: initial.clinic.name, address: initial.clinic.address, city: initial.clinic.city, state: initial.clinic.state, contactNumber: initial.clinic.contactNumber, timeZone: initial.clinic.timeZone || 'Asia/Kolkata' }); setSettings(initial.settings); setDoctors(initial.doctors); if (initial.settings.breaks?.length) { setBreakEnabled(true); setBreakTime(initial.settings.breaks[0]) } if (initial.doctors[0]) setDoctor({ name: '', specialization: '', details: '' }) }).catch(() => setError('Could not load clinic setup. Please sign in again.')) }, [])
  const setHour = (day, field, value) => setSettings({ ...settings, workingHours: { ...settings.workingHours, [day]: { ...settings.workingHours[day], [field]: value } } })
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await api.put('/clinic/profile', profile)
      await api.put('/clinic/settings', { ...settings, breaks: breakEnabled ? [breakTime] : [] })
      if (doctor.name.trim() && !doctors.some((item) => item.name.toLowerCase() === doctor.name.trim().toLowerCase())) {
        const { data: created } = await api.post('/clinic/doctors', { ...doctor, availability: { workingHours: settings.workingHours } })
        setDoctors([...doctors, created.doctor])
      }
      const { data: refreshed } = await api.get('/clinic/setup'); setData(refreshed)
      if (refreshed.setupComplete) window.location.href = '/clinic/queue'
      else if (!doctor.name.trim() && doctors.length === 0) setError('Add at least one doctor to finish setup.')
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save setup. Please try again.') }
    finally { setBusy(false) }
  }
  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  if (!data) return <main className="clinic-welcome"><Brand/><p>{error || 'Loading setup…'}</p></main>
  return <main className="setup-shell"><header className="portal-header"><Brand/><div className="portal-header-right"><span>{data.clinic.name}</span><button onClick={() => { localStorage.removeItem('queueless.session'); window.location.href = '/' }}>Sign out</button></div></header><section className="setup-content"><div className="setup-heading"><div className="eyebrow">PHASE 2 · CLINIC SETUP</div><h1>Set up your clinic</h1><p>Configure your team and opening hours. You can adjust these any time.</p></div><form onSubmit={save} className="setup-form"><section className="setup-panel"><div className="panel-heading"><span>01</span><div><h2>Clinic profile</h2><p>Confirm the details patients will use to find you.</p></div></div><div className="setup-grid"><label>Clinic name<input required value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })}/></label><label>Contact number<input required value={profile.contactNumber || ''} onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })}/></label><label className="wide-field">Address<input required value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })}/></label><label>City<input required value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })}/></label><label>State<input required value={profile.state || ''} onChange={(e) => setProfile({ ...profile, state: e.target.value })}/></label><label>Time zone<select value={profile.timeZone || 'Asia/Kolkata'} onChange={(e) => setProfile({ ...profile, timeZone: e.target.value })}><option value="Asia/Kolkata">India Standard Time · Asia/Kolkata</option><option value="Asia/Dubai">Gulf Standard Time · Asia/Dubai</option><option value="UTC">UTC</option></select></label></div></section>
    <section className="setup-panel"><div className="panel-heading"><span>02</span><div><h2>Doctors and availability</h2><p>Add a doctor and set the clinic's regular hours.</p></div></div><div className="doctor-fields"><label>Doctor name<input required={doctors.length === 0} value={doctor.name} onChange={(e) => setDoctor({ ...doctor, name: e.target.value })} placeholder="e.g. Dr. Ananya Mehta"/></label><label>Specialization <small>Optional</small><input value={doctor.specialization} onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })} placeholder="e.g. General physician"/></label></div><button type="button" className="add-doctor-button" onClick={async () => { if (!doctor.name.trim()) return; try { const { data: created } = await api.post('/clinic/doctors', { ...doctor, availability: { workingHours: settings.workingHours } }); setDoctors([...doctors, created.doctor]); setDoctor({ name: '', specialization: '', details: '' }) } catch (requestError) { setError(requestError.response?.data?.error || 'Could not add this doctor.') } }}>＋ Add doctor</button>{doctors.length > 0 && <div className="doctor-list">{doctors.map((item) => <span key={item.id}><b>{item.name}</b>{item.specialization && ` · ${item.specialization}`}</span>)}</div>}<div className="hours-table"><div className="hours-header"><span>DAY</span><span>OPEN</span><span>CLOSE</span></div>{Object.entries(settings.workingHours).map(([day, hours]) => <div className={`hours-row ${hours.enabled ? '' : 'day-off'}`} key={day}><label className="day-toggle"><input type="checkbox" checked={hours.enabled} onChange={(e) => setHour(day, 'enabled', e.target.checked)}/><span>{day}</span></label><input type="time" disabled={!hours.enabled} value={hours.open} onChange={(e) => setHour(day, 'open', e.target.value)}/><input type="time" disabled={!hours.enabled} value={hours.close} onChange={(e) => setHour(day, 'close', e.target.value)}/></div>)}</div><div className="break-config"><label className="check-setting"><input type="checkbox" checked={breakEnabled} onChange={(e) => setBreakEnabled(e.target.checked)}/> Add a daily consultation break</label>{breakEnabled && <div className="break-times"><label>From<input type="time" value={breakTime.start} onChange={(e) => setBreakTime({ ...breakTime, start: e.target.value })}/></label><label>To<input type="time" value={breakTime.end} onChange={(e) => setBreakTime({ ...breakTime, end: e.target.value })}/></label></div>}</div></section>
    <section className="setup-panel"><div className="panel-heading"><span>03</span><div><h2>Queue preferences</h2><p>Choose a few defaults for the reception team.</p></div></div><div className="setup-grid"><label>Appointment slot length<select value={settings.slotDurationMinutes} onChange={(e) => setSettings({ ...settings, slotDurationMinutes: Number(e.target.value) })}><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select></label><label>Appointments per slot<input type="number" min="1" max="100" value={settings.appointmentCapacity} onChange={(e) => setSettings({ ...settings, appointmentCapacity: Number(e.target.value) })}/></label><label>Turn approaching reminder<input type="number" min="1" max="30" value={settings.notifyAtPatientsAhead} onChange={(e) => setSettings({ ...settings, notifyAtPatientsAhead: Number(e.target.value) })} aria-label="Notify when this many patients are ahead"/></label><label>Walk-in registrations<select value={String(settings.walkInsEnabled)} onChange={(e) => setSettings({ ...settings, walkInsEnabled: e.target.value === 'true' })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label><label>Returned patient queue rule<input type="number" min="0" max="30" value={settings.returnPatientsAhead} onChange={(e) => setSettings({ ...settings, returnPatientsAhead: Number(e.target.value) })}/><small>Patients placed ahead on return; the default is five.</small></label><label>Missed turn policy<select value={settings.missedTurnPolicy || 'after_waiting'} onChange={(e) => setSettings({ ...settings, missedTurnPolicy: e.target.value })}><option value="after_waiting">Rejoin after eligible waiting patients</option><option value="at_end">Rejoin at the end of the queue</option></select></label></div></section>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="setup-submit"><span>Changes are saved to your clinic workspace.</span><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'} <span>↗</span></button></div></form></section></main>
}

function ClinicDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [setup, setSetup] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({ name: '', mobile: '', doctorId: '', notes: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const load = useCallback(async () => { try { const [{ data: board }, { data: config }, { data: team }] = await Promise.all([api.get('/clinic/dashboard'), api.get('/clinic/setup'), api.get('/clinic/doctors')]); setDashboard(board); setSetup(config); setDoctors(team.doctors) } catch (requestError) { setError(requestError.response?.data?.error || 'Could not load the queue.') } }, [])
  useEffect(() => { const initialLoad = window.setTimeout(load, 0); const interval = window.setInterval(load, 20000); return () => { window.clearTimeout(initialLoad); window.clearInterval(interval) } }, [load])
  const addWalkIn = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const { data } = await api.post('/clinic/walk-ins', form); setForm({ name: '', mobile: '', doctorId: '', notes: '' }); setToast(`Token ${data.registration.tokenNumber} added · ${data.registration.reference}`); await load() } catch (requestError) { setError(requestError.response?.data?.error || 'Could not register this patient.') } finally { setBusy(false) } }
  const performAction = async (queueId, action) => { if (['cancel', 'miss'].includes(action) && !window.confirm(action === 'cancel' ? 'Cancel this patient’s queue registration?' : 'Mark this patient as having missed their turn?')) return; setError(''); try { await api.post(`/clinic/queue/${queueId}/${action}`); await load() } catch (requestError) { setError(requestError.response?.data?.error || 'Could not update this queue entry.') } }
  const callNext = async () => { setError(''); try { const { data } = await api.post('/clinic/queue/call-next', {}); setToast(`Now calling token ${data.queueEntry.tokenNumber}`); await load() } catch (requestError) { setError(requestError.response?.data?.error || 'Could not call the next patient.') } }
  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  if (!dashboard || !setup) return <main className="clinic-welcome"><Brand/><p>{error || 'Loading today’s queue…'}</p></main>
  if (!setup.setupComplete) return <Navigate to="/clinic/setup" replace />
  const cards = [['Registered today', dashboard.summary.registrations, 'people checked in'], ['Waiting now', dashboard.summary.waiting, 'in the queue'], ['In consultation', dashboard.summary.consulting, 'with a doctor'], ['Completed', dashboard.summary.completed, 'visits today']]
  return <main className="portal-shell"><aside className="portal-sidebar"><Brand/><div className="side-clinic"><span className="clinic-avatar">{setup.clinic.name.slice(0, 1)}</span><div><b>{setup.clinic.name}</b><small>Clinic workspace</small></div><span>⌄</span></div><div className="side-label">WORKSPACE</div><a className="side-link selected" href="/clinic/queue"><span>▦</span> Queue dashboard</a><Link className="side-link" to="/clinic/setup"><span>⚙</span> Clinic settings</Link><div className="sidebar-bottom"><span className="clinic-avatar staff-avatar">{setup.clinic.name.slice(0, 1)}</span><div><b>Clinic administrator</b><small>Administrator</small></div><button aria-label="Sign out" title="Sign out" onClick={() => { localStorage.removeItem('queueless.session'); window.location.href = '/' }}>↗</button></div></aside><section className="portal-main"><header className="dashboard-header"><div><div className="eyebrow">CLINIC OVERVIEW</div><h1>Good morning</h1><p>Here’s what’s happening at your clinic today.</p></div><div className="header-actions"><span className="date-chip">{new Date(`${dashboard.date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span><Link className="button button-dark" to="/clinic/setup">Clinic settings <span>↗</span></Link></div></header>
  {error && <p className="portal-alert" role="alert">{error}</p>}{toast && <p className="portal-toast" role="status">{toast}<button onClick={() => setToast('')}>×</button></p>}
  <section className="metric-grid">{cards.map(([title, value, note]) => <article className="metric-card" key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
  <section className="dashboard-columns"><div className="queue-panel"><div className="panel-title"><div><h2>Live queue</h2><p><span className="live-dot"/> Updates every 20 seconds</p></div><button className="button button-dark call-next" onClick={callNext}>Call next patient <span>↗</span></button></div>{dashboard.queue.length === 0 ? <div className="queue-empty"><span>☼</span><h3>Your queue is clear</h3><p>Registered patients will show here. Add a walk-in to get started.</p></div> : <div className="table-scroll"><table><thead><tr><th>TOKEN</th><th>PATIENT</th><th>DOCTOR</th><th>STATUS</th><th>POSITION</th><th>ACTION</th></tr></thead><tbody>{dashboard.queue.map((row) => <tr key={row.queue_id}><td><strong className="table-token">A{String(row.token_number).padStart(2, '0')}</strong><small>{row.reference}</small></td><td><b>{row.patient_name}</b><small>{row.patient_mobile}</small></td><td>{row.doctor_name || 'Any doctor'}</td><td><span className={`status-pill status-${row.queue_status}`}>{row.queue_status.replace('_', ' ')}</span></td><td>{row.position ? `#${row.position}` : '—'}</td><td><div className="row-actions">{row.queue_status === 'waiting' && <button onClick={() => performAction(row.queue_id, 'call')}>Call</button>}{row.queue_status === 'called' && <><button onClick={() => performAction(row.queue_id, 'start')}>Start</button><button className="quiet-action" onClick={() => performAction(row.queue_id, 'miss')}>Missed</button></>}{row.queue_status === 'in_consultation' && <button onClick={() => performAction(row.queue_id, 'complete')}>Complete</button>}{['waiting', 'called'].includes(row.queue_status) && <button className="quiet-action" onClick={() => performAction(row.queue_id, 'cancel')}>Cancel</button>}</div></td></tr>)}</tbody></table></div>}</div>
  <aside className="walkin-panel"><div className="panel-title"><div><h2>Register a walk-in</h2><p>New patient or returning visitor</p></div><span className="plus-mark">＋</span></div><form onSubmit={addWalkIn}><label>Patient name<input required minLength="2" maxLength="160" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"/></label><label>Mobile number<input required type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+91 98765 43210"/></label><label>Doctor<select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}><option value="">Any available doctor</option>{doctors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Reception note <small>Optional</small><textarea maxLength="500" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Brief note for the clinic team" rows="3"/></label><button className="button button-dark form-submit" disabled={busy}>{busy ? 'Adding patient…' : 'Add to today’s queue'} <span>↗</span></button><p className="walkin-note">Walk-ins can be registered during configured clinic hours. A permanent reference and token are assigned.</p></form></aside></section>
  <div className="dashboard-foot"><span>{dashboard.summary.missed} missed turns</span><span>{dashboard.summary.cancelled} cancelled</span><span>Reception actions are recorded in the activity log.</span></div></section></main>
}

export default function App() {
  return <Routes><Route path="/" element={<Landing/>}/><Route path="/register" element={<AuthPage mode="register"/>}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/clinic" element={<ClinicHome/>}/><Route path="/clinic/setup" element={<ClinicSetup/>}/><Route path="/clinic/queue" element={<ClinicDashboard/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>
}
