import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PatientShell from "../components/PatientShell.jsx";
import { useAppLanguage, useTranslate } from "../i18n.jsx";
import { api } from "../api/client.js";
import { FieldError } from "../components/FieldError.jsx";
import {
  mobileRule,
  required,
  validateFields,
} from "../components/validation.js";

const ACTIVE = new Set([
  "registered",
  "waiting",
  "called",
  "in_consultation",
  "missed",
]);
const VISIT_STATUS_LABELS = {
  booked: "Booked",
  cancelled: "Cancelled",
  checked_in: "Checked in",
  completed: "Completed",
  in_consultation: "In consultation",
  missed: "Missed appointment",
  needs_attention: "Doctor delayed",
  needs_rescheduling: "Needs rescheduling",
};

export default function PatientRecovery() {
  const { locale } = useAppLanguage();
  const t = useTranslate();
  const [searchParams] = useSearchParams();
  const requestedReference = searchParams.get("feedback") || "";
  const feedbackReference = /^QL[A-F0-9]{14}$/i.test(requestedReference)
    ? requestedReference
    : null;
  const [mobile, setMobile] = useState("+91 ");
  const [code, setCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [lookupToken, setLookupToken] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [privateLinks, setPrivateLinks] = useState({});
  const [selectedReference, setSelectedReference] = useState("");
  const [step, setStep] = useState("request");
  const [error, setError] = useState("");
  const [feedbackLinkError, setFeedbackLinkError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const loadAppointments = useCallback(async (token, showError = true) => {
    if (showError) setLoadingAppointments(true);
    try {
      const { data } = await api.get("/patient/recovery/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(data.appointments);
      setError("");
      if (showError) setLoadingAppointments(false);
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setLookupToken("");
        setAppointments([]);
        setStep("request");
        setError(
          "Your secure lookup session expired. Verify your mobile number again.",
        );
      } else if (showError)
        setError(
          requestError.response?.data?.error ||
            "Appointments could not be loaded.",
        );
      if (showError) setLoadingAppointments(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!lookupToken) return undefined;
    const initialLoad = window.setTimeout(() => {
      void loadAppointments(lookupToken);
    }, 0);
    const timer = window.setInterval(() => {
      void loadAppointments(lookupToken, false);
    }, 30000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [lookupToken, loadAppointments]);

  const updateMobile = (value) => {
    setMobile(value);
    if (!fieldErrors.mobile) return;
    const nextError = validateFields(
      { mobile: value },
      { mobile: [required("Mobile number"), mobileRule] },
    ).mobile;
    setFieldErrors((old) => ({ ...old, mobile: nextError }));
  };
  const updateCode = (value) => {
    const next = value.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    if (!fieldErrors.code) return;
    const nextError = validateFields(
      { code: next },
      {
        code: [
          required("Verification code"),
          {
            test: (entry) => /^\d{6}$/.test(entry),
            message: "Enter the six-digit verification code.",
          },
        ],
      },
    ).code;
    setFieldErrors((old) => ({ ...old, code: nextError }));
  };

  const showCodeRequestError = (requestError, fallback) => {
    const response = requestError.response?.data;
    if (response?.code === "MOBILE_NOT_REGISTERED") {
      setStep("request");
      setFieldErrors({ mobile: response.error });
    } else {
      setError(response?.error || fallback);
    }
  };

  const requestCode = async (event) => {
    event.preventDefault();
    setError("");
    const invalid = validateFields(
      { mobile },
      { mobile: [required("Mobile number"), mobileRule] },
    );
    setFieldErrors(invalid);
    if (Object.keys(invalid).length || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post("/patient/recovery/request", { mobile });
      setDevelopmentCode(data.developmentCode || "");
      setCode("");
      setStep("verify");
      setCooldown(60);
    } catch (requestError) {
      showCodeRequestError(requestError, "Could not request a verification code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setError("");
    const invalid = validateFields(
      { code },
      {
        code: [
          required("Verification code"),
          {
            test: (value) => /^\d{6}$/.test(value),
            message: "Enter the six-digit verification code.",
          },
        ],
      },
    );
    setFieldErrors(invalid);
    if (Object.keys(invalid).length || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post("/patient/recovery/verify", {
        mobile,
        code,
      });
      if (feedbackReference) {
        try {
          const { data: link } = await api.post(
            `/patient/recovery/appointments/${feedbackReference}/access`,
            { purpose: "feedback" },
            { headers: { Authorization: `Bearer ${data.lookupToken}` }, successToast: false },
          );
          window.location.assign(link.accessUrl);
          return;
        } catch {
          setFeedbackLinkError(true);
        }
      }
      setLookupToken(data.lookupToken);
      setLoadingAppointments(true);
      setStep("appointments");
    } catch (requestError) {
      setError(
        requestError.response?.status === 400
          ? "The code is invalid or expired. Please enter the mobile number you registered with and request a new code."
          : requestError.response?.data?.error || "The code could not be verified.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/patient/recovery/request", { mobile });
      setDevelopmentCode(data.developmentCode || "");
      setCooldown(60);
      setCode("");
    } catch (requestError) {
      showCodeRequestError(requestError, "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  };

  const replacePrivateLink = async (reference) => {
    if (!lookupToken || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        `/patient/recovery/appointments/${reference}/access`,
        {},
        { headers: { Authorization: `Bearer ${lookupToken}` } },
      );
      setPrivateLinks((links) => ({ ...links, [reference]: data.accessUrl }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Could not create a private appointment link.",
      );
    } finally {
      setBusy(false);
    }
  };

  const activeAppointments = useMemo(
    () =>
      appointments.filter(
        (item) => {
          const status = item.appointment?.status;
          if (
            ["cancelled", "completed"].includes(item.registrationStatus) ||
            ["cancelled", "completed", "rescheduled"].includes(status)
          ) return false;
          return ACTIVE.has(item.registrationStatus) ||
            (item.appointment && new Date(item.appointment.scheduledAt) >= new Date());
        },
      ),
    [appointments],
  );
  const pastAppointments = useMemo(
    () => appointments.filter((item) => !activeAppointments.includes(item)),
    [appointments, activeAppointments],
  );
  const formatTime = (item) =>
    item.appointment
      ? new Date(item.appointment.scheduledAt).toLocaleString(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: item.clinic.timeZone || "Asia/Kolkata",
        })
      : "Walk-in";
  const appointmentCard = (item) => {
    const expanded = selectedReference === item.reference;
    const status = ["cancelled", "completed", "missed"].includes(item.registrationStatus)
      ? item.registrationStatus
      : item.appointment?.status || item.registrationStatus;
    const cancelled = status === "cancelled";
    const showArrival = !cancelled && ACTIVE.has(item.registrationStatus) && status !== "missed";
    const detailsId = `visit-details-${item.reference}`;
    return (
      <article
        className="clinic-result my-appointment-card"
        key={item.reference}
      >
        <div className="my-appointment-summary">
          <span className="appointment-status" data-status={status}>
            {VISIT_STATUS_LABELS[status] || status}
          </span>
          <h2>{item.clinic.name}</h2>
          <p>
            {formatTime(item)} · Token A
            {String(item.tokenNumber).padStart(2, "0")}
          </p>
          <small>
            {item.doctor?.name || "No doctor selected"}
            {item.doctor?.specialization
              ? ` · ${item.doctor.specialization}`
              : ""}
          </small>
        </div>
        <button
          type="button"
          className="button button-light"
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={() => setSelectedReference(expanded ? "" : item.reference)}
        >
          {expanded ? "Hide details" : "View details"}
        </button>
        {expanded && (
          <div className="my-appointment-details" id={detailsId}>
            <dl className="appointment-details-grid">
              <div>
                <dt>Reference</dt>
                <dd>{item.reference}</dd>
              </div>
              <div>
                <dt>Visit type</dt>
                <dd>{item.visitType === "walk_in" ? "Walk-in" : "Appointment"}</dd>
              </div>
              <div>
                <dt>Clinic address</dt>
                <dd>{[item.clinic.address, item.clinic.city, item.clinic.state].filter(Boolean).join(", ")}</dd>
              </div>
              {showArrival && (
                <div>
                  <dt>Check-in</dt>
                  <dd>{item.arrivalStatus}</dd>
                </div>
              )}
            </dl>
            {item.queuePosition && (
              <p>
                <strong>Current live queue position:</strong>{" "}
                {item.queuePosition}
              </p>
            )}
            {item.estimate && (
              <p>
                <strong>Estimated wait:</strong> {item.estimate.minimumMinutes}–
                {item.estimate.maximumMinutes} minutes.{" "}
                {item.estimate.disclaimer}
              </p>
            )}
            {showArrival && <p>{item.arrivalInstructions}</p>}
            {!cancelled && privateLinks[item.reference] && (
              <a
                className="button button-light"
                href={privateLinks[item.reference]}
              >
                Open private appointment link ↗
              </a>
            )}
            {!cancelled && !privateLinks[item.reference] && (
              <button
                type="button"
                className="button button-light"
                disabled={busy}
                onClick={() => replacePrivateLink(item.reference)}
              >
                {busy
                  ? "Creating link…"
                  : "Create a new private appointment link"}
              </button>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <PatientShell>
      <section className="patient-content patient-recovery">
        <div className="eyebrow">PATIENT PORTAL</div>
        <h1>
          {step === "appointments" ? "My appointments" : "My Appointment"}
        </h1>
        {step === "request" && (
          <>
            <p className="patient-intro">
              {feedbackReference
                ? "Verify the mobile number you registered with to leave feedback."
                : "Please enter the mobile number you registered with."}
            </p>
            <form noValidate className="patient-form" onSubmit={requestCode}>
              <label className={fieldErrors.mobile ? "has-field-error" : ""}>
                Mobile number<span className="required-mark"> *</span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={mobile}
                  disabled={busy}
                  aria-invalid={!!fieldErrors.mobile}
                  aria-describedby={fieldErrors.mobile ? "recovery-mobile-error" : undefined}
                  onChange={(event) => updateMobile(event.target.value)}
                  placeholder="+91 98765 43210"
                />
                <FieldError id="recovery-mobile-error">{fieldErrors.mobile}</FieldError>
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-dark form-submit"
                disabled={busy}
              >
                {busy ? "Sending code…" : "Continue"}
              </button>
            </form>
          </>
        )}
        {step === "verify" && (
          <>
            <p className="patient-intro">
              Enter the six-digit code. If you didn’t receive it, check that you
              entered the mobile number you registered with.
            </p>
            <form
              noValidate
              className="patient-form recovery-verification"
              onSubmit={verify}
            >
              <div className={fieldErrors.code ? "has-field-error" : ""}>
                <label htmlFor="recovery-code">Verification code</label>
                <input
                  id="recovery-code"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  aria-invalid={!!fieldErrors.code}
                  onChange={(event) => updateCode(event.target.value)}
                />
                <FieldError>{fieldErrors.code}</FieldError>
              </div>
              {developmentCode && (
                <p className="dev-code">
                  Local development simulator code:{" "}
                  <strong>{developmentCode}</strong>
                </p>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-dark form-submit"
                disabled={busy}
              >
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
              <div className="recovery-code-actions">
                <button
                  type="button"
                  className="text-button"
                  disabled={busy || cooldown > 0}
                  onClick={resend}
                >
                  {cooldown
                    ? t("Resend code in {seconds}s").replace(
                        "{seconds}",
                        new Intl.NumberFormat(locale).format(cooldown),
                      )
                    : "Resend code"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setStep("request");
                    setError("");
                    setCode("");
                  }}
                >
                  Change mobile number
                </button>
              </div>
            </form>
          </>
        )}
        {step === "appointments" && (
          <>
            <p className="patient-intro">
              View upcoming appointments and recent visits.
            </p>
            {feedbackLinkError && (
              <p className="form-error" role="alert">
                This feedback link could not be opened. You can still view your appointments here.
              </p>
            )}
            {loadingAppointments ? (
              <p className="muted" role="status">
                Loading your appointments…
              </p>
            ) : appointments.length === 0 ? (
              <div className="patient-empty">
                <h2>No appointments found</h2>
                <p>
                  There are no upcoming or recent appointments for this number.
                  You can book a visit or check the mobile number.
                </p>
                <Link className="button button-dark" to="/clinics">
                  Book an appointment
                </Link>
              </div>
            ) : (
              <>
                <h2 className="appointment-section-title">
                  Upcoming and active
                </h2>
                {activeAppointments.length ? (
                  <div className="clinic-results">
                    {activeAppointments.map(appointmentCard)}
                  </div>
                ) : (
                  <div className="patient-empty appointment-empty">
                    <p>No upcoming or active visits.</p>
                    <Link className="button button-light" to="/clinics">
                      Book an appointment
                    </Link>
                  </div>
                )}
                {pastAppointments.length > 0 && (
                  <>
                    <h2 className="appointment-section-title">
                      Recent and past visits
                    </h2>
                    <div className="clinic-results">
                      {pastAppointments.map(appointmentCard)}
                    </div>
                  </>
                )}
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
        <div className="recovery-footer">
          <Link className="patient-home-link" to="/">
            Return to QueueLess home
          </Link>
        </div>
      </section>
    </PatientShell>
  );
}
