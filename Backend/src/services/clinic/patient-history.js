export const HISTORY_EXCLUDED_TODAY = ["registered", "waiting", "called", "in_consultation"];

export function isHistoricalVisit({ visitDate, today, status }) {
  return visitDate < today || !HISTORY_EXCLUDED_TODAY.includes(status);
}
