import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Localized } from '../i18n.jsx'
import { api } from '../api/client.js'
import Brand from '../components/Brand.jsx'

export default function AuthPage({ mode }) {
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
  return <Localized><main className="auth-shell"><div className="auth-side"><Brand/><div className="auth-side-copy"><div className="eyebrow"><span className="live-dot"/> Better flow starts here</div><h1>More time for<br/><em>good care.</em></h1><p>QueueLess brings a little more calm to the everyday clinic visit.</p></div><span className="auth-note">Thoughtful queues, better visits.</span></div><section className="auth-main"><Link className="back-link" to="/">← Back to home</Link><div className="auth-card"><div className="eyebrow">{isRegister ? 'GET STARTED' : 'WELCOME BACK'}</div><h2>{isRegister ? 'Set up your clinic' : 'Sign in to QueueLess'}</h2><p className="auth-intro">{isRegister ? 'Create your clinic workspace. Your first month is on us.' : 'Manage your clinic queue and appointments.'}</p><form onSubmit={submit}>
    {isRegister && <><label>Clinic name<input name="clinicName" autoComplete="organization" required minLength="2" maxLength="160" value={form.clinicName} onChange={update} placeholder="e.g. Greenleaf Clinic"/></label><label>Clinic address<input name="address" autoComplete="street-address" required value={form.address} onChange={update} placeholder="Street address"/></label><div className="form-row"><label>City<input name="city" autoComplete="address-level2" required value={form.city} onChange={update}/></label><label>State<input name="state" autoComplete="address-level1" required value={form.state} onChange={update}/></label></div><label>Clinic phone<input name="contactNumber" type="tel" autoComplete="tel" required value={form.contactNumber} onChange={update} placeholder="+91 98765 43210"/></label><label>Your name<input name="adminName" autoComplete="name" required minLength="2" value={form.adminName} onChange={update} placeholder="Clinic administrator"/></label></>}
    <label>Email address<input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} placeholder="you@clinic.com"/></label><label>Password<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 10 : undefined} value={form.password} onChange={update} placeholder={isRegister ? 'At least 10 characters' : 'Your password'}/></label>
    {isRegister && <label className="terms-check"><input type="checkbox" name="acceptedTerms" checked={form.acceptedTerms} onChange={update} required/><span>I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</span></label>}
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark form-submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create clinic account' : 'Sign in'} <span>↗</span></button>
  </form><p className="auth-switch">{isRegister ? 'Already set up?' : 'New to QueueLess?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Register your clinic'}</Link></p></div></section></main></Localized>
}
