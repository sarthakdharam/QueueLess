export const RESCHEDULABLE_APPOINTMENT_STATUSES = [
  "booked",
  "needs_rescheduling",
  "missed",
];

export function rescheduleMode(appointment, now = new Date()) {
  if (!appointment) return null;
  if (appointment.status === "missed") return "missed_rebooking";
  if (appointment.status === "needs_rescheduling") return "clinic_recovery";
  if (
    appointment.status === "booked" &&
    new Date(appointment.scheduledAt).getTime() > now.getTime()
  )
    return "patient_change";
  return null;
}
