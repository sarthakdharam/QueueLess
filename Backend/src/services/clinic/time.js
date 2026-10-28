export function clinicToday(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function clockInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

function weekdayInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date).toLowerCase();
}

export function clinicIsOpen(settings, now = new Date()) {
  const timeZone = settings.clinic?.timeZone || "Asia/Kolkata";
  const today = settings.workingHours?.[weekdayInZone(now, timeZone)];
  if (!today?.enabled) return false;
  const time = clockInZone(now, timeZone);
  if (time < today.open || time >= today.close) return false;
  return !(settings.breaks || []).some((item) => item.start && item.end && time >= item.start && time < item.end);
}
