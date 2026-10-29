import test from "node:test";
import assert from "node:assert/strict";
import { AppDataSource } from "../src/config/data-source.js";
import { createNotificationSimulation } from "../src/controller/notification.controller.js";
import { dispatchNotification, simulateNotification } from "../src/services/notifications/dispatch.js";
import { sendSimulatedMessage } from "../src/services/notifications/providers/simulator.js";

function responseStub() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function mockNotificationRepository(t) {
  const writes = [];
  const repository = {
    create: (values) => ({ ...values }),
    save: async (record) => { writes.push({ ...record }); return record; },
    findOneBy: async () => null,
  };
  t.mock.method(AppDataSource, "getRepository", () => repository);
  return writes;
}

function setSimulatorEnvironment(t, { mode = "whatsapp", forcedFailure = undefined, nodeEnv = "test" } = {}) {
  const previous = { provider: process.env.NOTIFICATION_PROVIDER, forcedFailure: process.env.SIMULATOR_FORCE_FAILURE, nodeEnv: process.env.NODE_ENV };
  process.env.NOTIFICATION_PROVIDER = mode;
  process.env.NODE_ENV = nodeEnv;
  if (forcedFailure === undefined) delete process.env.SIMULATOR_FORCE_FAILURE;
  else process.env.SIMULATOR_FORCE_FAILURE = forcedFailure;
  t.after(() => {
    if (previous.provider === undefined) delete process.env.NOTIFICATION_PROVIDER; else process.env.NOTIFICATION_PROVIDER = previous.provider;
    if (previous.forcedFailure === undefined) delete process.env.SIMULATOR_FORCE_FAILURE; else process.env.SIMULATOR_FORCE_FAILURE = previous.forcedFailure;
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.nodeEnv;
  });
}

test("simulator success returns an authenticated API success and records simulated, not delivered", async (t) => {
  setSimulatorEnvironment(t);
  const writes = mockNotificationRepository(t);
  const res = responseStub();
  await createNotificationSimulation({ auth: { clinicId: "clinic-test", sub: "actor-test" }, body: { outcome: "success" } }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.notification.channel, "simulator");
  assert.equal(res.body.notification.deliveryStatus, "simulated");
  assert.equal(res.body.notification.simulationMode, true);
  assert.equal(res.body.notification.realMessageSent, false);
  assert.match(res.body.notification.providerReference, /^sim_/);
  assert.equal(res.body.notification.deliveredAt, undefined);
  assert.ok(writes.some((record) => record.deliveryStatus === "simulated"));
});

test("simulator failure returns an API error, records failure, and never claims success", async (t) => {
  setSimulatorEnvironment(t);
  const writes = mockNotificationRepository(t);
  const res = responseStub();
  await createNotificationSimulation({ auth: { clinicId: "clinic-test", sub: "actor-test" }, body: { outcome: "failure" } }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /simulator failed/i);
  assert.equal(res.body.notification.channel, "simulator");
  assert.equal(res.body.notification.deliveryStatus, "failed");
  assert.equal(res.body.notification.failureReason, "The development simulator failed to deliver the test message.");
  assert.ok(writes.some((record) => record.deliveryStatus === "failed"));
  assert.ok(!writes.some((record) => record.deliveryStatus === "simulated"));
});

test("provider exception is recorded as a safe failure without a real provider call", async (t) => {
  setSimulatorEnvironment(t, { forcedFailure: "false" });
  const writes = mockNotificationRepository(t);
  let externalCalls = 0;
  const record = await dispatchNotification({ clinicId: "clinic-test", type: "simulator_preview", idempotencyKey: "simulator-timeout-test", templateName: "test", forceSimulator: true }, {
    sendSimulator: async () => { const error = new Error("provider timeout with sensitive detail"); error.name = "AbortError"; throw error; },
    sendWhatsApp: async () => { externalCalls += 1; throw new Error("Must not call external provider"); },
  });

  assert.equal(externalCalls, 0);
  assert.equal(record.deliveryStatus, "failed");
  assert.equal(record.failureReason, "The development simulator failed to deliver the test message.");
  assert.ok(!record.failureReason.includes("sensitive detail"));
  assert.ok(writes.some((item) => item.deliveryStatus === "failed"));
});

test("OTP-style values are sent to the simulator but redacted from persisted notification payloads", async (t) => {
  setSimulatorEnvironment(t, { mode: "whatsapp", forcedFailure: "false" });
  const writes = mockNotificationRepository(t);
  let simulatorVariables;
  let externalCalls = 0;
  const record = await dispatchNotification({ clinicId: "clinic-test", type: "otp_recovery", idempotencyKey: "otp-redaction-test", templateName: "otp-test", variables: ["654321"], recordVariables: ["[REDACTED]"], forceSimulator: true }, {
    sendSimulator: async ({ variables }) => { simulatorVariables = variables; return { providerReference: "sim_test" }; },
    sendWhatsApp: async () => { externalCalls += 1; throw new Error("Must not call external provider"); },
  });

  assert.deepEqual(simulatorVariables, ["654321"]);
  assert.equal(record.deliveryStatus, "simulated");
  assert.deepEqual(record.payload.variables, ["[REDACTED]"]);
  assert.equal(externalCalls, 0);
  assert.ok(writes.some((item) => JSON.stringify(item.payload).includes("[REDACTED]")));
});

test("force-failure environment switch is deterministic and simulation is disabled in production", async (t) => {
  setSimulatorEnvironment(t, { mode: "simulator", forcedFailure: "true" });
  await assert.rejects(sendSimulatedMessage({ templateName: "test", variables: [] }), /forced a delivery failure/);
  process.env.NODE_ENV = "production";
  await assert.rejects(sendSimulatedMessage({ templateName: "test", variables: [] }), /disabled in production/);
  await assert.rejects(simulateNotification({ clinicId: "clinic-test", actorId: "actor-test", outcome: "success" }), (error) => error.status === 404);
});

test("production without an explicitly configured provider records failure and sends nothing", async (t) => {
  setSimulatorEnvironment(t, { mode: undefined, nodeEnv: "production" });
  delete process.env.NOTIFICATION_PROVIDER;
  const writes = mockNotificationRepository(t);
  let externalCalls = 0;
  const record = await dispatchNotification({ clinicId: "clinic-test", type: "turn_approaching", idempotencyKey: "production-disabled-test", templateName: "test" }, {
    sendSimulator: async () => { externalCalls += 1; throw new Error("Must not call simulator"); },
    sendWhatsApp: async () => { externalCalls += 1; throw new Error("Must not call WhatsApp"); },
  });

  assert.equal(record.channel, "disabled");
  assert.equal(record.deliveryStatus, "failed");
  assert.equal(record.failureReason, "Message delivery failed.");
  assert.equal(externalCalls, 0);
  assert.ok(writes.some((item) => item.deliveryStatus === "failed"));
});

