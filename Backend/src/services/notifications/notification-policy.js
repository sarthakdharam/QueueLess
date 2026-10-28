export function approachingPatients(queue, threshold) {
  return queue.slice(0, Math.max(0, threshold)).map((patient, index) => ({ ...patient, position: index + 1 })).filter((patient) => patient.consent_to_contact);
}
