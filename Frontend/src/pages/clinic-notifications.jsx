import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api/client.js'
import Brand from '../components/Brand.jsx'

export default function ClinicNotifications() {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async () => { try { const { data } = await api.get('/clinic/notifications'); setNotifications(data.notifications) } catch (requestError) { setError(requestError.response?.data?.error || 'Could not load notification history.') } }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  const simulate = async (outcome) => { setError(''); try { const { data } = await api.post('/clinic/notifications/simulate', { outcome }); setMessage(`Simulator recorded a ${data.notification.deliveryStatus} result.`); await load() } catch (requestError) { setError(requestError.response?.data?.error || 'Could not run the simulator.') } }
  return <main className="clinic-welcome billing-page"><header className="dashboard-header"><div><Brand/><div className="eyebrow">PATIENT MESSAGING</div><h1>Notifications</h1><p>WhatsApp messages are sent only when contact consent is recorded. Local development uses a simulator.</p></div><Link className="button button-dark" to="/clinic/queue">Back to queue</Link></header>{error && <p className="portal-alert" role="alert">{error}</p>}{message && <p className="portal-toast" role="status">{message}</p>}<section className="queue-panel billing-panel"><h2>Development simulator</h2><p>Preview delivery tracking without sending a real message.</p><div className="simulator-actions"><button onClick={() => simulate('success')}>Simulate success</button><button onClick={() => simulate('failure')}>Simulate failure</button></div></section><section className="queue-panel billing-panel"><h2>Recent notification history</h2>{notifications.length ? <div className="table-scroll"><table><thead><tr><th>WHEN</th><th>TYPE</th><th>CHANNEL</th><th>STATUS</th><th>RETRIES</th><th>DETAILS</th></tr></thead><tbody>{notifications.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('en-IN')}</td><td>{item.type}</td><td>{item.channel}</td><td>{item.deliveryStatus}</td><td>{item.retryCount}</td><td>{item.failureReason || item.providerReference || item.payload?.templateName || '—'}</td></tr>)}</tbody></table></div> : <p>No notifications recorded yet.</p>}</section></main>
}
