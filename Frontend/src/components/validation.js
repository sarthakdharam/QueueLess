export const INDIAN_REGIONS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const requiredMessage = (label) => `${label} is required.`;
export const validMobile = (value) => {
  const input = String(value || "").trim();
  if (!/^\+?[0-9\s()-]+$/.test(input)) return false;
  const digits = input.replace(/\D/g, "");
  const nationalNumber =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(nationalNumber);
};

export function validateFields(values, rules) {
  return Object.entries(rules).reduce((errors, [field, checks]) => {
    const value = values[field];
    const check = checks.find((item) => !item.test(value));
    if (check) errors[field] = check.message;
    return errors;
  }, {});
}

export const required = (label) => ({
  test: (value) =>
    typeof value === "string" ? value.trim().length > 0 : Boolean(value),
  message: requiredMessage(label),
});
export const minLength = (length, label) => ({
  test: (value) => String(value || "").trim().length >= length,
  message: `${label} must be at least ${length} characters.`,
});
export const mobileRule = {
  test: validMobile,
  message: "Enter a valid 10-digit Indian mobile number.",
};
export function parseAppointmentCapacity(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 100
    ? parsed
    : null;
}
export function normalizeAppointmentCapacityInput(value) {
  const parsed = parseAppointmentCapacity(value);
  return parsed === null ? value : String(parsed);
}
export const strongPasswordRule = {
  test: (value) =>
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value),
  message:
    "Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character.",
};
