import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAppLanguage } from "../i18n.jsx";
import "./mock-notifications.css";

const endpoint = "/dev/notifications";
const statuses = {
  pending: "Queued",
  simulated: "Sent (simulated)",
  delivered_simulated: "Delivered (simulated)",
  failed: "Failed (simulated)",
};
const types = {
  registration_confirmation: "Registration confirmed",
  otp_recovery: "Recovery OTP",
  mock_otp: "Demo OTP",
  queue_progress: "Queue progress",
  patient_checked_in: "Checked in",
  turn_approaching: "Turn approaching",
  your_turn: "Your turn",
  doctor_emergency_delay: "Doctor unavailable",
  doctor_emergency_reschedule: "Doctor unavailable · reschedule",
  appointment_hours_reschedule: "Clinic hours changed",
  reschedule_confirmation: "Appointment rescheduled",
  missed_appointment_reschedule: "Missed appointment",
  appointment_cancellation: "Appointment cancelled",
  visit_completed: "Visit completed",
  simulator_preview: "Simulator preview",
};

function Pagination({ page, setPage, hasMore, older = "Next" }) {
  if (page === 1 && !hasMore) return null;
  return (
    <div className="mock-pagination">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span>
      <button type="button" disabled={!hasMore} onClick={() => setPage(page + 1)}>{older}</button>
    </div>
  );
}

function MockTestPanel({ selected, onResult }) {
  const [patients, setPatients] = useState([]);
  const [q, setQuery] = useState("");
  const [patientId, setPatientId] = useState(selected?.patientId === "system" ? "" : selected?.patientId || "");
  const [type, setType] = useState("registration_confirmation");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const demoOtp = type === "mock_otp";
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get(`${endpoint}/patients`, { params: { q }, signal: controller.signal });
        setPatients(data.patients);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.response?.data?.error || "Could not load patients.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  async function run(outcome) {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`${endpoint}/test`, {
        patientId, type, outcome, ...(demoOtp ? {} : { message }),
      }, { successToast: false });
      if (outcome === "preview") setPreview(data.message);
      else {
        setPreview(data.message);
        onResult(data);
      }
    } catch (error) {
      setError(error.response?.data?.error || "Could not run the simulation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mock-lab" aria-label="Message test panel">
      <div>
        <h2>Test message</h2>
        <p>Use a test patient from your clinic. Every outcome is simulated.</p>
      </div>
      <div className="mock-lab-fields">
        <label>Find a test patient<input value={q} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Name or phone number" /></label>
        <label>Patient
          <select value={patientId} onChange={(event) => { setPatientId(event.target.value); setPreview(""); }}>
            <option value="">Choose a patient</option>
            {patientId && !patients.some(({ id }) => id === patientId) && (
              <option value={patientId}>{selected?.patientId === patientId ? selected.patientName : "Selected patient"}</option>
            )}
            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.phone}</option>)}
          </select>
        </label>
        <label>Message type
          <select value={type} onChange={(event) => { setType(event.target.value); setPreview(""); }}>
            {Object.entries(types).filter(([value]) => value !== "otp_recovery")
              .map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {!demoOtp && (
        <label>Message override <textarea value={message} onChange={(event) => { setMessage(event.target.value); setPreview(""); }} maxLength={1200} placeholder="Leave blank to use the template" rows={3} /></label>
      )}
      {preview && <pre className="mock-preview">{preview}</pre>}
      {error && <p role="alert">{error}</p>}
      <div className="mock-actions">
        <button type="button" disabled={busy || !patientId} onClick={() => run("preview")}>Preview</button>
        <button type="button" disabled={busy || !patientId} onClick={() => run("success")}>Simulate send</button>
        <button type="button" disabled={busy || !patientId} onClick={() => run("failure")}>Simulate failure</button>
      </div>
    </section>
  );
}

