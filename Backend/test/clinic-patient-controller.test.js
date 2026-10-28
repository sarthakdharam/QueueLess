import test from "node:test";
import assert from "node:assert/strict";
import { AppDataSource } from "../src/config/data-source.js";
import { Clinic } from "../src/entities/Clinic.js";
import { QueueEntry } from "../src/entities/QueueEntry.js";
import { getPatientHistory, getTodaysPatients } from "../src/controller/clinic-patients.controller.js";

class QueryStub {
  constructor(state = {}) { this.state = state; this.state.conditions ||= []; }
  innerJoin(...args) { this.state.joins ||= []; this.state.joins.push(args); return this; }
  leftJoin(...args) { if (typeof args[0] === "function") args[0](new QueryStub()); return this; }
  where(sql, params) { this.state.conditions.push([sql, params]); return this; }
  andWhere(sql, params) { this.state.conditions.push([sql, params]); return this; }
  setParameter(key, value) { (this.state.parameters ||= {})[key] = value; return this; }
  select() { return this; }
  addSelect() { return this; }
  orderBy() { return this; }
  addOrderBy() { return this; }
  offset(value) { this.state.offset = value; return this; }
  limit(value) { this.state.limit = value; return this; }
  distinctOn() { return this; }
  from() { return this; }
  clone() { return this; }
  async getCount() { return this.state.total ?? 0; }
  async getRawMany() { return this.state.rows || []; }
}

function setupSource(t, rows = [], total = 0) {
  const clinicLookup = [];
  const query = new QueryStub({ rows, total });
  t.mock.method(AppDataSource, "getRepository", (entity) => {
    if (entity === Clinic) return { findOneBy: async (criteria) => { clinicLookup.push(criteria); return { timeZone: "Asia/Kolkata" }; } };
    if (entity === QueueEntry) return { createQueryBuilder: () => query };
    throw new Error("Unexpected repository in controller test.");
  });
  return { clinicLookup, query };
}

const responseStub = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("today's patients scopes the query to the authenticated clinic and clinic-local date", async (t) => {
  const { clinicLookup, query } = setupSource(t, [{ session_id: "session-1", queue_status: "waiting", checked_in_at: null }]);
  const res = responseStub();
  await getTodaysPatients({ auth: { clinicId: "authorized-clinic" }, query: {} }, res, (error) => { throw error; });
  assert.deepEqual(clinicLookup, [{ id: "authorized-clinic" }]);
  assert.ok(query.state.conditions.some(([sql, params]) => sql === "r.clinic_id = :clinicId" && params.clinicId === "authorized-clinic"));
  assert.ok(query.state.conditions.some(([sql, params]) => sql === "s.session_date = :day" && params.day === res.body.date));
  assert.equal(res.body.patients[0].position, 1);
  assert.equal(res.body.patients[0].arrival_status, "Not arrived");
});

test("history applies search, date and status filters and paginates", async (t) => {
  const { query } = setupSource(t, [], 51);
  const res = responseStub();
  await getPatientHistory({ auth: { clinicId: "clinic-a" }, query: { q: "Ravi", status: "completed", from: "2026-09-01", to: "2026-10-01", page: "2", limit: "25" } }, res, (error) => { throw error; });
  assert.ok(query.state.conditions.some(([sql, params]) => sql === "r.clinic_id = :clinicId" && params.clinicId === "clinic-a"));
  assert.ok(query.state.conditions.some(([sql, params]) => sql.includes(">= :fromDate") && params.fromDate === "2026-09-01"));
  assert.ok(query.state.conditions.some(([sql, params]) => sql.includes("<= :toDate") && params.toDate === "2026-10-01"));
  assert.ok(query.state.conditions.some(([sql, params]) => sql.includes("ILIKE") && params.search === "%Ravi%"));
  assert.equal(query.state.offset, 25);
  assert.equal(query.state.limit, 25);
  assert.equal(res.body.total, 51);
  assert.equal(res.body.pages, 3);
});
