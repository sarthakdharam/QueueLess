import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../src/api/client.js";

function useSession(t, adapter) {
  const key = "queueless.session";
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const session = new Map([[key, "expired-clinic-token"]]);
  const originalAdapter = api.defaults.adapter;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => session.set(key, value),
      removeItem: (key) => session.delete(key),
    },
  });
  api.defaults.adapter = adapter;
  t.after(() => {
    api.defaults.adapter = originalAdapter;
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });
  return () => session.get(key);
}

function failure(config, status) {
  return Object.assign(new Error(`HTTP ${status}`), {
    config,
    response: { status },
  });
}

test("concurrent clinic requests share one refresh and retry with the replacement token", async (t) => {
  const paths = [];
  const session = useSession(t, async (config) => {
    paths.push(config.url);
    if (config.url === "/auth/refresh")
      return { data: { token: "new-clinic-token" }, config };
    if (config.headers.get("Authorization") !== "Bearer new-clinic-token")
      throw failure(config, 401);
    return { data: { ok: true }, config };
  });

  const results = await Promise.all([
    api.get("/clinic/dashboard"),
    api.get("/dev/notifications"),
  ]);
  assert.ok(results.every(({ data }) => data.ok));
  assert.equal(paths.filter((path) => path === "/auth/refresh").length, 1);
  assert.equal(session(), "new-clinic-token");
});

test("patient-link 401 preserves the clinic session and never triggers refresh", async (t) => {
  let requests = 0;
  const session = useSession(t, async (config) => {
    requests++;
    assert.equal(config.url, "/patient/registration");
    assert.equal(config.headers.get("Authorization"), "Bearer private-patient-token");
    throw failure(config, 401);
  });
  await assert.rejects(
    api.get("/patient/registration", {
      headers: { Authorization: "Bearer private-patient-token" },
    }),
    /HTTP 401/,
  );
  assert.equal(requests, 1);
  assert.equal(session(), "expired-clinic-token");
});

test("temporary refresh failure leaves the clinic session available for another attempt", async (t) => {
  const session = useSession(t, async (config) => {
    throw failure(config, config.url === "/auth/refresh" ? 503 : 401);
  });
  await assert.rejects(api.get("/auth/me"), /HTTP 503/);
  assert.equal(session(), "expired-clinic-token");
});
