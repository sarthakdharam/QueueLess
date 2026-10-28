import { Link } from 'react-router-dom'
import '../brand.css'

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="QueueLess home">
      <img className="brand-mark" src="/brand-mark.svg" alt="" aria-hidden="true" />
      <span className="brand-name">Queue<span className="brand-accent">Less</span></span>
    </Link>
  )
}
