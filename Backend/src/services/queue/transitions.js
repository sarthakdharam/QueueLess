const TRANSITIONS = {
  "check-in": { from: ["registered"], to: "waiting", queueTo: "waiting", action: "patient_checked_in" },
  call: { from: ["waiting"], to: "called", queueTo: "called", action: "patient_called" },
  start: { from: ["called"], to: "in_consultation", queueTo: "in_consultation", action: "consultation_started" },
  complete: { from: ["in_consultation"], to: "completed", queueTo: "completed", action: "consultation_completed" },
  miss: { from: ["called"], to: "missed", queueTo: "missed", action: "patient_missed" },
  return: { from: ["missed"], to: "waiting", queueTo: "waiting", action: "patient_returned_to_queue" },
  cancel: { from: ["waiting", "called"], to: "cancelled", queueTo: "cancelled", action: "registration_cancelled" },
};

export function transitionFor(action, status) {
  const transition = TRANSITIONS[action];
  return transition?.from.includes(status) ? transition : null;
}
