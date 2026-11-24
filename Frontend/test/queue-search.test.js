import assert from "node:assert/strict";
import test from "node:test";
import { filterQueue } from "../src/utils/queue-search.js";

const lastPatient = {
  patient_name: "Asha Patil",
  patient_mobile: "+91 98765-43210",
  reference: "QL00000000000050",
  token_number: 50,
  queue_status: "registered",
};

test("queue searches later pages by name, formatted number, token, or reference", () => {
  const queue = [
    ...Array.from({ length: 49 }, (_, index) => ({ token_number: index + 1 })),
    lastPatient,
  ];
  for (const query of ["  PATIL ", "98765 43210", "a050", "50", "ql00000000000050"]) {
    assert.deepEqual(filterQueue(queue, query, false).slice(0, 10), [lastPatient]);
  }
  assert.deepEqual(filterQueue(queue, "A51", false), []);
});

test("awaiting check-in updates when the matching patient's status changes", () => {
  const waiting = { ...lastPatient, queue_status: "waiting", position: 3 };
  assert.deepEqual(filterQueue([lastPatient], "asha", true), [lastPatient]);
  assert.deepEqual(filterQueue([waiting], "asha", true), []);
  assert.deepEqual(filterQueue([waiting], "asha", false), [waiting]);
});
