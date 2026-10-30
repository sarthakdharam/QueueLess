import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import Brand from './Brand.jsx'
import { useTranslate } from '../i18n.jsx'

export default function ClinicPageHeader({ showBackToQueue = false }) {
  const t = useTranslate()
  const [clinicName, setClinicName] = useState('Clinic workspace')

  useEffect(() => {
    let active = true
    api.get('/clinic/setup').then(({ data }) => {
      if (active) setClinicName(data.clinic.name)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  return <header className="portal-header"><div className="clinic-header-brand-group">{showBackToQueue && <Link className="clinic-header-back-icon" to="/clinic/queue" aria-label={t('Back to queue')} title={t('Back to queue')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7"/></svg></Link>}<Brand to="/clinic/queue"/></div><div className="portal-header-right"><span>{clinicName === 'Clinic workspace' ? t(clinicName) : clinicName}</span></div></header>
}
