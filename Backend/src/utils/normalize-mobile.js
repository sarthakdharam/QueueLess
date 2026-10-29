export function normalizeMobile(value) {
  const compact = String(value).trim().replace(/[\s()-]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return compact.startsWith("+") ? `+${digits}` : digits;
}
