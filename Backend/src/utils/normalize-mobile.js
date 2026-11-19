export function normalizeMobile(value) {
  const compact = String(value)
    .trim()
    .replace(/[\s()-]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0"))
    return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return compact.startsWith("+") ? `+${digits}` : digits;
}

export function isValidIndianMobile(value) {
  const input = String(value || "").trim();
  if (!/^\+?[0-9\s()-]+$/.test(input)) return false;

  const digits = input.replace(/\D/g, "");
  const nationalNumber =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(nationalNumber);
}
