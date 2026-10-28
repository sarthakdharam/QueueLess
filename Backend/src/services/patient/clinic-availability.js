import { findPublicClinicDetails } from "../../repositories/clinic.repository.js";
import { countOpenAppointmentsByTime } from "../../repositories/appointment.repository.js";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export const OPEN_STATUSES = ["booked", "confirmed", "checked_in"];

export function dateInZone(date, timeZone) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(date, amount) {
  const day = new Date(`${date}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + amount);
  return day.toISOString().slice(0, 10);
}

export function weekdayForDate(date) { return DAY_NAMES[new Date(`${date}T12:00:00.000Z`).getUTCDay()]; }

export function zonedTimeToUtc(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let result = wanted;
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(result)).map(({ type, value }) => [type, value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    result += wanted - represented;
  }
  return new Date(result);
}

export function clinicHoursForDate(clinic, settings, doctor, date) {
  const day = weekdayForDate(date);
  return doctor?.availability?.workingHours?.[day] || settings.workingHours?.[day] || null;
}

export function isSlotOpen(time, duration, hours, breaks) {
  const [hour, minute] = time.split(":").map(Number);
  const start = hour * 60 + minute;
  const end = start + duration;
  if (end > hoursCloseToMinutes(hours.close)) return false;
  return !(breaks || []).some((pause) => {
    const pauseStart = hoursCloseToMinutes(pause.start);
    const pauseEnd = hoursCloseToMinutes(pause.end);
    return start < pauseEnd && end > pauseStart;
  });
}

export function hoursCloseToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export async function loadPublicClinic(clinicId) {
  return findPublicClinicDetails(clinicId);
}

export async function availableSlots({ clinic, settings, doctor, date }) {
  if (!settings || !doctor || !settings.appointmentCapacity || !settings.slotDurationMinutes) return [];
  const dayHours = clinicHoursForDate(clinic, settings, doctor, date);
  if (!dayHours?.enabled) return [];
  const duration = settings.slotDurationMinutes;
  const open = hoursCloseToMinutes(dayHours.open);
  const close = hoursCloseToMinutes(dayHours.close);
  const clinicToday = dateInZone(new Date(), clinic.timeZone || "Asia/Kolkata");
  const now = Date.now();
  const dayStart = zonedTimeToUtc(date, "00:00", clinic.timeZone || "Asia/Kolkata");
  const dayEnd = zonedTimeToUtc(addDays(date, 1), "00:00", clinic.timeZone || "Asia/Kolkata");
  const booked = await countOpenAppointmentsByTime({ clinicId: clinic.id, doctorId: doctor.id, dayStart, dayEnd, statuses: OPEN_STATUSES });
  const counts = new Map(booked.map((row) => [new Date(row.scheduled_at).toISOString(), Number(row.count)]));
  const slots = [];
  for (let start = open; start + duration <= close; start += duration) {
    const hhmm = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
    if (!isSlotOpen(hhmm, duration, dayHours, settings.breaks)) continue;
    const startsAt = zonedTimeToUtc(date, hhmm, clinic.timeZone || "Asia/Kolkata");
    if (date === clinicToday && startsAt.getTime() <= now) continue;
    const bookedCount = counts.get(startsAt.toISOString()) || 0;
    if (bookedCount >= settings.appointmentCapacity) continue;
    slots.push({ time: hhmm, startsAt: startsAt.toISOString(), remaining: settings.appointmentCapacity - bookedCount });
  }
  return slots;
}


