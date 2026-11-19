import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Localized, useTranslate } from "../i18n.jsx";
import ClinicLoading from "../components/ClinicLoading.jsx";
import ClinicSidebar from "../components/ClinicSidebar.jsx";

function formatHour(hour, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hour)));
}

export default function ClinicAnalytics() {
  const t = useTranslate();
  const [analytics, setAnalytics] = useState(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const { data } = await api.get("/clinic/analytics", {
          params: { date: date || undefined },
        });
        setAnalytics(data);
        setDate((current) => current || data.date);
        setError("");
      } catch (requestError) {
        setError(
          requestError.response?.data?.error || "Could not load analytics.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!localStorage.getItem("queueless.session"))
    return <Navigate to="/login" replace />;

  const summary = analytics?.summary;
  const locale = navigator.language || "en-IN";
  const busiestHours = analytics?.busiestHours || [];
  const busiestVisitTotal = busiestHours.reduce(
    (total, slot) => total + slot.visits,
    0,
  );
  const chartColors = ["#765ce0", "#da7b98", "#42a0c8"];
  const chartSegments = busiestHours.reduce(
    ({ offset, segments }, slot, index) => {
      const portion = (slot.visits / busiestVisitTotal) * 100;
      return {
        offset: offset + portion,
        segments: [
          ...segments,
          {
            ...slot,
            color: chartColors[index % chartColors.length],
            start: offset,
            end: offset + portion,
          },
        ],
      };
    },
    { offset: 0, segments: [] },
  ).segments;
  const donutBackground = `conic-gradient(${chartSegments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ")})`;
  const metrics = [
    ["Registered", summary?.registrations || 0, "visits booked or added"],
    ["Completed", summary?.completed || 0, "consultations finished"],
    ["Waiting", summary?.waiting || 0, "patients still in queue"],
    ["Missed", summary?.missed || 0, "patients not seen"],
    [
      "Visit rating",
      summary?.averageRating === null || !summary
        ? "—"
        : `${summary.averageRating}/5`,
      summary?.feedbackCount
        ? `${summary.feedbackCount} feedback responses`
        : "no feedback responses yet",
    ],
    [
      "Average wait",
      summary?.averageWaitMinutes === null || !summary
        ? "—"
        : `${summary.averageWaitMinutes} ${t("min")}`,
      "from checked-in completed visits",
    ],
  ];

  return (
    <Localized>
      <main className="portal-shell clinic-analytics-page">
        <ClinicSidebar clinicName={analytics?.clinic?.name || "Clinic"} />
        <section className="portal-main">
          <header className="dashboard-header analytics-header">
            <div>
              <div className="eyebrow">CLINIC INSIGHTS</div>
              <h1>Analytics</h1>
              <p>See how the clinic day is moving and where patients wait.</p>
            </div>
            <div className="analytics-actions">
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <button
                className="button button-dark"
                type="button"
                disabled={refreshing}
                onClick={() => load({ quiet: true })}
              >
                {refreshing ? "Refreshing…" : "Refresh"} ↻
              </button>
            </div>
          </header>
          {error && <p className="portal-alert">{error}</p>}
          {loading ? (
            <ClinicLoading>Loading clinic analytics…</ClinicLoading>
          ) : (
            <>
              <p className="patient-date-note">
                Clinic date: <strong>{analytics.date}</strong>{" "}
                <span>({analytics.clinic.timeZone || "Asia/Kolkata"})</span>
              </p>
              <section
                className="analytics-metrics"
                aria-label="Clinic metrics"
              >
                {metrics.map(([label, value, note]) => (
                  <article key={label} className="analytics-metric">
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{note}</small>
                  </article>
                ))}
              </section>
              <section className="analytics-hours">
                <div>
                  <div className="eyebrow">BUSIEST HOURS</div>
                  <h2>When patients arrive most</h2>
                  <p>Based on appointment times and walk-in registrations.</p>
                </div>
                {busiestHours.length ? (
                  <div className="analytics-donut-chart">
                    <div
                      className="analytics-donut"
                      role="img"
                      aria-label="Distribution of visits across the busiest clinic hours"
                      style={{ "--donut-segments": donutBackground }}
                    >
                      <div>
                        <strong>{busiestVisitTotal}</strong>
                        <span>visits</span>
                      </div>
                    </div>
                    <div className="analytics-chart-legend">
                      {chartSegments.map((segment) => (
                        <div key={segment.hour}>
                          <i style={{ background: segment.color }} />
                          <span>{formatHour(segment.hour, locale)}</span>
                          <b>{segment.visits} visits</b>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="analytics-empty">
                    No visits recorded for this date.
                  </p>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </Localized>
  );
}
