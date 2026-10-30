import { Link, useLocation } from 'react-router-dom'
import Brand from './Brand.jsx'
import { useTranslate } from '../i18n.jsx'

export default function ClinicSidebar({ clinicName = 'Clinic' }) {
  const { pathname } = useLocation()
  const t = useTranslate()
  const links = [
    ['/clinic/queue', '▦', t('Queue dashboard')],
    ['/clinic/patients/today', '◷', t("Today's Patients")],
    ['/clinic/patients/history', '▤', t('Patient History')],
    ['/clinic/setup', '⚙', t('Clinic settings')],
  ]
  return <aside className="portal-sidebar"><Brand/><div className="side-clinic"><span className="clinic-avatar">{clinicName.slice(0, 1)}</span><div><b>{clinicName}</b><small>{t('Clinic workspace')}</small></div><span>⌄</span></div><div className="side-label">{t('WORKSPACE')}</div>{links.map(([to, icon, title]) => <Link key={to} className={`side-link ${pathname === to ? 'selected' : ''}`} to={to} state={to === '/clinic/setup' ? { from: pathname } : undefined}><span aria-hidden="true">{icon}</span>{title}</Link>)}<div className="sidebar-bottom"><span className="clinic-avatar staff-avatar">{clinicName.slice(0, 1)}</span><div><b>{t('Clinic administrator')}</b><small>{t('Administrator')}</small></div><button aria-label={t('Sign out')} title={t('Sign out')} className="sidebar-signout-button" onClick={() => { localStorage.removeItem('queueless.session'); window.location.href = '/' }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg></button></div></aside>
}