export default function MockNotifications() {
  const { locale } = useAppLanguage();
  const session = Boolean(localStorage.getItem("queueless.session"));
  const [q, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [conversations, setConversations] = useState(null);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [running, setRunning] = useState("");
  const [showTest, setShowTest] = useState(false);
  const patientId = selected?.patientId;

  useEffect(() => {
    if (!session) return undefined;
    const controller = new AbortController();
    async function load() {
      try {
        const { data } = await api.get(endpoint, {
          params: { view: "conversations", q, page, type: type || undefined, status: status || undefined },
          signal: controller.signal,
        });
        setConversations(data);
        setSelected((current) => current || data.messages[0] || null);
        setError("");
      } catch (error) {
        if (!controller.signal.aborted) setError(error.response?.data?.error || "Could not load the mock inbox.");
      }
    }
    const initial = window.setTimeout(load, 250);
    const poll = page === 1 ? window.setInterval(load, 8000) : null;
    return () => { clearTimeout(initial); clearInterval(poll); controller.abort(); };
  }, [session, q, page, type, status, revision]);

  useEffect(() => {
    if (!session || !patientId) return undefined;
    const controller = new AbortController();
    async function load() {
      try {
        const { data } = await api.get(`${endpoint}/patient/${patientId}`, {
          params: { page: historyPage, limit: 20, type: type || undefined, status: status || undefined },
          signal: controller.signal,
        });
        setHistory({ ...data, patientId });
        setHistoryError("");
      } catch (error) {
        if (!controller.signal.aborted) setHistoryError(error.response?.data?.error || "Could not load this conversation.");
      }
    }
    void load();
    const poll = historyPage === 1 ? window.setInterval(load, 8000) : null;
    return () => { clearInterval(poll); controller.abort(); };
  }, [session, patientId, historyPage, type, status, revision]);

  const selectConversation = (item) => {
    setSelected(item);
    setHistoryPage(1);
    setHistoryError("");
  };
  async function updateOutcome(id, outcome) {
    setRunning(id);
    setHistoryError("");
    try {
      await api.post(`${endpoint}/${id}/simulate-${outcome}`, {}, { successToast: false });
      setRevision((value) => value + 1);
    } catch (error) {
      setHistoryError(error.response?.data?.error || "Could not update simulated delivery.");
    } finally {
      setRunning("");
    }
  }
  if (!session) return <Navigate to="/login" replace />;
  const time = (value) => new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const messages = history?.patientId === patientId ? history?.messages : null;
  return (
    <main className="mock-inbox">
      <header className="mock-header">
        <div><Link to="/clinic/notifications">← Clinic notifications</Link><h1>QueueLess Mock WhatsApp</h1></div>
        <div className="mock-actions"><span className="mock-badge">Development mode</span>
          <button type="button" aria-expanded={showTest} onClick={() => setShowTest((open) => !open)}>{showTest ? "Close test panel" : "Test message"}</button>
        </div>
      </header>
      {showTest && <MockTestPanel selected={selected} onResult={(item) => {
        selectConversation(item);
        setQuery("");
        setType("");
        setStatus("");
        setPage(1);
        setRevision((value) => value + 1);
      }} />}
      {error && <p className="mock-error" role="alert">{error}</p>}
      <div className="mock-workspace">
        <aside className="mock-conversations" aria-label="Conversations">
          <header><h2>Conversations</h2>
            <input aria-label="Search by patient name or phone number" placeholder="Search name or phone" type="search" value={q} onChange={(event) => { setPage(1); setQuery(event.target.value); }} />
            <div className="mock-filters">
              <select aria-label="Message type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); setHistoryPage(1); }}>
                <option value="">All types</option>
                {Object.entries(types).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <select aria-label="Delivery status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); setHistoryPage(1); }}>
                <option value="">All statuses</option>
                {Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </div>
          </header>
          {!conversations && !error && <p role="status">Loading conversations…</p>}
          {conversations?.messages.length === 0 && <p>No matching conversations.</p>}
          {conversations?.messages.map((item) => (
            <button className="mock-thread" key={item.patientId} type="button" aria-pressed={patientId === item.patientId} onClick={() => selectConversation(item)}>
              <span className="mock-avatar" aria-hidden="true">{item.patientName.slice(0, 1)}</span>
              <span className="mock-thread-text"><strong>{item.patientName}</strong>{item.phone && <small>{item.phone}</small>}<span>{item.message}</span></span>
              <time dateTime={item.createdAt}>{time(item.createdAt)}</time>
            </button>
          ))}
          <Pagination page={page} setPage={setPage} hasMore={conversations?.hasMore} />
        </aside>
        <section className="mock-conversation" aria-label="Selected conversation">
          {selected && <header><span className="mock-avatar" aria-hidden="true">{selected.patientName.slice(0, 1)}</span><div><h2>{selected.patientName}</h2>{selected.phone && <p>{selected.phone}</p>}</div></header>}
          <div className="mock-history">
            {!selected && <p>Select a conversation or simulate a test message.</p>}
            {selected && !messages && !historyError && <p role="status">Loading messages…</p>}
            {historyError && <p role="alert">{historyError}</p>}
            {messages?.length === 0 && <p>No matching messages.</p>}
            {messages && <Pagination page={historyPage} setPage={setHistoryPage} hasMore={history.hasMore} older="Older messages" />}
            {messages?.toReversed().map((item) => (
              <article className="mock-bubble" key={item.id} data-status={item.status}>
                <header><strong>{types[item.type] || item.type}</strong><span>Simulated</span></header>
                <p>{item.message}</p>
                {item.feedbackUrl && (
                  <a className="mock-feedback-link" href={item.feedbackUrl}>Give feedback</a>
                )}
                {item.error && <p className="mock-message-error">{item.error}</p>}
                <footer><time dateTime={item.createdAt}>{time(item.createdAt)}</time><span>{statuses[item.status] || item.status}</span></footer>
                <div className="mock-outcomes">
                  <button type="button" disabled={Boolean(running)} onClick={() => updateOutcome(item.id, "delivery")}>Mark delivered</button>
                  <button type="button" disabled={Boolean(running)} onClick={() => updateOutcome(item.id, "failure")}>Mark failed</button>
                </div>
              </article>
            ))}
          </div>
          <footer className="mock-disclaimer">Simulated only. No messages are sent to real WhatsApp numbers.</footer>
        </section>
      </div>
    </main>
  );
}
