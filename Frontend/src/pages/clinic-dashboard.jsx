import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Localized, useAppLanguage } from "../i18n.jsx";
import { api } from "../api/client.js";
import { connectClinicQueue } from "../api/realtime.js";
import { FieldError } from "../components/FieldError.jsx";
import DropdownSelect from "../components/DropdownSelect.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ClinicLoading from "../components/ClinicLoading.jsx";
import ClinicSidebar from "../components/ClinicSidebar.jsx";
import { filterQueue } from "../utils/queue-search.js";
import TablePagination, {
  TABLE_PAGE_SIZE,
} from "../components/TablePagination.jsx";
import {
  mobileRule,
  minLength,
  required,
  validateFields,
} from "../components/validation.js";

export default function ClinicDashboard() {
  const { locale } = useAppLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [setup, setSetup] = useState(null);
  const [billing, setBilling] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    doctorId: "",
    notes: "",
    consentToContact: false,
  });
  const [error, setError] = useState("");
  const [walkInError, setWalkInError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [dialogAction, setDialogAction] = useState(null);
  const [dialogError, setDialogError] = useState("");
  const [consultationDoctor, setConsultationDoctor] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [patientsAhead, setPatientsAhead] = useState("0");
  const [pendingQueueId, setPendingQueueId] = useState("");
  const [queuePage, setQueuePage] = useState(1);
  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatus, setQueueStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const actionPendingRef = useRef(false);
  const load = useCallback(async () => {
    try {
      const [
        { data: board },
        { data: config },
        { data: team },
        { data: billingInfo },
      ] = await Promise.all([
        api.get("/clinic/dashboard", {
          params: { date: selectedDate || undefined },
        }),
        api.get("/clinic/setup"),
        api.get("/clinic/doctors"),
        api.get("/clinic/billing"),
      ]);
      setDashboard(board);
      setSetup(config);
      setDoctors(team.doctors);
      setBilling(billingInfo);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "Could not load the queue.",
      );
    }
  }, [selectedDate]);
  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0);
    const interval = window.setInterval(load, 20000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);
  useEffect(() => {
    let active = true;
    const refreshUnreadCount = async () => {
      if (
        !localStorage.getItem("queueless.session") ||
        document.visibilityState !== "visible"
      )
        return;
      try {
        const { data } = await api.get("/clinic/notifications/unread-count");
        if (active) setUnreadNotificationCount(Number(data.count) || 0);
      } catch {
        /* Keep the last known count during a temporary network failure. */
      }
    };
    refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, 15000);
    window.addEventListener("focus", refreshUnreadCount);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshUnreadCount);
    };
  }, []);
  useEffect(() => {
    const token = localStorage.getItem("queueless.session");
    if (!token) return undefined;
    const socket = connectClinicQueue();
    const refresh = () => {
      socket.emit("clinic:joinQueue");
      socket.emit("queue:requestSnapshot");
      load();
    };
    socket.on("connect", refresh);
    socket.on("queue:updated", load);
    socket.on("registration:confirmed", load);
    return () => socket.disconnect();
  }, [load]);
  const addWalkIn = async (event) => {
    event.preventDefault();
    if (dashboard?.isToday === false) return;
    setWalkInError("");
    const invalid = validateFields(form, {
      name: [required("Patient name"), minLength(2, "Patient name")],
      mobile: [required("Mobile number"), mobileRule],
    });
    setFieldErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      const { data } = await api.post("/clinic/walk-ins", form, {
        successToast: false,
      });
      setForm({ name: "", mobile: "", doctorId: "", notes: "", consentToContact: false });
      setFieldErrors({});
      setToast(
        `Token ${data.registration.tokenNumber} added · ${data.registration.reference}`,
      );
      await load();
    } catch (requestError) {
      setWalkInError(
        requestError.response?.data?.error ||
          "Could not register this patient.",
      );
    } finally {
      setBusy(false);
    }
  };
  const updateWalkIn = (field, value) => {
    setForm((old) => ({ ...old, [field]: value }));
    if (!fieldErrors[field]) return;
    const rules = {
      name: [required("Patient name"), minLength(2, "Patient name")],
      mobile: [required("Mobile number"), mobileRule],
    };
    const nextError = validateFields(
      { [field]: value },
      { [field]: rules[field] },
    )[field];
    setFieldErrors((old) => ({ ...old, [field]: nextError }));
  };
  const performAction = async (queueId, action) => {
    if (dashboard?.isToday === false) return;
    if (["cancel", "miss", "return-override"].includes(action)) {
      setDialogError("");
      setOverrideReason("");
      setPatientsAhead("0");
      setDialogAction({ queueId, action });
      return;
    }
    await submitQueueAction(queueId, action);
  };
  const submitQueueAction = async (
    queueId,
    action,
    payload = {},
    fromDialog = false,
  ) => {
    if (actionPendingRef.current) return false;
    actionPendingRef.current = true;
    setError("");
    setPendingQueueId(queueId);
    try {
      await api.post(`/clinic/queue/${queueId}/${action}`, payload, {
        successToast: false,
      });
      if (fromDialog) setDialogAction(null);
      const successMessage = {
        "check-in": "Patient checked in.",
        start: "Consultation started.",
        cancel: "Registration cancelled.",
        miss: "Patient marked as missed.",
        return: "Patient returned to the queue.",
      }[action] || "Queue entry updated.";
      setToast(successMessage);
      await load();
      return true;
    } catch (requestError) {
      const message =
        requestError.response?.data?.error ||
        "Could not update this queue entry.";
      if (fromDialog) setDialogError(message);
      else setError(message);
      if (fromDialog && action === "start") await load();
      return false;
    } finally {
      actionPendingRef.current = false;
      setPendingQueueId("");
    }
  };
  const confirmQueueAction = async () => {
    if (!dialogAction) return;
    const { queueId, action } = dialogAction;
    if (action === "return-override") {
      const ahead = Number(patientsAhead);
      if (overrideReason.trim().length < 5) {
        setDialogError("Enter an override reason of at least five characters.");
        return;
      }
      if (!Number.isInteger(ahead) || ahead < 0 || ahead > 30) {
        setDialogError("Enter a whole number from 0 to 30.");
        return;
      }
      await submitQueueAction(
        queueId,
        "return",
        {
          overrideReturnRule: true,
          overrideReason: overrideReason.trim(),
          patientsAhead: ahead,
        },
        true,
      );
      return;
    }
    await submitQueueAction(queueId, action, {}, true);
  };
  const callNext = async () => {
    if (dashboard?.isToday === false || actionPendingRef.current) return;
    actionPendingRef.current = true;
    setPendingQueueId("call-next");
    setError("");
    try {
      const { data } = await api.post(
        "/clinic/queue/call-next",
        {},
        { successToast: false },
      );
      setToast(`Now calling token ${data.queueEntry.tokenNumber}`);
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Could not call the next patient.",
      );
    } finally {
      actionPendingRef.current = false;
      setPendingQueueId("");
    }
  };
  if (!localStorage.getItem("queueless.session"))
    return <Navigate to="/login" replace />;
  if (!dashboard || !setup)
    return (
      <main className="portal-shell clinic-dashboard-loading">
        <ClinicSidebar />
        <section className="portal-main">
          <header className="dashboard-header">
            <div>
              <div className="eyebrow">CLINIC OVERVIEW</div>
              <h1>Clinic dashboard</h1>
              <p>{error || "Preparing today’s queue…"}</p>
            </div>
            {error && (
              <button className="button button-dark" onClick={load}>
                Try again
              </button>
            )}
          </header>
          <div className="metric-grid" aria-hidden="true">
            {[
              "Registered today",
              "Waiting now",
              "In consultation",
              "Completed",
            ].map((label) => (
              <article className="metric-card loading-metric" key={label}>
                <span>{label}</span>
                <i />
                <small>Updating clinic data</small>
              </article>
            ))}
          </div>
          <section className="dashboard-columns">
            <div className="queue-panel loading-panel">
              <ClinicLoading>Loading today’s queue…</ClinicLoading>
            </div>
            <aside className="walkin-panel loading-panel">
              <ClinicLoading>Loading registration form…</ClinicLoading>
            </aside>
          </section>
        </section>
      </main>
    );
  if (!setup.setupComplete) return <Navigate to="/clinic/setup" replace />;
  const isViewingToday = dashboard.isToday !== false;
  const doctorOptions = (dashboard.availableDoctors || []).map((doctor) => ({
    value: doctor.id,
    label: doctor.name,
  }));
  const selectedConsultationDoctor = doctorOptions.some(({ value }) => value === consultationDoctor)
    ? consultationDoctor
    : doctorOptions.length === 1 ? doctorOptions[0].value : "";
  const cards = [
    [
      isViewingToday ? "Registered today" : "Scheduled",
      dashboard.summary.registrations,
      isViewingToday ? "visits booked or added" : "appointments booked",
    ],
    ["Waiting now", dashboard.summary.waiting, "in the queue"],
    ["In consultation", dashboard.summary.consulting, "with a doctor"],
    ["Completed", dashboard.summary.completed, "visits today"],
  ];
  const matchingQueue = filterQueue(dashboard.queue, queueSearch, queueStatus === "registered");
  const appointmentTime = new Intl.DateTimeFormat(locale, {
    timeStyle: "short",
    timeZone: dashboard.timeZone || "Asia/Kolkata",
  });
  const queuePageCount = Math.max(
    1,
    Math.ceil(matchingQueue.length / TABLE_PAGE_SIZE),
  );
  const activeQueuePage = Math.min(queuePage, queuePageCount);
  const visibleQueue = matchingQueue.slice(
    (activeQueuePage - 1) * TABLE_PAGE_SIZE,
    activeQueuePage * TABLE_PAGE_SIZE,
  );
  return (
    <Localized>
      <main className="portal-shell">
        <ClinicSidebar clinicName={setup.clinic.name} />
        <section
          className={`portal-main ${isViewingToday ? "" : "dashboard-schedule-readonly"}`}
        >
          <header className="dashboard-header">
            <div>
              <div className="eyebrow">CLINIC OVERVIEW</div>
              <h1 className="dashboard-welcome">
                {isViewingToday ? "Welcome" : "Clinic schedule"}
              </h1>
              <p>
                {isViewingToday
                  ? "Here’s what’s happening at your clinic today."
                  : `Viewing appointments for ${new Date(`${dashboard.date}T12:00:00`).toLocaleDateString(locale, { dateStyle: "full" })}.`}
              </p>
            </div>
            <div className="header-actions">
              <input
                className="date-chip dashboard-date-picker"
                type="date"
                min={dashboard.todayDate || dashboard.date}
                value={dashboard.date}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setQueuePage(1);
                }}
                aria-label="Choose clinic schedule date"
              />
              <Link
                className="notification-icon-link"
                to="/clinic/setup"
                state={{ from: "/clinic/queue" }}
                aria-label="Clinic settings"
                title="Clinic settings"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
                  <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3H3.7a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" />
                </svg>
              </Link>
              <Link className="subscription-link" to="/clinic/billing">
                <span className="subscription-link-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
                    <path d="M4 10h16M7 14.5h3" />
                  </svg>
                </span>
                <span>Subscription</span>
                <span className="subscription-link-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
              <Link
                className={`notification-icon-link ${unreadNotificationCount ? "has-unread" : ""}`}
                to="/clinic/notifications"
                aria-label={
                  unreadNotificationCount
                    ? `Notifications, ${unreadNotificationCount} unread`
                    : "Notifications"
                }
                title={
                  unreadNotificationCount
                    ? `${unreadNotificationCount} unread notifications`
                    : "Notifications"
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3V8" />
                  <path d="M10 20h4" />
                </svg>
                {unreadNotificationCount > 0 && (
                  <span className="notification-count-badge" aria-hidden="true">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
              </Link>
            </div>
          </header>
          {billing &&
            (billing.subscription.accessStatus === "expired" ||
              billing.subscription.daysRemaining <= 7) && (
              <p className="portal-alert" role="status">
                {billing.subscription.accessStatus === "expired"
                  ? "Your trial or subscription has expired. Existing queue records remain available; new registrations are paused."
                  : `${billing.subscription.daysRemaining} days remain on your ${billing.subscription.status}.`}{" "}
                <Link to="/clinic/billing">Manage subscription</Link>
              </p>
            )}
          {error && (
            <p className="portal-alert" role="alert">
              {error}
            </p>
          )}
          {toast && (
            <p className="portal-toast" role="status">
              {toast}
              <button onClick={() => setToast("")}>×</button>
            </p>
          )}
          <section className="metric-grid">
            {cards.map(([title, value, note]) => (
              <article className="metric-card" key={title}>
                <span>{title}</span>
                <strong>
                  {typeof value === "number"
                    ? value.toLocaleString(locale)
                    : value}
                </strong>
                <small>{note}</small>
              </article>
            ))}
          </section>
          <section className="dashboard-columns">
            <div className="queue-panel">
              <header className="panel-title live-queue-header">
                <div className="live-queue-heading">
                  <h2>Live queue</h2>
                  <p>
                    <span className="live-dot" /> Updates every 20 seconds
                  </p>
                </div>
                <div className="patient-list-filters live-queue-filters">
                  <label>
                    Search live queue
                    <input
                      type="search"
                      placeholder="Name, mobile, token or reference"
                      value={queueSearch}
                      onChange={(event) => {
                        setQueueSearch(event.target.value);
                        setQueuePage(1);
                      }}
                    />
                  </label>
                  <label>
                    Status
                    <DropdownSelect
                      label="Status"
                      value={queueStatus}
                      options={[
                        { value: "all", label: "All statuses" },
                        { value: "registered", label: "Awaiting check-in" },
                      ]}
                      onChange={(value) => {
                        setQueueStatus(value);
                        setQueuePage(1);
                      }}
                    />
                  </label>
                </div>
                <button
                  className="button button-dark call-next"
                  disabled={!isViewingToday || !!pendingQueueId}
                  onClick={callNext}
                >
                  Call next patient <span>↗</span>
                </button>
              </header>
              {dashboard.queue.length === 0 ? (
                <div className="queue-empty">
                  <span>☼</span>
                  <h3>Your queue is clear</h3>
                  <p>
                    Registered patients will show here. Add a walk-in to get
                    started.
                  </p>
                </div>
              ) : matchingQueue.length === 0 ? (
                <div className="queue-empty" role="status">
                  <h3>No patients match these filters.</h3>
                </div>
              ) : (
                <>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>TOKEN</th>
                          <th>PATIENT</th>
                          <th>DOCTOR</th>
                          <th>STATUS</th>
                          <th>POSITION</th>
                          <th>EST. WAIT</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleQueue.map((row) => (
                          <tr key={row.queue_id}>
                            <td>
                              <strong className="table-token">
                                A{String(row.token_number).padStart(2, "0")}
                              </strong>
                              <small>{row.reference}</small>
                            </td>
                            <td>
                              <b>{row.patient_name}</b>
                              <small>{row.patient_mobile}</small>
                              {row.consent_to_contact === false && (
                                <small className="queue-contact-off">Messaging off</small>
                              )}
                            </td>
                            <td>
                              {row.doctor_name || "Any doctor"}
                              {row.scheduled_at && (
                                <small>{appointmentTime.format(new Date(row.scheduled_at))}</small>
                              )}
                            </td>
                            <td>
                              <span
                                className={`status-pill status-${row.queue_status}`}
                              >
                                {row.queue_status.replace("_", " ")}
                              </span>
                            </td>
                            <td>{row.position ? `#${row.position}` : "—"}</td>
                            <td>
                              {row.estimatedWaitMinutes === null
                                ? "—"
                                : `~${row.estimatedWaitMinutes}–${row.estimatedWaitMaximumMinutes} min`}
                            </td>
                            <td>
                              <div className="row-actions">
                                {row.queue_status === "registered" && (
                                  <button
                                    disabled={!!pendingQueueId}
                                    onClick={() =>
                                      performAction(row.queue_id, "check-in")
                                    }
                                  >
                                    Check in
                                  </button>
                                )}
                                {row.queue_status === "waiting" && (
                                  <button
                                    disabled={!!pendingQueueId}
                                    onClick={() =>
                                      performAction(row.queue_id, "call")
                                    }
                                  >
                                    Call
                                  </button>
                                )}
                                {row.queue_status === "called" && (
                                  <>
                                    <button
                                      disabled={
                                        !isViewingToday ||
                                        !!pendingQueueId ||
                                        (!row.doctor_id && !doctorOptions.length)
                                      }
                                      onClick={() => {
                                        if (row.doctor_id) {
                                          void performAction(row.queue_id, "start");
                                          return;
                                        }
                                        setConsultationDoctor("");
                                        setDialogError("");
                                        setDialogAction({
                                          queueId: row.queue_id,
                                          action: "assign-doctor",
                                        });
                                      }}
                                    >
                                      Start
                                    </button>
                                    {isViewingToday && !row.doctor_id && !doctorOptions.length && (
                                      <small>No doctors available</small>
                                    )}
                                    <button
                                      className="quiet-action"
                                      disabled={!!pendingQueueId}
                                      onClick={() =>
                                        performAction(row.queue_id, "miss")
                                      }
                                    >
                                      Missed
                                    </button>
                                  </>
                                )}
                                {row.queue_status === "missed" && (
                                  <>
                                    <button
                                      disabled={!!pendingQueueId}
                                      onClick={() =>
                                        performAction(row.queue_id, "return")
                                      }
                                    >
                                      Return to queue
                                    </button>
                                    <button
                                      className="quiet-action"
                                      disabled={!!pendingQueueId}
                                      onClick={() =>
                                        performAction(
                                          row.queue_id,
                                          "return-override",
                                        )
                                      }
                                    >
                                      Administrator override
                                    </button>
                                  </>
                                )}
                                {row.queue_status === "in_consultation" && (
                                  <button
                                    disabled={!!pendingQueueId}
                                    onClick={() =>
                                      performAction(row.queue_id, "complete")
                                    }
                                  >
                                    Complete
                                  </button>
                                )}
                                {["waiting", "called"].includes(
                                  row.queue_status,
                                ) && (
                                  <button
                                    className="quiet-action"
                                    disabled={!!pendingQueueId}
                                    onClick={() =>
                                      performAction(row.queue_id, "cancel")
                                    }
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    total={matchingQueue.length}
                    page={activeQueuePage}
                    onPageChange={setQueuePage}
                    label="patients"
                  />
                </>
              )}
            </div>
            <aside className="walkin-panel">
              <div className="panel-title">
                <div>
                  <h2>Register a walk-in</h2>
                  <p>New patient or returning visitor</p>
                </div>
                <span className="plus-mark">＋</span>
              </div>
              <form noValidate onSubmit={addWalkIn}>
                <label className={fieldErrors.name ? "has-field-error" : ""}>
                  Patient name<span className="required-mark">*</span>
                  <input
                    required
                    minLength="2"
                    maxLength="160"
                    value={form.name}
                    aria-invalid={!!fieldErrors.name}
                    onChange={(e) => updateWalkIn("name", e.target.value)}
                    placeholder="Full name"
                  />
                  <FieldError>{fieldErrors.name}</FieldError>
                </label>
                <label className={fieldErrors.mobile ? "has-field-error" : ""}>
                  Mobile number<span className="required-mark"> *</span>
                  <input
                    required
                    type="tel"
                    value={form.mobile}
                    aria-invalid={!!fieldErrors.mobile}
                    onChange={(e) => updateWalkIn("mobile", e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                  <FieldError>{fieldErrors.mobile}</FieldError>
                </label>
                <label>
                  Doctor <small className="optional-label">Optional</small>
                  <DropdownSelect
                    label="Doctor"
                    value={form.doctorId}
                    options={[
                      { value: "", label: "Any available doctor" },
                      ...doctors.map((item) => ({
                        value: item.id,
                        label: item.name,
                      })),
                    ]}
                    onChange={(doctorId) => setForm({ ...form, doctorId })}
                  />
                </label>
                <label>
                  Reception note{" "}
                  <small className="optional-label">Optional</small>
                  <textarea
                    maxLength="500"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Brief note for the clinic team"
                    rows="3"
                  />
                </label>
                <div className="walkin-contact-preference">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.consentToContact}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        consentToContact: event.target.checked,
                      }))}
                    />
                    <span>The patient agrees to receive WhatsApp updates for this visit.</span>
                  </label>
                </div>
                {walkInError && (
                  <p className="form-error" role="alert">
                    {walkInError}
                  </p>
                )}
                <button
                  className="button button-dark form-submit"
                  disabled={busy}
                >
                  {busy ? "Adding patient…" : "Add to today’s queue"}{" "}
                  <span>↗</span>
                </button>
                <p className="walkin-note">
                  Walk-ins can be registered during configured clinic hours. A
                  permanent reference and token are assigned.
                </p>
              </form>
            </aside>
          </section>
          <div className="dashboard-foot">
            <span>{dashboard.summary.missed} missed turns</span>
            <span>{dashboard.summary.cancelled} cancelled</span>
            <span>Reception actions are recorded in the activity log.</span>
          </div>
        </section>
        {dialogAction?.action === "assign-doctor" && (
          <ConfirmDialog
            title="Assign a doctor"
            confirmLabel="Start consultation"
            cancelLabel="Cancel"
            busy={pendingQueueId === dialogAction.queueId}
            confirmDisabled={!selectedConsultationDoctor}
            error={dialogError}
            onClose={() => setDialogAction(null)}
            onConfirm={() => submitQueueAction(
              dialogAction.queueId, "start", { doctorId: selectedConsultationDoctor }, true,
            )}
          >
            {doctorOptions.length ? (
              <DropdownSelect
                label="Choose an available doctor"
                placeholder="Choose an available doctor"
                value={selectedConsultationDoctor}
                options={doctorOptions}
                onChange={(doctorId) => {
                  setConsultationDoctor(doctorId);
                  setDialogError("");
                }}
              />
            ) : (
              <p role="status">No doctors available</p>
            )}
          </ConfirmDialog>
        )}
        {dialogAction && dialogAction.action !== "assign-doctor" && (
          <ConfirmDialog
            title={
              dialogAction.action === "cancel"
                ? "Cancel registration?"
                : dialogAction.action === "miss"
                  ? "Mark patient as missed?"
                  : "Override return queue rule?"
            }
            description={
              dialogAction.action === "cancel"
                ? "The patient will be removed from the active queue and this registration will be marked cancelled."
                : dialogAction.action === "miss"
                  ? "The patient will be marked as having missed their turn. You can return them to the queue later."
                  : "Set how many eligible waiting patients should remain ahead. This override will be recorded in the activity log."
            }
            confirmLabel={
              dialogAction.action === "cancel"
                ? "Confirm cancellation"
                : dialogAction.action === "miss"
                  ? "Confirm missed turn"
                  : "Apply override"
            }
            cancelLabel={
              dialogAction.action === "cancel"
                ? "Keep registration"
                : dialogAction.action === "miss"
                  ? "Keep in queue"
                  : "Cancel"
            }
            destructive={dialogAction.action !== "return-override"}
            busy={pendingQueueId === dialogAction.queueId}
            error={dialogError}
            onClose={() => {
              if (pendingQueueId) return;
              setDialogAction(null);
              setDialogError("");
            }}
            onConfirm={confirmQueueAction}
          >
            {dialogAction.action === "return-override" && (
              <div className="dialog-fields">
                <label htmlFor="override-reason">Reason</label>
                <input
                  id="override-reason"
                  value={overrideReason}
                  maxLength="500"
                  onChange={(event) => {
                    setOverrideReason(event.target.value);
                    setDialogError("");
                  }}
                  placeholder="At least 5 characters"
                />
                <label htmlFor="patients-ahead">
                  Eligible patients to keep ahead
                </label>
                <input
                  id="patients-ahead"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={patientsAhead}
                  onChange={(event) => {
                    setPatientsAhead(event.target.value);
                    setDialogError("");
                  }}
                />
              </div>
            )}
          </ConfirmDialog>
        )}
      </main>
    </Localized>
  );
}
