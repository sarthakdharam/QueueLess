import assert from "node:assert/strict";
import test from "node:test";
import { mockInboxEnabled } from "../src/services/notifications/dispatch.js";
import { renderMockMessage } from "../src/services/notifications/mock-templates.js";
import { estimateQueueWait } from "../src/services/queue/wait-estimate.js";

test("mock inbox requires development mode, opt-in, and the simulator provider", () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    DEV_MOCK_INBOX: process.env.DEV_MOCK_INBOX,
    NOTIFICATION_PROVIDER: process.env.NOTIFICATION_PROVIDER,
  };
  try {
    Object.assign(process.env, {
      NODE_ENV: "development",
      DEV_MOCK_INBOX: "true",
      NOTIFICATION_PROVIDER: "simulator",
    });
    assert.equal(mockInboxEnabled(), true);
    process.env.DEV_MOCK_INBOX = "false";
    assert.equal(mockInboxEnabled(), false);
    process.env.DEV_MOCK_INBOX = "true";
    process.env.NOTIFICATION_PROVIDER = "whatsapp";
    assert.equal(mockInboxEnabled(), false);
    process.env.NOTIFICATION_PROVIDER = "simulator";
    process.env.NODE_ENV = "production";
    assert.equal(mockInboxEnabled(), false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("check-in preview includes zero patients ahead and the queue wait estimate", () => {
  const now = Date.parse("2026-11-23T10:00:00Z");
  const estimate = estimateQueueWait({
    patientsAhead: 0,
    slotMinutes: 15,
    consultationStartedAt: "2026-11-23T09:55:00Z",
    scheduledAt: "2026-11-23T10:12:00Z",
    now,
  });
  assert.deepEqual(estimate, { minimumMinutes: 12, maximumMinutes: 37 });
  assert.match(renderMockMessage("patient_checked_in", { ahead: 0, estimate }), /Patients ahead: 0/);
  assert.match(renderMockMessage("patient_checked_in", { ahead: 0, estimate }), /Estimated wait: 12–37 minutes/);
});

test("mock previews use queue milestones and never include verification codes", () => {
  assert.match(renderMockMessage("queue_progress", { token: 7, ahead: 5 }), /ahead: 5/);
  assert.match(renderMockMessage("turn_approaching", { ahead: 3 }), /3 patients ahead/);
  assert.match(renderMockMessage("turn_approaching", { ahead: 1 }), /one patient ahead/);
  assert.doesNotMatch(renderMockMessage("otp_recovery", {}, ["123456"]), /123456/);
  assert.match(renderMockMessage("mock_otp"), /Sample verification code: 000000/);
  assert.match(renderMockMessage("mock_otp"), /cannot verify an appointment/);
});
