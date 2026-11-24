import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import test from "node:test";
import { createReportLoadLimiter } from "../src/middleware/limit-report-load.js";

function response() {
  return Object.assign(new EventEmitter(), {
    headers: {},
    set(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.emit("result", body); },
  });
}

test("reports return a retryable response at capacity and resume when work finishes", async () => {
  const wrap = createReportLoadLimiter({ concurrency: 1, maxWaiting: 1, waitMs: 20 });
  const work = Promise.withResolvers();
  const handler = wrap(async ({ hold }, res) => {
    if (hold) await work.promise;
    res.json({ ok: true });
  });
  const next = (error) => { throw error; };
  const active = response();
  const activeResult = once(active, "result");
  handler({ hold: true }, active, next);
  const queued = response();
  handler({}, queued, next);
  const overflow = response();
  const overflowResult = once(overflow, "result");
  handler({}, overflow, next);
  assert.equal(overflow.statusCode, 503);
  assert.equal(overflow.headers["Retry-After"], "2");
  assert.equal((await overflowResult)[0].code, "REPORT_BUSY");
  queued.emit("close");
  const timedOut = response();
  const timeoutResult = once(timedOut, "result");
  handler({}, timedOut, next);
  assert.equal((await timeoutResult)[0].code, "REPORT_BUSY");
  assert.equal(timedOut.statusCode, 503);
  work.resolve();
  await activeResult;
  const recovered = response();
  const recoveredResult = once(recovered, "result");
  handler({}, recovered, next);
  assert.deepEqual((await recoveredResult)[0], { ok: true });
});
