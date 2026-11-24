import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAppLanguage, useTranslate } from "../i18n.jsx";
import PatientShell from "../components/PatientShell.jsx";
import { api } from "../api/client.js";
import { connectPatientQueue } from "../api/realtime.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function PatientRegistration() {
  const { locale } = useAppLanguage();
  const t = useTranslate();
  const [searchParams] = useSearchParams();
  const focusFeedback = searchParams.get("feedback") === "1";
  const feedbackPanel = useRef(null);
  const [secret] = useState(
    () =>
      window.location.hash.slice(1) ||
      sessionStorage.getItem("queueless.patient-link") ||
      "",
  );
  const [data, setData] = useState(null);
  const [estimateReferenceTime, setEstimateReferenceTime] = useState(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const [cancelScheduledAt, setCancelScheduledAt] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [rescheduleOptions, setRescheduleOptions] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackCategories, setFeedbackCategories] = useState([]);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const formatClinicTime = (value) =>
    new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: data?.clinic?.timeZone,
    });
  const formatRescheduleDate = (date) =>
    new Date(`${date}T12:00:00.000Z`).toLocaleDateString(locale, {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  const formatRescheduleTime = (time) => {
    const [hour, minute] = time.split(":").map(Number);
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
  };
  const appointmentStatusLabel = (status) =>
    ({
      needs_attention: "Needs attention",
      needs_rescheduling: "Needs rescheduling",
      missed: "Missed appointment",
      checked_in: "Checked in",
      cancelled: "Cancelled",
    })[status] || status;
  const appointmentRescheduleMode = (appointment, referenceTime) => {
    if (!appointment) return null;
    if (appointment.status === "missed") return "missed_rebooking";
    if (appointment.status === "needs_rescheduling") return "clinic_recovery";
    if (
      appointment.status === "booked" &&
      new Date(appointment.scheduledAt).getTime() > referenceTime
    )
      return "patient_change";
    return null;
  };

  useEffect(() => {
    if (!secret) return;
    sessionStorage.setItem("queueless.patient-link", secret);
    api
      .get("/patient/registration", {
        headers: { Authorization: `Bearer ${secret}` },
      })
      .then(({ data: response }) => {
        setData(response);
        setEstimateReferenceTime(Date.now());
      })
      .catch((requestError) =>
        setError(
          requestError.response?.data?.error ||
            "This private link could not be opened.",
        ),
      );
  }, [secret]);

  useEffect(() => {
    if (!secret) return undefined;
    const socket = connectPatientQueue(secret);
    const refresh = () => {
      socket.emit("patient:joinQueue");
      socket.emit("queue:requestSnapshot");
      api
        .get("/patient/registration", {
          headers: { Authorization: `Bearer ${secret}` },
        })
        .then(({ data: response }) => {
          setData(response);
          setEstimateReferenceTime(Date.now());
        })
        .catch(() => {});
    };
    socket.on("connect", refresh);
    socket.on("queue:updated", refresh);
    socket.on("registration:confirmed", refresh);
    return () => socket.disconnect();
  }, [secret]);

  const feedbackEligible = Boolean(data?.feedback?.eligible);
  useEffect(() => {
    if (focusFeedback && feedbackEligible) feedbackPanel.current?.focus();
  }, [focusFeedback, feedbackEligible]);

  if (!secret) return <Navigate to="/patient/recover" replace />;
  const estimateWindow =
    data?.estimate && estimateReferenceTime
      ? {
          start: estimateReferenceTime + data.estimate.minimumMinutes * 60000,
          end: estimateReferenceTime + data.estimate.maximumMinutes * 60000,
        }
      : null;
  const rescheduleMode = appointmentRescheduleMode(
    data?.appointment,
    estimateReferenceTime || 0,
  );
  const appointmentCancelled = data?.appointment?.status === "cancelled";

  const cancelAppointment = async () => {
    if (actionBusy || !cancelScheduledAt) return;
    setActionBusy(true);
    setCancelError("");
    try {
      await api.post(
        "/patient/cancel",
        { expectedScheduledAt: cancelScheduledAt },
        { headers: { Authorization: `Bearer ${secret}` }, successToast: false },
      );
      setData((current) => ({
        ...current,
        appointment: {
          ...current.appointment,
          status: "cancelled",
          canCancel: false,
        },
        registration: {
          ...current.registration,
          status: "cancelled",
          queueStatus: "cancelled",
          queuePosition: null,
        },
        estimate: null,
      }));
      setCancelScheduledAt(null);
      setRescheduleOptions(null);
    } catch (requestError) {
      setCancelError(
        requestError.response?.data?.error ||
          "Could not cancel your appointment. Please try again.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const updateNotifications = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const enabled = !data.notificationsAllowed;
      await api.put(
        "/patient/notifications/preferences",
        { enabled },
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      setData({ ...data, notificationsAllowed: enabled });
      setError("");
    } catch {
      setError("Could not update your messaging preference.");
    } finally {
      setActionBusy(false);
    }
  };

  const rotateAccess = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const { data: rotated } = await api.post(
        "/patient/access/rotate",
        {},
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      sessionStorage.setItem(
        "queueless.patient-link",
        rotated.accessUrl.split("#")[1],
      );
      window.location.assign(rotated.accessUrl);
    } catch {
      setError("Could not create a replacement private link.");
    } finally {
      setActionBusy(false);
    }
  };

  const revokeAccess = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await api.delete("/patient/access", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      sessionStorage.removeItem("queueless.patient-link");
      setData(null);
      setError("This private link has been revoked.");
      setRevokeError("");
      setShowRevokeDialog(false);
    } catch {
      setRevokeError("Could not revoke this link.");
    } finally {
      setActionBusy(false);
    }
  };

  const copyPrivateLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Private appointment link copied.");
    } catch {
      setCopyMessage(
        "Copy is unavailable here. Keep this page bookmarked or use Recover access later.",
      );
    }
  };

  const loadRescheduleOptions = async () => {
    setActionBusy(true);
    try {
      const { data: options } = await api.get("/patient/reschedule/options", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      setRescheduleOptions(options);
      setSelectedDate(options.days[0]?.date || "");
      setSelectedSlot("");
      setError(
        options.days.length
          ? ""
          : "No future appointment slots are available. Please contact the clinic.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Could not load replacement appointment times.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const confirmReschedule = async () => {
    if (!selectedDate || !selectedSlot) return;
    setActionBusy(true);
    try {
      await api.post(
        "/patient/reschedule",
        {
          date: selectedDate,
          slotTime: selectedSlot,
          expectedScheduledAt: data.appointment.scheduledAt,
        },
        {
          headers: { Authorization: `Bearer ${secret}` },
          successMessage: "Your new appointment has been confirmed.",
        },
      );
      const { data: response } = await api.get("/patient/registration", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      setData(response);
      setEstimateReferenceTime(Date.now());
      setRescheduleOptions(null);
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "That slot is no longer available. Please choose another time.",
      );
      await loadRescheduleOptions();
    } finally {
      setActionBusy(false);
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!feedbackRating || feedbackBusy) return;
    setFeedbackBusy(true);
    try {
      const { data: response } = await api.post(
        "/patient/feedback",
        {
          rating: feedbackRating,
          categories: feedbackCategories,
          comment: feedbackComment,
        },
        {
          headers: { Authorization: `Bearer ${secret}` },
          successMessage: "Thank you for sharing your feedback.",
        },
      );
      setData((current) => ({
        ...current,
        feedback: {
          ...current.feedback,
          submitted: true,
          response: response.feedback,
        },
      }));
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Your feedback could not be submitted. Please try again.",
      );
    } finally {
      setFeedbackBusy(false);
    }
  };

  return (
    <PatientShell>
      <section className="patient-content">
        {error && !data ? (
          <>
            <div className="eyebrow">PRIVATE VISIT LINK</div>
            <h1>Link unavailable</h1>
            <p className="patient-intro">{error}</p>
            <Link className="button button-dark" to="/patient/recover">
              Recover access
            </Link>
          </>
        ) : !data ? (
          <p>{error || "Loading your registration…"}</p>
        ) : (
          <>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="eyebrow">YOUR REGISTRATION</div>
            <h1>{data.clinic.name}</h1>
            <p className="patient-intro">
              Reference {data.registration.reference} · Token A
              {String(data.registration.tokenNumber).padStart(2, "0")}
            </p>
            <div className="confirmation-card">
              <span>REGISTRATION STATUS</span>
              <strong>
                {data.registration.queueStatus || data.registration.status}
              </strong>
              {data.doctor && (
                <p>
                  Doctor: {data.doctor.name}
                  {data.doctor.specialization
                    ? ` · ${data.doctor.specialization}`
                    : ""}
                </p>
              )}
              {data.appointment && (
                <>
                  <span>APPOINTMENT STATUS</span>
                  <strong>
                    {appointmentStatusLabel(data.appointment.status)}
                  </strong>
                  {data.appointment.status === "needs_attention" && (
                    <p className="appointment-status-note">
                      Your doctor is temporarily unavailable during this
                      appointment period. The clinic will update you when the
                      queue can continue.
                    </p>
                  )}
                  {data.appointment.status === "missed" && (
                    <p className="appointment-status-note">
                      We did not record a check-in for this visit. You can
                      choose a new available time below.
                    </p>
                  )}
                  {appointmentCancelled ? (
                    <p className="patient-cancellation-notice" role="status">
                      Your appointment has been cancelled.
                    </p>
                  ) : (
                    <div className="patient-time-estimate">
                      <span>Your appointment</span>
                      <b>{formatClinicTime(data.appointment.scheduledAt)}</b>
                      <small>
                        Please arrive about 10 minutes early to check in.
                      </small>
                    </div>
                  )}
                  {data.appointment.canCancel && (
                    <button
                      type="button"
                      className="button patient-cancel-button"
                      disabled={actionBusy}
                      onClick={() => {
                        setCancelError("");
                        setCancelScheduledAt(data.appointment.scheduledAt);
                      }}
                    >
                      Cancel appointment
                    </button>
                  )}
                </>
              )}
              {data.registration.queuePosition && (
                <p>
                  Current live queue position: {data.registration.queuePosition}
                </p>
              )}
              {!appointmentCancelled && <p>{data.arrivalInstructions}</p>}
              {data.estimate && estimateWindow && (
                <div className="patient-time-estimate live-estimate">
                  <span>Estimated time until your turn</span>
                  <b>
                    {data.estimate.minimumMinutes}–
                    {data.estimate.maximumMinutes} minutes
                  </b>
                  <small>
                    Expected consultation window:{" "}
                    {formatClinicTime(estimateWindow.start)} –{" "}
                    {formatClinicTime(estimateWindow.end)}. This can change as
                    the queue moves.
                  </small>
                </div>
              )}
            </div>
            {data.feedback?.eligible && (
              <section
                ref={feedbackPanel}
                tabIndex={-1}
                className="patient-feedback-panel"
                aria-labelledby="feedback-title"
              >
                {data.feedback.submitted ? (
                  <>
                    <div className="eyebrow">VISIT FEEDBACK</div>
                    <h2 id="feedback-title">
                      {t("Thank you for your feedback")}
                    </h2>
                    <p>
                      {t("You rated this visit")}{" "}
                      {data.feedback.response?.rating}/5.
                    </p>
                  </>
                ) : (
                  <form onSubmit={submitFeedback}>
                    <div className="eyebrow">VISIT FEEDBACK</div>
                    <h2 id="feedback-title">{t("How was your visit?")}</h2>
                    <p>
                      {t(
                        "Your feedback helps the clinic improve future visits.",
                      )}
                    </p>
                    <fieldset
                      className="feedback-rating"
                      aria-label={t("Rate your visit")}
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          className={
                            rating <= feedbackRating ? "is-selected" : ""
                          }
                          aria-label={`${rating} ${t("out of 5")}`}
                          aria-pressed={rating === feedbackRating}
                          onClick={() => setFeedbackRating(rating)}
                        >
                          ★
                        </button>
                      ))}
                    </fieldset>
                    <div className="feedback-categories">
                      {[
                        "Helpful staff",
                        "Clear updates",
                        "Short wait",
                        "Good consultation",
                      ].map((category) => (
                        <label key={category}>
                          <input
                            type="checkbox"
                            checked={feedbackCategories.includes(category)}
                            onChange={() =>
                              setFeedbackCategories((current) =>
                                current.includes(category)
                                  ? current.filter((item) => item !== category)
                                  : [...current, category],
                              )
                            }
                          />
                          {t(category)}
                        </label>
                      ))}
                    </div>
                    <label className="feedback-comment">
                      {t("Optional comment")}
                      <textarea
                        value={feedbackComment}
                        maxLength="1000"
                        placeholder={t("Tell us more about your visit")}
                        onChange={(event) =>
                          setFeedbackComment(event.target.value)
                        }
                      />
                    </label>
                    <button
                      className="button button-dark"
                      disabled={!feedbackRating || feedbackBusy}
                    >
                      {feedbackBusy ? t("Submitting…") : t("Submit feedback")}
                    </button>
                  </form>
                )}
              </section>
            )}
            {rescheduleMode && (
              <section
                className="patient-reschedule-panel"
                aria-labelledby="reschedule-title"
              >
                <div>
                  <div className="eyebrow">APPOINTMENT CHANGE</div>
                  <h2 id="reschedule-title">
                    {rescheduleMode === "patient_change"
                      ? "Change your appointment"
                      : rescheduleMode === "missed_rebooking"
                        ? "Rebook your missed appointment"
                        : "Choose a new appointment time"}
                  </h2>
                  <p>
                    {rescheduleMode === "patient_change"
                      ? "Your current appointment remains reserved until you confirm a new time."
                      : rescheduleMode === "missed_rebooking"
                        ? "Choose a new available time for your missed visit."
                        : "Your doctor is unavailable for this visit. Your existing booking stays protected until you confirm a replacement."}
                  </p>
                </div>
                {!rescheduleOptions ? (
                  <button
                    type="button"
                    className="button button-dark"
                    disabled={actionBusy}
                    onClick={loadRescheduleOptions}
                  >
                    {actionBusy
                      ? "Finding available times…"
                      : rescheduleMode === "patient_change"
                        ? "Choose a new time"
                        : "View available times"}
                  </button>
                ) : rescheduleOptions.days.length ? (
                  <div className="reschedule-controls">
                    <label>
                      Choose a date
                      <select
                        value={selectedDate}
                        onChange={(event) => {
                          setSelectedDate(event.target.value);
                          setSelectedSlot("");
                        }}
                      >
                        {rescheduleOptions.days.map((day) => (
                          <option key={day.date} value={day.date}>
                            {formatRescheduleDate(day.date)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Choose a time
                      <select
                        value={selectedSlot}
                        onChange={(event) =>
                          setSelectedSlot(event.target.value)
                        }
                      >
                        <option value="">Select a time</option>
                        {(
                          rescheduleOptions.days.find(
                            (day) => day.date === selectedDate,
                          )?.slots || []
                        ).map((slot) => (
                          <option key={slot.time} value={slot.time}>
                            {formatRescheduleTime(slot.time)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="button button-dark"
                      disabled={actionBusy || !selectedSlot}
                      onClick={confirmReschedule}
                    >
                      {actionBusy ? "Confirming…" : "Confirm new appointment"}
                    </button>
                  </div>
                ) : (
                  <p className="form-error">
                    No future slots are currently available. Please contact the
                    clinic for help.
                  </p>
                )}
              </section>
            )}
            <div className="patient-contact-details">
              <p className="patient-intro">
                {data.clinic.address}, {data.clinic.city} ·{" "}
                {data.clinic.contactNumber}
              </p>
              <p className="patient-intro">
                WhatsApp updates{" "}
                <span
                  className={
                    data.notificationsAllowed
                      ? "status-indicator is-on"
                      : "status-indicator is-off"
                  }
                >
                  {data.notificationsAllowed ? "On" : "Off"}
                </span>
              </p>
            </div>
            <section
              className="private-link-actions"
              aria-labelledby="private-link-actions-title"
            >
              <h2 id="private-link-actions-title">
                Manage your appointment link
              </h2>
              <p>
                Keep this link to reopen your visit details. You can change its
                settings below.
              </p>
              <button
                type="button"
                className="button button-light patient-copy-link"
                onClick={copyPrivateLink}
              >
                Copy private appointment link
              </button>
              {copyMessage && (
                <p className="copy-status" role="status">
                  {copyMessage}
                </p>
              )}
              <div className="patient-secondary-actions">
                <button
                  type="button"
                  className="text-button"
                  disabled={actionBusy}
                  onClick={updateNotifications}
                >
                  {data.notificationsAllowed
                    ? "Turn WhatsApp updates off"
                    : "Turn WhatsApp updates on"}
                </button>
                {!appointmentCancelled && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={actionBusy}
                    onClick={rotateAccess}
                  >
                    {actionBusy
                      ? "Updating private link…"
                      : "Create a new private link"}
                  </button>
                )}
                <button
                  type="button"
                  className="text-button danger-text"
                  disabled={actionBusy}
                  onClick={() => {
                    setRevokeError("");
                    setShowRevokeDialog(true);
                  }}
                >
                  Revoke this link
                </button>
              </div>
            </section>
            <Link className="text-button patient-back-link" to="/clinics">
              Find another clinic
            </Link>
          </>
        )}
        {showRevokeDialog && (
          <ConfirmDialog
            title="Revoke private link?"
            description="This link will stop working immediately. You can recover access again using your mobile number and a verification code."
            confirmLabel="Revoke link"
            cancelLabel="Keep link"
            destructive
            busy={actionBusy}
            error={revokeError}
            onClose={() => {
              if (!actionBusy) {
                setShowRevokeDialog(false);
                setRevokeError("");
              }
            }}
            onConfirm={revokeAccess}
          />
        )}
        {cancelScheduledAt && (
          <ConfirmDialog
            title="Cancel appointment?"
            description={t(
              "Your appointment on {date} will be cancelled and the slot will become available to other patients.",
            ).replace("{date}", formatClinicTime(cancelScheduledAt))}
            confirmLabel="Cancel appointment"
            cancelLabel="Keep appointment"
            destructive
            busy={actionBusy}
            error={cancelError}
            onClose={() => setCancelScheduledAt(null)}
            onConfirm={cancelAppointment}
          />
        )}
      </section>
    </PatientShell>
  );
}
