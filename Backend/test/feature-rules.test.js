import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { calculateReturnPlacement } from "../src/services/queue/return-policy.js";
import { normalizeMobile } from "../src/utils/normalize-mobile.js";
import { validDate, zonedTimeToUtc, isSlotOpen } from "../src/services/patient/clinic-availability.js";
import { transitionFor } from "../src/services/queue/transitions.js";
import { hasSubscriptionAccess } from "../src/services/subscriptions/access-policy.js";
import { approachingPatients } from "../src/services/notifications/notification-policy.js";
import { hasValidWebhookSignature } from "../src/utils/webhook-signature.js";
import { otpHash } from "../src/services/patient/otp.js";
import { accessHash } from "../src/services/patient/access-links.js";
import { clinicToday } from "../src/services/clinic/time.js";
import { isHistoricalVisit } from "../src/services/clinic/patient-history.js";
import { isValidAppointmentCapacity } from "../src/utils/queue-preferences.js";
import { createLookupSecret, lookupSecretHash, LOOKUP_SESSION_TTL_MS } from "../src/services/patient/lookup-sessions.js";
import { isCredentialActive, isOtpChallengeUsable } from "../src/services/patient/credential-policy.js";
import { mobileLookupCandidates } from "../src/services/patient/mobile-lookup.js";

test("return policy places a returning patient after the configured number", () => {
  const queue = [1000, 2000, 3000, 4000, 5000, 6000].map((queue_order, index) => ({ id: String(index), queue_order }));
  const result = calculateReturnPlacement(queue, "after_waiting", 5);
  assert.equal(result.patientsAhead, 5);
  assert.equal(result.queueOrder, 5001);
  assert.deepEqual(result.shifted.map(({ id }) => id), ["5"]);
});

test("return policy handles fewer waiting patients and end-of-queue policy", () => {
  const queue = [{ id: "a", queue_order: 1000 }, { id: "b", queue_order: 2000 }];
  assert.equal(calculateReturnPlacement(queue, "after_waiting", 5).patientsAhead, 2);
  assert.equal(calculateReturnPlacement(queue, "at_end", 5).queueOrder, 2001);
  assert.equal(calculateReturnPlacement([], "after_waiting", 5).queueOrder, 0);
});

test("staff override remains bounded by eligible waiting patients", () => {
  const queue = [{ id: "a", queue_order: 1000 }, { id: "b", queue_order: 2000 }];
  const result = calculateReturnPlacement(queue, "at_end", 5, { patientsAhead: 1 });
  assert.equal(result.patientsAhead, 1);
  assert.equal(result.queueOrder, 1001);
  assert.deepEqual(result.shifted.map(({ id }) => id), ["b"]);
});

test("dates must be real calendar days in ISO format", () => {
  assert.equal(validDate("2026-10-28"), true);
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("28-10-2026"), false);
});

test("zoned appointments and breaks are calculated consistently", () => {
  assert.equal(zonedTimeToUtc("2026-10-28", "09:00", "Asia/Kolkata").toISOString(), "2026-10-28T03:30:00.000Z");
  assert.equal(isSlotOpen("10:00", 30, { close: "12:00" }, [{ start: "10:15", end: "10:45" }]), false);
  assert.equal(isSlotOpen("11:00", 30, { close: "12:00" }, []), true);
});

test("mobile normalization removes presentation characters only", () => {
  assert.equal(normalizeMobile("+91 (98765) 43210"), "+919876543210");
});

test("queue transitions enforce the full allowed status flow", () => {
  const flow = [
    ["check-in", "registered", "waiting"], ["call", "waiting", "called"],
    ["start", "called", "in_consultation"], ["complete", "in_consultation", "completed"],
    ["miss", "called", "missed"], ["return", "missed", "waiting"],
    ["cancel", "waiting", "cancelled"], ["cancel", "called", "cancelled"],
  ];
  for (const [action, from, to] of flow) assert.equal(transitionFor(action, from)?.to, to);
});

test("queue transitions reject skips and terminal-state edits", () => {
  assert.equal(transitionFor("complete", "waiting"), null);
  assert.equal(transitionFor("call", "completed"), null);
  assert.equal(transitionFor("return", "called"), null);
  assert.equal(transitionFor("cancel", "completed"), null);
  assert.equal(transitionFor("unknown", "waiting"), null);
});

test("trial and paid access expire on their server-side dates", () => {
  const now = new Date("2026-10-28T00:00:00.000Z");
  assert.equal(hasSubscriptionAccess({ status: "trial", trialEnd: "2026-10-29T00:00:00.000Z" }, now), true);
  assert.equal(hasSubscriptionAccess({ status: "trial", trialEnd: now }, now), false);
  assert.equal(hasSubscriptionAccess({ status: "active", renewalDate: "2026-11-01T00:00:00.000Z" }, now), true);
  assert.equal(hasSubscriptionAccess({ status: "active", renewalDate: "2026-10-01T00:00:00.000Z" }, now), false);
  assert.equal(hasSubscriptionAccess({ status: "cancelled", trialEnd: "2026-11-01T00:00:00.000Z" }, now), false);
  assert.equal(hasSubscriptionAccess(null, now), false);
});

