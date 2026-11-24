export function estimateQueueWait({
  patientsAhead,
  slotMinutes,
  consultationStartedAt,
  scheduledAt,
  now = Date.now(),
}) {
  const elapsed = consultationStartedAt
    ? Math.max(0, Math.floor((now - new Date(consultationStartedAt).getTime()) / 60000))
    : 0;
  const activeRemaining = consultationStartedAt ? Math.max(0, slotMinutes - elapsed) : 0;
  const scheduledWait = scheduledAt
    ? Math.max(0, Math.ceil((new Date(scheduledAt).getTime() - now) / 60000))
    : 0;
  const minimumMinutes = Math.max(patientsAhead * slotMinutes + activeRemaining, scheduledWait);
  return { minimumMinutes, maximumMinutes: minimumMinutes + slotMinutes + 10 };
}
