import { Link, useLocation } from 'react-router-dom'
import Brand from './Brand.jsx'

export default function ClinicSidebar({ clinicName = 'Clinic' }) {
  const { pathname } = useLocation()
  const links = [
    ['/clinic/queue', '▦', 'Queue dashboard'],
    ['/clinic/patients/today', '◷', "Today's Patients"],
    ['/clinic/patients/history', '▤', 'Patient History'],
    ['/clinic/setup', '⚙', 'Clinic settings'],
  ]
  return <aside className="portal-sidebar"><Brand/><div className="side-clinic"><span className="clinic-avatar">{clinicName.slice(0, 1)}</span><div><b>{clinicName}</b><small>Clinic workspace</small></div><span>⌄</span></div><div className="side-label">WORKSPACE</div>{links.map(([to, icon, title]) => <Link key={to} className={`side-link ${pathname === to ? 'selected' : ''}`} to={to} state={to === '/clinic/setup' ? { from: pathname } : undefined}><span aria-hidden="true">{icon}</span>{title}</Link>)}<div className="sidebar-bottom"><span className="clinic-avatar staff-avatar">{clinicName.slice(0, 1)}</span><div><b>Clinic administrator</b><small>Administrator</small></div><button aria-label="Sign out" title="Sign out" onClick={() => { localStorage.removeItem('queueless.session'); window.location.href = '/' }}>↗</button></div></aside>
}
