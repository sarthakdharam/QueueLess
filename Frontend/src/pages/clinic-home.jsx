import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Localized } from '../i18n.jsx'
import { api } from '../api/client.js'
import Brand from '../components/Brand.jsx'

export default function ClinicHome() {
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
  return <Localized><main className="clinic-welcome"><Brand/>{loading ? <p>Loading your clinic…</p> : <><p>{error}</p><Link className="button button-dark" to="/login">Sign in again</Link></>}</main></Localized>
}