test("turn reminders respect the threshold and require contact consent", () => {
  const queue = [
    { registration_id: "1", consent_to_contact: false },
    { registration_id: "2", consent_to_contact: true },
    { registration_id: "3", consent_to_contact: true },
  ];
  assert.deepEqual(approachingPatients(queue, 2).map(({ registration_id, position }) => [registration_id, position]), [["2", 2]]);
  assert.deepEqual(approachingPatients(queue, 0), []);
});

test("webhook signatures verify raw bytes and reject tampering", () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = createHmac("sha256", "test-secret").update(body).digest("hex");
  assert.equal(hasValidWebhookSignature(body, signature, "test-secret"), true);
  assert.equal(hasValidWebhookSignature(body, `sha256=${signature}`, "test-secret", "sha256="), true);
  assert.equal(hasValidWebhookSignature(Buffer.from("tampered"), signature, "test-secret"), false);
  assert.equal(hasValidWebhookSignature(body, "bad-signature", "test-secret"), false);
  assert.equal(hasValidWebhookSignature(body, signature, ""), false);
});

test("OTP and patient access values are one-way protected", () => {
  assert.notEqual(otpHash("challenge", "123456"), otpHash("challenge", "123457"));
  assert.notEqual(otpHash("challenge-a", "123456"), otpHash("challenge-b", "123456"));
  assert.equal(accessHash("high-entropy-secret").length, 64);
  assert.notEqual(accessHash("first-secret"), accessHash("second-secret"));
  const lookupSecret = createLookupSecret();
  assert.ok(lookupSecret.length >= 40);
  assert.equal(lookupSecretHash(lookupSecret).length, 64);
  assert.notEqual(lookupSecretHash(lookupSecret), lookupSecret);
  assert.equal(LOOKUP_SESSION_TTL_MS, 15 * 60 * 1000);
});

test("private credentials reject expiry and revocation, while OTPs reject reuse and excess attempts", () => {
  const now = Date.parse("2026-10-29T12:00:00.000Z");
  assert.equal(isCredentialActive({ expiresAt: new Date(now + 1000), revokedAt: null }, now), true);
  assert.equal(isCredentialActive({ expiresAt: new Date(now - 1), revokedAt: null }, now), false);
  assert.equal(isCredentialActive({ expiresAt: new Date(now + 1000), revokedAt: new Date(now) }, now), false);
  assert.equal(isOtpChallengeUsable({ expiresAt: new Date(now + 1000), consumedAt: null, attemptCount: 4 }, now), true);
  assert.equal(isOtpChallengeUsable({ expiresAt: new Date(now - 1), consumedAt: null, attemptCount: 0 }, now), false);
  assert.equal(isOtpChallengeUsable({ expiresAt: new Date(now + 1000), consumedAt: new Date(now), attemptCount: 0 }, now), false);
  assert.equal(isOtpChallengeUsable({ expiresAt: new Date(now + 1000), consumedAt: null, attemptCount: 5 }, now), false);
});

test("Indian mobile numbers normalize to one country-code form and match legacy local records", () => {
  assert.equal(normalizeMobile("98765 43210"), "+919876543210");
  assert.equal(normalizeMobile("09876543210"), "+919876543210");
  assert.equal(normalizeMobile("+91 (98765) 43210"), "+919876543210");
  assert.deepEqual(mobileLookupCandidates("+919876543210"), ["+919876543210", "9876543210"]);
});

test("clinic-local date follows the configured timezone rather than UTC midnight", () => {
  const instant = new Date("2026-10-28T01:00:00.000Z");
  assert.equal(clinicToday("Asia/Kolkata", instant), "2026-10-28");
  assert.equal(clinicToday("America/Los_Angeles", instant), "2026-10-27");
});

test("history keeps old records and terminal records while excluding today's active queue", () => {
  const today = "2026-10-28";
  assert.equal(isHistoricalVisit({ visitDate: "2026-10-27", today, status: "waiting" }), true);
  assert.equal(isHistoricalVisit({ visitDate: today, today, status: "waiting" }), false);
  assert.equal(isHistoricalVisit({ visitDate: today, today, status: "completed" }), true);
  assert.equal(isHistoricalVisit({ visitDate: today, today, status: "cancelled" }), true);
});

test("appointments per slot accepts only a positive whole number in the supported range", () => {
  for (const input of [1, 6, "8", "06", 100]) assert.equal(isValidAppointmentCapacity(input), true);
  for (const input of [0, -1, 2.5, "", "-1", "2.5", "101", "abc"]) assert.equal(isValidAppointmentCapacity(input), false);
});
