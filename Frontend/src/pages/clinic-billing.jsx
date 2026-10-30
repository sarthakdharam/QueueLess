import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Localized } from '../i18n.jsx'
import { api } from '../api/client.js'
import ClinicPageHeader from '../components/ClinicPageHeader.jsx'
import ClinicLoading from '../components/ClinicLoading.jsx'
import TablePagination, { TABLE_PAGE_SIZE } from '../components/TablePagination.jsx'

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export default function ClinicBilling() {
  const [billing, setBilling] = useState(null)
  const [pendingPayment, setPendingPayment] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [paymentPage, setPaymentPage] = useState(1)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/clinic/billing')
      setBilling(data)
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load subscription details.')
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(load, 0)
    const timer = window.setInterval(load, 10000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [load])

  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />

  const checkout = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data: order } = await api.post('/clinic/billing/checkout')
      if (order.provider === 'simulator') {
        setPendingPayment(order)
        setMessage('Development mode: choose a simulated result below. No payment was made.')
        return
      }
      await loadCheckoutScript()
      const modal = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'QueueLess',
        description: order.description,
        order_id: order.orderId,
        handler: () => setMessage('Payment submitted. Access updates after the verified provider webhook arrives.'),
        modal: { ondismiss: () => setMessage('Checkout closed. Your subscription remains unchanged until payment is confirmed.') },
      })
      modal.open()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not start checkout.')
    } finally {
      setBusy(false)
    }
  }

  const simulate = async (outcome) => {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/clinic/billing/simulate', { paymentId: pendingPayment.paymentId, outcome })
      setMessage(data.message)
      setPendingPayment(null)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not record simulated payment.')
    } finally {
      setBusy(false)
    }
  }

  const subscription = billing?.subscription
  const statusLabel = subscription?.accessStatus === 'expired' ? 'Expired' : subscription?.status
  const expiryDate = subscription?.status === 'active' ? subscription.renewalDate : subscription?.trialEnd
  const paymentPageCount = Math.max(1, Math.ceil((billing?.payments.length || 0) / TABLE_PAGE_SIZE))
  const activePaymentPage = Math.min(paymentPage, paymentPageCount)
  const visiblePayments = billing?.payments.slice((activePaymentPage - 1) * TABLE_PAGE_SIZE, activePaymentPage * TABLE_PAGE_SIZE) || []

  return <Localized><><ClinicPageHeader showBackToQueue/><main className="clinic-welcome billing-page subscription-page">
    <header className="dashboard-header">
      <div><div className="eyebrow">CLINIC SUBSCRIPTION</div><h1>Plans and billing</h1><p>Manage your QueueLess trial and renewal.</p></div>
    </header>
    {error && <p className="portal-alert" role="alert">{error}</p>}
    {message && <p className="portal-toast" role="status">{message}</p>}
    {billing ? <>
      <section className="metric-grid">
        <article className="metric-card"><span>Current plan</span><strong>{billing.plan.name}</strong><small>₹{billing.plan.price} per month</small></article>
        <article className="metric-card"><span>Subscription status</span><strong>{statusLabel}</strong><small>{subscription.daysRemaining} days remaining</small></article>
        <article className="metric-card"><span>{subscription.status === 'trial' ? 'Trial ends' : 'Renews on'}</span><strong>{new Date(expiryDate).toLocaleDateString('en-IN')}</strong><small>Clinic records remain available</small></article>
      </section>
      <section className="queue-panel billing-panel">
        <h2>QueueLess Base</h2>
        <p>₹500/month after your one-month trial. Payment is confirmed by the provider before the subscription is activated.</p>
        <button className="button button-dark" disabled={busy} onClick={checkout}>{busy ? 'Starting…' : 'Renew or subscribe'} <span>↗</span></button>
        {pendingPayment && <div className="simulator-actions"><p>Development payment simulator · ₹500</p><button onClick={() => simulate('success')} disabled={busy}>Simulate success</button><button onClick={() => simulate('failure')} disabled={busy}>Simulate failure</button></div>}
      </section>
      <section className="queue-panel billing-panel">
        <h2>Payment history</h2>
        {billing.payments.length ? <div className="table-scroll"><table><thead><tr><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th>PROVIDER</th></tr></thead><tbody>
          {visiblePayments.map((payment) => <tr key={payment.id}><td>{new Date(payment.createdAt).toLocaleString('en-IN')}</td><td>₹{(payment.amount / 100).toFixed(2)}</td><td>{payment.status}</td><td>{payment.provider}</td></tr>)}
        </tbody></table></div> : <p>No payments recorded.</p>}
        <TablePagination total={billing.payments.length} page={activePaymentPage} onPageChange={setPaymentPage} label="payments"/>
      </section>
    </> : error ? <p className="portal-alert" role="alert">{error}</p> : <ClinicLoading>Loading subscription…</ClinicLoading>}
  </main></></Localized>
}
