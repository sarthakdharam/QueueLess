export function mobileLookupCandidates(mobile) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return [mobile, digits.slice(2)];
  return [mobile];
}
