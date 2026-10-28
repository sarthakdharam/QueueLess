export function isValidAppointmentCapacity(value) {
  return typeof value === "number"
    ? Number.isSafeInteger(value) && value >= 1 && value <= 100
    : typeof value === "string" && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100;
}
