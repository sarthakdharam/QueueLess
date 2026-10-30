import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { connectClinicQueue } from '../api/realtime.js'
import { Localized } from '../i18n.jsx'
import ClinicSidebar from '../components/ClinicSidebar.jsx'
import ClinicLoading from '../components/ClinicLoading.jsx'
import DropdownSelect from '../components/DropdownSelect.jsx'
import TablePagination, { TABLE_PAGE_SIZE } from '../components/TablePagination.jsx'

const STATUS_OPTIONS = ['registered', 'waiting', 'called', 'in_consultation', 'completed', 'missed', 'cancelled', 'returned']
const labelStatus = (status = '') => status.replaceAll('_', ' ')

export default function ClinicPatients({ mode }) {
  const todayMode = mode === 'today'
  const [setup, setSetup] = useState(null)
  const [records, setRecords] = useState([])
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ q: '', status: '', from: '', to: '' })
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true); else setLoading(true)
    setError('')
    try {
      const [{ data: clinicData }, { data: patientData }] = await Promise.all([
        api.get('/clinic/setup'),
        api.get(todayMode ? '/clinic/patients/today' : '/clinic/patients/history', { params: todayMode ? { q: filters.q || undefined, status: filters.status || undefined } : { ...filters, page: pageInfo.page, limit: TABLE_PAGE_SIZE, q: filters.q || undefined, status: filters.status || undefined, from: filters.from || undefined, to: filters.to || undefined } }),
      ])
      setSetup(clinicData)
      setRecords(todayMode ? patientData.patients : patientData.records)
      if (!todayMode) setPageInfo({ page: Math.min(patientData.page, Math.max(1, patientData.pages)), pages: patientData.pages, total: patientData.total })
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load patient records. Try again.')
    } finally { setLoading(false); setRefreshing(false) }
  }, [filters, pageInfo.page, todayMode])

  useEffect(() => {
    const timer = window.setTimeout(() => { setFilters((old) => old.q === searchText ? old : { ...old, q: searchText }); setPageInfo((old) => ({ ...old, page: 1 })) }, 300)
    return () => window.clearTimeout(timer)
  }, [searchText])
  useEffect(() => { const timer = window.setTimeout(() => load(), 0); return () => window.clearTimeout(timer) }, [load, reloadKey])

  useEffect(() => {
    if (!todayMode) return undefined
    const token = localStorage.getItem('queueless.session')
    if (!token) return undefined
    const socket = connectClinicQueue(token)
    const refresh = () => { socket.emit('clinic:joinQueue'); socket.emit('queue:requestSnapshot'); setReloadKey((key) => key + 1) }
    socket.on('connect', refresh)
    socket.on('queue:updated', () => setReloadKey((key) => key + 1))
    socket.on('registration:confirmed', () => setReloadKey((key) => key + 1))
    return () => socket.disconnect()
  }, [todayMode])

  if (!localStorage.getItem('queueless.session')) return <Navigate to="/login" replace />
  const title = todayMode ? "Today's Patients" : 'Patient History'
  const recordsToShow = todayMode ? records.slice((pageInfo.page - 1) * TABLE_PAGE_SIZE, pageInfo.page * TABLE_PAGE_SIZE) : records
  const totalRecords = todayMode ? records.length : pageInfo.total
  const totalPages = Math.max(1, Math.ceil(totalRecords / TABLE_PAGE_SIZE))
  const activePage = Math.min(pageInfo.page, totalPages)
  const dateTime = (record) => {
    const value = record.scheduled_at || record.registered_at
    if (!value) return '—'
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: record.timeZone || setup?.clinic?.timeZone || 'Asia/Kolkata' })
  }
  return <Localized><main className="portal-shell clinic-patients-page"><ClinicSidebar clinicName={setup?.clinic?.name || 'Clinic'}/><section className="portal-main">
    <header className="dashboard-header"><div><div className="eyebrow">CLINIC RECORDS</div><h1>{title}</h1><p>{todayMode ? 'Appointments and registrations for your clinic today.' : 'Historical visits and final outcomes.'}</p></div><button className="button button-dark" type="button" disabled={refreshing} onClick={() => load({ quiet: true })}>{refreshing ? 'Refreshing…' : 'Refresh'} ↻</button></header>
    {!loading && setup?.clinic && <p className="patient-date-note">Clinic date: <strong>{todayMode ? new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: setup.clinic.timeZone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'full' }) : 'History'}</strong> <span>({setup.clinic.timeZone || 'Asia/Kolkata'})</span></p>}
    <section className="patient-list-filters" aria-label="Filter patient records"><label>Search patient or reference<input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Name or reference"/></label><label>Status<DropdownSelect label="Status" value={filters.status} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS.map((status) => ({ value: status, label: labelStatus(status) }))]} onChange={(status) => { setFilters((old) => ({ ...old, status })); setPageInfo((old) => ({ ...old, page: 1 })) }}/></label>{!todayMode && <><label>From<input type="date" value={filters.from} onChange={(event) => { setFilters((old) => ({ ...old, from: event.target.value })); setPageInfo((old) => ({ ...old, page: 1 })) }}/></label><label>To<input type="date" value={filters.to} onChange={(event) => { setFilters((old) => ({ ...old, to: event.target.value })); setPageInfo((old) => ({ ...old, page: 1 })) }}/></label></>}</section>
    {error && <div className="portal-alert" role="alert">{error}<button type="button" onClick={() => load()}>Retry</button></div>}
    {loading ? <ClinicLoading>Loading patient records…</ClinicLoading> : recordsToShow.length === 0 ? <div className="queue-empty"><span>☼</span><h3>No patient records found</h3><p>{todayMode ? 'Registrations and appointments for today will appear here.' : 'Try adjusting the search, date range or status filter.'}</p></div> : <div className="table-scroll patient-list-table"><table><thead><tr><th>TOKEN</th><th>PATIENT</th><th>VISIT</th><th>DATE & TIME</th><th>DOCTOR</th><th>ARRIVAL</th><th>POSITION</th><th>STATUS</th>{!todayMode && <><th>COMPLETED</th><th>REFERENCE</th></>}</tr></thead><tbody>{recordsToShow.map((record) => <tr key={record.queue_id}><td><strong className="table-token">A{String(record.token_number).padStart(2, '0')}</strong></td><td><b>{record.patient_name}</b></td><td><span className={`visit-type visit-${record.visit_type}`}>{record.visit_type === 'appointment' ? 'Appointment' : 'Walk-in'}</span></td><td>{dateTime(record)}</td><td>{record.doctor_name || 'Any doctor'}</td><td>{record.arrival_status || (record.checked_in_at ? 'Arrived' : 'Not arrived')}</td><td>{record.position ? `#${record.position}` : '—'}</td><td><span className={`status-pill status-${record.visit_status || record.queue_status}`}>{labelStatus(record.visit_status || record.queue_status)}</span></td>{!todayMode && <><td>{record.completed_at ? new Date(record.completed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: setup?.clinic?.timeZone || 'Asia/Kolkata' }) : '—'}</td><td>{record.reference}</td></>}</tr>)}</tbody></table></div>}
    {!loading && records.length > 0 && <TablePagination total={totalRecords} page={activePage} onPageChange={(page) => setPageInfo((old) => ({ ...old, page }))} label={todayMode ? 'patients' : 'visits'}/>}
  </section></main></Localized>
}
