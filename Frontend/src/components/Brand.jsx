import { Link } from 'react-router-dom'

export default function Brand() {
  return <Link className="brand" to="/" aria-label="QueueLess home"><span className="brand-mark">Q</span><span>queue<span className="brand-accent">less</span></span></Link>
}
