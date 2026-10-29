import { Link, useLocation } from 'react-router-dom'
import '../brand.css'

export default function Brand({ to = '/' }) {
  const { pathname } = useLocation()
  const destination = to === '/' && pathname.startsWith('/clinic') ? '/clinic/queue' : to
  return (
    <Link className="brand" to={destination} aria-label={destination === '/' ? 'QueueLess home' : 'QueueLess clinic dashboard'}>
      <img className="brand-mark" src="/brand-mark.svg" alt="" aria-hidden="true" />
      <span className="brand-name">Queue<span className="brand-accent">Less</span></span>
    </Link>
  )
}
