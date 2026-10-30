import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Localized } from '../i18n.jsx'
import { api } from '../api/client.js'
import ClinicPageHeader from '../components/ClinicPageHeader.jsx'
import ClinicLoading from '../components/ClinicLoading.jsx'
import TablePagination, { TABLE_PAGE_SIZE } from '../components/TablePagination.jsx'
import { simulatorFailureMessage, simulatorSuccessMessage } from '../utils/simulator-feedback.js'

export default function ClinicNotifications() {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notificationPage, setNotificationPage] = useState(1)
  const load = useCallback(async ({ markRead = false } = {}) => { try { const { data } = await api.get('/clinic/notifications?unread=true'); setNotifications(data.notifications); if (markRead && data.notifications.length) await api.post('/clinic/notifications/read'); setError('') } catch (requestError) { setError(requestError.response?.data?.error || 'Could not load notifications.') } finally { setLoading(false) } }, [])
  useEffect(() => { const timer = window.setTimeout(() => load({ markRead: true }), 0); return () => window.clearTimeout(timer) }, [load])
  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  const simulate = async (outcome) => {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data } = await api.post('/clinic/notifications/simulate', { outcome })
      setMessage(simulatorSuccessMessage(data.notification))
    } catch (requestError) {
      setError(simulatorFailureMessage(requestError))
    } finally {
      await load({ markRead: true })
      setBusy(false)
    }
  }
  const notificationPageCount = Math.max(1, Math.ceil(notifications.length / TABLE_PAGE_SIZE))
  const activeNotificationPage = Math.min(notificationPage, notificationPageCount)
  const visibleNotifications = notifications.slice((activeNotificationPage - 1) * TABLE_PAGE_SIZE, activeNotificationPage * TABLE_PAGE_SIZE)
  return <Localized><><ClinicPageHeader showBackToQueue/><main className="clinic-welcome billing-page notifications-page"><header className="dashboard-header notifications-header"><div><div className="eyebrow">PATIENT MESSAGING</div><h1>Notifications</h1><p>WhatsApp messages are sent only when contact consent is recorded. Local development uses a simulator; simulated success is not proof of phone delivery.</p></div></header>{error && <p className="portal-alert" role="alert">{error}</p>}{message && <p className="portal-toast" role="status">{message}</p>}<section className="queue-panel billing-panel"><h2>Development simulator</h2><p>Test delivery tracking without sending a real message. Success records <strong>simulated</strong>; failure records <strong>failed</strong>.</p><div className="simulator-actions"><button disabled={busy} onClick={() => simulate('success')}>{busy ? 'Running simulator…' : 'Simulate success'}</button><button disabled={busy} onClick={() => simulate('failure')}>Simulate failure</button></div></section><section className="queue-panel billing-panel"><h2>Recent notification history</h2>{loading ? <ClinicLoading compact>Loading notification history…</ClinicLoading> : notifications.length ? <><div className="table-scroll"><table><thead><tr><th>WHEN</th><th>TYPE</th><th>CHANNEL</th><th>STATUS</th><th>RETRIES</th><th>DETAILS</th></tr></thead><tbody>{visibleNotifications.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('en-IN')}</td><td>{item.type}</td><td>{item.channel}</td><td>{item.deliveryStatus}</td><td>{item.retryCount}</td><td>{item.failureReason || item.providerReference || item.payload?.templateName || '—'}</td></tr>)}</tbody></table></div><TablePagination total={notifications.length} page={activeNotificationPage} onPageChange={setNotificationPage} label="notifications"/></> : <p>No notifications recorded yet.</p>}</section></main></></Localized>
}
