import { useState } from 'react'
import PatientShell from '../components/PatientShell.jsx'
import { api } from '../api/client.js'

export default function PatientRecovery() {
  const [mobile, setMobile] = useState('')
  const [code, setCode] = useState('')
  const [developmentCode, setDevelopmentCode] = useState('')
  const [registrations, setRegistrations] = useState([])
  const [step, setStep] = useState('request')
  const [error, setError] = useState('')
  const requestCode = async (event) => { event.preventDefault(); setError(''); try { const { data } = await api.post('/patient/recovery/request', { mobile }); setDevelopmentCode(data.developmentCode || ''); setStep('verify') } catch (e) { setError(e.response?.data?.error || 'Could not request a code.') } }
  const verify = async (event) => { event.preventDefault(); setError(''); try { const { data } = await api.post('/patient/recovery/verify', { mobile, code }); setRegistrations(data.registrations); setStep('links') } catch (e) { setError(e.response?.data?.error || 'The code could not be verified.') } }
  return <PatientShell><section className="patient-content"><div className="eyebrow">PATIENT PORTAL</div><h1>Recover your visit</h1><p className="patient-intro">Use the mobile number you gave the clinic. We’ll send a verification code if registrations are found.</p>{step === 'request' && <form className="patient-form" onSubmit={requestCode}><label>Mobile number<input required type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98765 43210"/></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark">Send verification code</button></form>}{step === 'verify' && <form className="patient-form" onSubmit={verify}><label>Six-digit code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(e) => setCode(e.target.value)}/></label>{developmentCode && <p className="dev-code">Local development code: <strong>{developmentCode}</strong></p>}{error && <p className="form-error">{error}</p>}<button className="button button-dark">Verify and find visits</button></form>}{step === 'links' && (registrations.length ? <div className="clinic-results">{registrations.map((item) => <article className="clinic-result" key={item.reference}><div><h2>{item.clinicName}</h2><p>Reference {item.reference}</p></div><a className="button button-dark" href={item.accessUrl}>Open visit <span>↗</span></a></article>)}</div> : <div className="patient-empty"><h2>No active registrations found</h2><p>Check the mobile number or contact your clinic.</p></div>)}</section></PatientShell>
}
