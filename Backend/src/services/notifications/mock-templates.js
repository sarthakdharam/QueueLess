export const mockNotificationTypes = {
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

export function renderMockMessage(type, context = {}, variables = []) {
  const { name = "there", clinic = "the clinic", doctor = "Any available doctor", token, ahead } = context;
  const hello = `Hello ${name}!`;
  const wait = context.estimate
    ? `\nEstimated wait: ${context.estimate.minimumMinutes}–${context.estimate.maximumMinutes} minutes. This may change.`
    : "";
  switch (type) {
    case "registration_confirmation":
      return `${hello}\n\nYour registration is confirmed.\nClinic: ${clinic}\nDoctor: ${doctor}\nToken: ${token ?? "Pending"}\n${ahead != null ? `Patients ahead: ${ahead}` : context.queue_status === "waiting" ? "You are checked in." : "Queue position appears after check-in."}`;
    case "otp_recovery":
      return "A recovery code was requested. Verification codes are hidden in this inbox.";
    case "mock_otp":
      return "Sample verification code: 000000\n\nThis is a development simulation. It cannot verify an appointment.";
    case "queue_progress":
      return `${hello}\n\nToken: ${token ?? "Pending"}. Patients ahead: ${ahead ?? 5}.${wait}\nWe’ll let you know when your turn approaches.`;
    case "patient_checked_in":
      return `${hello}\n\nYou are checked in.\nToken: ${token ?? "Pending"}.\n${ahead == null ? "Please wait for the clinic to resume your queue." : `Patients ahead: ${ahead}.`}${wait}\nWe’ll let you know when you’re called.`;
    case "turn_approaching": {
      const count = ahead ?? (Number(variables[1]) || 3);
      return `${hello}\n\n${count === 1 ? "You are almost next. There is one patient ahead." : `Your turn is approaching. There are ${count} patients ahead.`} Please be ready.${wait}`;
    }
    case "your_turn":
      return `${hello}\n\nIt’s your turn. Please proceed to the doctor’s room at ${clinic}.`;
    case "doctor_emergency_delay":
      return `Important update: ${doctor} is unavailable. Your appointment may be delayed.`;
    case "doctor_emergency_reschedule":
      return `Important update: ${doctor} is unavailable. Open your appointment page to choose a new time.`;
    case "reschedule_confirmation": {
      const schedule = variables[1] && variables[2]
        ? `\nNew date: ${variables[1]}\nNew time: ${variables[2]}`
        : context.scheduledAt
          ? `\nNew time: ${new Date(context.scheduledAt).toLocaleString("en-IN", {
              timeZone: context.timeZone || "Asia/Kolkata",
              dateStyle: "medium",
              timeStyle: "short",
            })}`
          : "";
      return `${hello}\n\nYour appointment has been rescheduled.${schedule}\nContact the clinic if you need help.`;
    }
    case "appointment_hours_reschedule":
      return "Clinic hours changed. Open your appointment page to choose a new time.";
    case "missed_appointment_reschedule":
      return "Your appointment was marked missed. Open your appointment page to choose a new time.";
    case "appointment_cancellation":
      return "Your appointment has been cancelled.";
    case "visit_completed":
      return `${hello}\n\nYour visit is complete. Tell us how it went by opening My Appointment and verifying your mobile number.`;
    default:
      return "QueueLess simulated test message.";
  }
}
