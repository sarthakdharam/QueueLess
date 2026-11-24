import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { AppDataSource as db } from "../../Backend/src/config/data-source.js";
import app from "../../Backend/src/app.js";
import { clinicToday } from "../../Backend/src/services/clinic/time.js";
const require=createRequire(new URL("../../Backend/package.json",import.meta.url));
const {Client,escapeIdentifier}=require("pg");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcryptjs");
const {host,port,username,password,database}=db.options;
const adminPasswordFile=process.env.QL_BENCH_ADMIN_PASSWORD_FILE;
const client=new Client({
  host,port,database,
  user:adminPasswordFile ? "postgres" : username,
  password:adminPasswordFile ? readFileSync(adminPasswordFile,"utf8").trim() : password,
});
const workerDatabase=process.env.QL_BENCH_WORKER_DATABASE;
const workerConcurrency=Number(process.env.QL_BENCH_WORKER_CONCURRENCY);
const benchmarkDatabase=workerDatabase || "ql_bench_"+randomUUID().replaceAll("-","");
const tiers=(process.env.QL_BENCH_TIERS || "200,300").split(",").map(Number);
const startIntervalMs=Number(process.env.QL_BENCH_START_INTERVAL_MS ?? 2);
assert.ok(/^ql_bench_[a-f0-9]{32}$/.test(benchmarkDatabase));
assert.ok(tiers.every(tier=>Number.isInteger(tier)&&tier>=1&&tier<=300));
assert.ok(Number.isInteger(startIntervalMs)&&startIntervalMs>=0&&startIntervalMs<=10);
if(workerDatabase) assert.ok(tiers.includes(workerConcurrency));
const reportPath=process.env.QL_BENCH_REPORT || "Database/.local-postgres/benchmark.jsonl";
mkdirSync(dirname(reportPath),{recursive:true});
function report(stage, details) {
  const entry=JSON.stringify({at:new Date().toISOString(),database:benchmarkDatabase,stage,...details});
  appendFileSync(reportPath,entry+"\n");
  console.log(entry);
}
Object.assign(process.env,{NODE_ENV:"development",DEV_MOCK_INBOX:"true",NOTIFICATION_PROVIDER:"simulator",PAYMENT_PROVIDER:"simulator",OTP_DEV_LOG:"false",OTP_DEV_ECHO:"false",JWT_SECRET:randomBytes(32).toString("hex")});
let server,exists=false;
const stopping=new AbortController();
const requestStop=()=>stopping.abort();
process.once("SIGINT",requestStop);
process.once("SIGTERM",requestStop);
const today=clinicToday("Asia/Kolkata");
const tomorrow=new Date(Date.parse(today)+86400000).toISOString().slice(0,10);
const clinicCount=50;
// 36,400 per clinic produces just over 10 million rows across the five main tables.
const visitsPerClinic=Number(process.env.QL_BENCH_PATIENTS_PER_CLINIC || 36400);
const batchSize=20000;
assert.ok(Number.isInteger(visitsPerClinic) && visitsPerClinic>=200 && visitsPerClinic<=200000);
const historicalVisits=visitsPerClinic-200;
const days=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const hours=Object.fromEntries(days.map(day=>[day,{enabled:true,open:"00:00",close:"23:59"}]));
try{
  assert.ok(["127.0.0.1","localhost","::1"].includes(host));
  if(!workerDatabase){
    await client.connect();
    await client.query(`CREATE DATABASE ${escapeIdentifier(benchmarkDatabase)} OWNER ${escapeIdentifier(username)}`);
    exists=true;
  }
  db.setOptions({database:benchmarkDatabase,extra:{application_name:"queueless_benchmark"}});
  await db.initialize();
  assert.equal((await db.query("SELECT current_database() AS name"))[0].name,benchmarkDatabase);
  if(!workerDatabase){
  await db.runMigrations();
  report("start",{clinicCount,visitsPerClinic});
  const seedStart=performance.now();
  const passwordHash=await bcrypt.hash("Synthetic-Load-Only9!",12);
  await db.transaction(async m=>{
    await m.query(`CREATE TABLE scale_clinics (num int PRIMARY KEY, clinic_id uuid NOT NULL, doctor_id uuid NOT NULL, user_id uuid NOT NULL)`);
    await m.query(`INSERT INTO scale_clinics SELECT n,gen_random_uuid(),gen_random_uuid(),gen_random_uuid() FROM generate_series(1,$1::int) n`,[clinicCount]);
    await m.query(`INSERT INTO clinics (id,name,address,city,state,contact_number,email)
      SELECT clinic_id,'Scale Clinic '||num,'100 Fixture Avenue','Pune','Maharashtra','9000000001','scale'||num||'@example.test' FROM scale_clinics`);
    await m.query(`INSERT INTO clinic_users (id,clinic_id,name,email,password_hash)
      SELECT user_id,clinic_id,'Fixture Administrator','scale'||num||'@example.test',$1 FROM scale_clinics`,[passwordHash]);
    await m.query(`INSERT INTO subscriptions (clinic_id,trial_start,trial_end)
      SELECT clinic_id,now(),now()+interval '30 days' FROM scale_clinics`);
    await m.query(`INSERT INTO clinic_settings (clinic_id,working_hours,slot_duration_minutes,appointment_capacity)
      SELECT clinic_id,$1::jsonb,30,2 FROM scale_clinics`,[JSON.stringify(hours)]);
    await m.query(`INSERT INTO doctors (id,clinic_id,name)
      SELECT doctor_id,clinic_id,'Dr. Scale '||num FROM scale_clinics`);
    await m.query(`INSERT INTO queue_sessions (clinic_id,doctor_id,session_date)
      SELECT clinic_id,doctor_id,$1::date - day FROM scale_clinics CROSS JOIN generate_series(0,$2::int) day`,[today,Math.ceil(historicalVisits/200)]);
  });
  for(let clinic=1;clinic<=clinicCount;clinic++){
    for(let start=1;start<=visitsPerClinic;start+=batchSize){
      stopping.signal.throwIfAborted();
      const end=Math.min(start+batchSize-1,visitsPerClinic);
      await db.transaction(async m=>{
        await m.query(`CREATE TEMP TABLE scale_patients (num int, n int, patient_id uuid, registration_id uuid) ON COMMIT DROP`);
        await m.query(`INSERT INTO scale_patients SELECT num,n,gen_random_uuid(),gen_random_uuid()
          FROM scale_clinics CROSS JOIN generate_series($2::int,$3::int) n WHERE num=$1`,[clinic,start,end]);
        await m.query("ANALYZE scale_patients");
        await m.query(`INSERT INTO patients (id,name,mobile,contact_consent)
          SELECT patient_id,'Synthetic '||num||' Patient '||n,'+91'||(9000000000::bigint+(num-1)*200000+n)::text,true FROM scale_patients`);
        await m.query(`INSERT INTO registrations
          (id,reference,clinic_id,doctor_id,patient_id,visit_type,status,consent_to_contact,created_at,completed_at)
          SELECT registration_id,'QL'||lpad(to_hex((p.num-1)*200000+n),14,'0'),c.clinic_id,c.doctor_id,patient_id,
            CASE WHEN n<=$2::int AND n%2=0 THEN 'appointment' ELSE 'walk_in' END,
            CASE WHEN n<=$2::int THEN 'completed' ELSE 'waiting' END,true,
            ($1::date - CASE WHEN n<=$2::int THEN ((n-1)/200+1) ELSE 0 END)::timestamp+interval '9 hours',
            CASE WHEN n<=$2::int THEN ($1::date-((n-1)/200+1))::timestamp+interval '10 hours' END
          FROM scale_patients p JOIN scale_clinics c ON c.num=p.num`,[today,historicalVisits]);
        await m.query(`INSERT INTO queue_entries (registration_id,session_id,token_number,queue_order,status,created_at,completed_at)
          SELECT r.id,s.id,((CASE WHEN p.n>$1 THEN p.n-$1 ELSE p.n END)-1)%200+1,((((CASE WHEN p.n>$1 THEN p.n-$1 ELSE p.n END)-1)%200)+1)*1000,r.status,r.created_at,r.completed_at
            FROM registrations r JOIN scale_patients p ON p.registration_id=r.id
            JOIN queue_sessions s ON s.clinic_id=r.clinic_id AND s.doctor_id=r.doctor_id AND s.session_date=r.created_at::date`,[historicalVisits]);
        await m.query(`INSERT INTO appointments (registration_id,clinic_id,doctor_id,patient_id,scheduled_at,slot_minutes,status)
          SELECT r.id,r.clinic_id,r.doctor_id,r.patient_id,r.created_at,30,'completed' FROM scale_patients p JOIN registrations r ON r.id=p.registration_id WHERE r.visit_type='appointment'`);
        await m.query(`INSERT INTO notifications (clinic_id,registration_id,channel,type,idempotency_key,delivery_status,message,read_at)
          SELECT r.clinic_id,r.id,channel,'registration_confirmation',channel||':scale:'||r.id::text,
            CASE WHEN channel='clinic' THEN 'recorded' ELSE 'simulated' END,
            CASE WHEN channel='simulator' THEN 'Synthetic registration preview' END,
            CASE WHEN channel='clinic' AND status='completed' THEN now() END
          FROM scale_patients p JOIN registrations r ON r.id=p.registration_id CROSS JOIN (VALUES ('clinic'),('simulator')) kind(channel)`);
      });
      report("batch",{clinic,start,end,seedSeconds:Math.round((performance.now()-seedStart)/1000)});
    }
  }
  await db.query("DROP TABLE scale_clinics");
  await db.query("ANALYZE clinics; ANALYZE patients; ANALYZE registrations; ANALYZE queue_entries; ANALYZE queue_sessions; ANALYZE appointments; ANALYZE notifications");
  const counts=await db.query(`SELECT clinic_id,count(*)::int AS visits,count(DISTINCT patient_id)::int AS patients
      FROM registrations GROUP BY clinic_id`);
  assert.equal(counts.length,clinicCount);
  assert.ok(counts.every(row=>row.visits===visitsPerClinic&&row.patients===visitsPerClinic));
  const [data]=await db.query(`SELECT (SELECT count(*)::int FROM patients) AS patients,
    (SELECT count(*)::int FROM registrations) AS registrations,
    (SELECT count(*)::int FROM queue_entries) AS "queueEntries",
    (SELECT count(*)::int FROM appointments) AS appointments,
    (SELECT count(*)::int FROM notifications) AS notifications,
    (SELECT count(*)::int FROM queue_entries WHERE status='waiting') AS waiting`);
  const mainTableRows=data.patients+data.registrations+data.queueEntries+data.appointments+data.notifications;
  report("data",{clinics:clinicCount,...data,mainTableRows,seedSeconds:+((performance.now()-seedStart)/1000).toFixed(1)});
  }
  const clinics=(await db.query(`SELECT c.id,d.id AS doctor_id,u.id AS actor_id FROM clinics c
      JOIN doctors d ON d.clinic_id=c.id JOIN clinic_users u ON u.clinic_id=c.id ORDER BY c.email`))
      .map(c=>({...c,token:jwt.sign({clinicId:c.id,sub:c.actor_id,role:"administrator"},process.env.JWT_SECRET,{expiresIn:"1h"})}));
  server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  async function get(path,token,{verify=true,method="GET"}={}){
    const headers=token ? {Authorization:"Bearer "+token} : {};
    if(method==="POST") headers["Content-Type"]="application/json";
    const response=await fetch(origin+path,{method,headers,body:method==="POST"?"{}":undefined,signal:AbortSignal.any([stopping.signal,AbortSignal.timeout(20000)])});
    const raw=await response.text();
    if(verify)assert.equal(response.status,200,path);
    return {status:response.status,raw};
  }
  const tasks=[
    ["Dashboard",()=>"/api/v1/clinic/dashboard"],
    ["Today's patients",()=>"/api/v1/clinic/patients/today"],
    ["History",()=>"/api/v1/clinic/patients/history?limit=25&page=1"],
    ["Deep history",()=>"/api/v1/clinic/patients/history?limit=25&page=72"],
    ["History search",()=>"/api/v1/clinic/patients/history?limit=25&q=Patient%20120"],
    ["Analytics",()=>"/api/v1/clinic/analytics"],
    ["Billing",()=>"/api/v1/clinic/billing"],
    ["Clinic inbox",()=>"/api/v1/clinic/notifications?unread=true"],
    ["Unread count",()=>"/api/v1/clinic/notifications/unread-count"],
    ["Mock conversations",()=>"/api/v1/dev/notifications?view=conversations&limit=30"],
    ["Public search",()=>"/api/v1/public/clinics?q=Scale"],
    ["Public slots",c=>"/api/v1/public/clinics/"+c.id+"/slots?date="+tomorrow+"&doctorId="+c.doctor_id],
  ];
  if(!workerDatabase){
  for(const c of clinics){
    const data=JSON.parse((await get("/api/v1/clinic/patients/history?limit=1",c.token)).raw);
    assert.equal(data.total,historicalVisits);
    assert.equal(data.records.length,Math.min(1,historicalVisits));
  }
  const first=clinics[0], second=clinics[1];
  const dashboard=JSON.parse((await get(tasks[0][1](first),first.token)).raw);
  assert.equal(dashboard.summary.waiting,200);
  const todayVisits=JSON.parse((await get("/api/v1/clinic/patients/today",first.token)).raw);
  assert.equal(todayVisits.patients.length,200);
  const todayHistory=JSON.parse((await get(`/api/v1/clinic/patients/history?from=${today}&to=${today}`,first.token)).raw);
  assert.equal(todayHistory.total,0);
  const fixture=JSON.parse((await get("/api/v1/dev/notifications?limit=1",first.token)).raw).messages[0];
  assert.equal((await get("/api/v1/dev/notifications/"+fixture.id,second.token,{verify:false})).status,404);
  const publicSlotPath=tasks.find(([name])=>name==="Public slots")[1];
  const initialSlots=JSON.parse((await get(publicSlotPath(first),first.token)).raw).slots;
  assert.ok(initialSlots.length>=3);
  const blockedSlot=initialSlots[1];
  const blockedEnd=new Date(Date.parse(blockedSlot.startsAt)+30*60000);
  const [{id:eventId}]=await db.query(
    `INSERT INTO doctor_availability_events
      (clinic_id,doctor_id,created_by,mode,starts_at,ends_at)
      VALUES ($1,$2,$3,'temporary',$4,$5) RETURNING id`,
    [first.id,first.doctor_id,first.actor_id,blockedSlot.startsAt,blockedEnd],
  );
  try{
    const actual=JSON.parse((await get(publicSlotPath(first),first.token)).raw).slots;
    assert.deepEqual(actual,initialSlots.filter(slot=>slot.time!==blockedSlot.time));
  }finally{
    await db.query("DELETE FROM doctor_availability_events WHERE id=$1",[eventId]);
  }
  report("checks",{clinicHistories:clinicCount,clinicIsolation:true,emergencySlotOverlap:true});
  }
  const percentile=(values,p)=>values[Math.max(0,Math.ceil(values.length*p)-1)];
  async function run(concurrency,rounds){
    const clinic=clinics[0];
    const checkIn=await db.transaction(async manager=>{
      const [entry]=await manager.query(
        `SELECT q.id,q.registration_id FROM queue_entries q JOIN queue_sessions s ON s.id=q.session_id
         WHERE s.clinic_id=$1 AND s.session_date=$2 AND q.status='waiting'
           AND q.checked_in_at IS NULL LIMIT 1`,
        [clinic.id,today],
      );
      assert.ok(entry,"Expected a synthetic patient to prepare for check-in.");
      await manager.query("UPDATE registrations SET status='registered' WHERE id=$1",[entry.registration_id]);
      await manager.query("UPDATE queue_entries SET status='registered' WHERE id=$1",[entry.id]);
      return entry;
    });
    const total=clinicCount*tasks.length*rounds;
    const jobs=Array.from({length:total},(_,i)=>{
      const [name,fn]=tasks[i%tasks.length];
      const c=clinics[(Math.floor(i/tasks.length)+i%tasks.length*7)%clinics.length];
      return {name,path:fn(c),token:c.token};
    });
    const records=[];
    const started=performance.now();
    const checkInProbe=(async()=>{
      await delay(Math.max(100,concurrency*startIntervalMs),undefined,{signal:stopping.signal});
      const sentAt=performance.now();
      try{
        const {status,raw}=await get(`/api/v1/clinic/queue/${checkIn.id}/check-in`,clinic.token,{verify:false,method:"POST"});
        const payload=JSON.parse(raw);
        return {status,ms:Math.round(performance.now()-sentAt),...(status===200?{}:{error:payload.error})};
      }catch(error){
        return {status:error.cause?.code || error.name,ms:Math.round(performance.now()-sentAt)};
      }
    })();
    let cursor=0;
    let inFlight=0;
    let peakInFlight=0;
    await Promise.all(Array.from({length:concurrency},async(_,index)=>{
      if(startIntervalMs&&index)await delay(index*startIntervalMs,undefined,{signal:stopping.signal});
      while(cursor<jobs.length){
        stopping.signal.throwIfAborted();
        const job=jobs[cursor++], t=performance.now();
        inFlight+=1;
        peakInFlight=Math.max(peakInFlight,inFlight);
        try{
          const {status,raw}=await get(job.path,job.token,{verify:false});
          records.push({name:job.name,status,ms:performance.now()-t,bytes:Buffer.byteLength(raw)});
        }catch(error){
          const status=error.cause?.code || error.name;
          records.push({name:job.name,status,ms:performance.now()-t,bytes:0});
        }finally{
          inFlight-=1;
        }
      }
    }));
    const seconds=(performance.now()-started)/1000;
    const ok=records.filter(r=>r.status===200);
    const ms=ok.map(r=>r.ms).sort((a,b)=>a-b);
    const errors=Object.create(null);
    for(const row of records.filter(r=>r.status!==200))errors[row.status]=(errors[row.status]||0)+1;
    const endpoints=Object.fromEntries(tasks.map(([name])=>{
      const matching=records.filter(r=>r.name===name&&r.status===200);
      const values=matching.map(r=>r.ms).sort((a,b)=>a-b);
      const failures=records.filter(r=>r.name===name&&r.status!==200).reduce((counts,row)=>{counts[row.status]=(counts[row.status]||0)+1;return counts;},{});
      return [name,{p95:values.length ? Math.round(percentile(values,.95)) : null, success:matching.length, failures}];
    }));
    const latency=(p)=>ms.length ? Math.round(percentile(ms,p)) : null;
    report("tier",{
      concurrency,peakInFlight,startIntervalMs,total,success:ok.length,errors,
      rps:+(ok.length/seconds).toFixed(1),
      p50:latency(.5),p95:latency(.95),p99:latency(.99),max:latency(1),
      seconds:+seconds.toFixed(2),endpoints,checkIn:await checkInProbe,
    });
    const health=JSON.parse((await get("/api/health")).raw);
    assert.equal(health.status,"ok");
  }
  if(workerDatabase){
    await run(workerConcurrency,2);
    // A timed-out client can leave SQL running. Exiting this dedicated worker
    // closes all of its database connections before the next worker starts.
    process.exit(0);
  }
  await new Promise(resolve=>server.close(resolve));
  server=undefined;
  await db.destroy();
  for(const concurrency of tiers){
    stopping.signal.throwIfAborted();
    await new Promise((resolve,reject)=>{
      const worker=spawn(process.execPath,[fileURLToPath(import.meta.url)],{
        env:{...process.env,QL_BENCH_WORKER_DATABASE:benchmarkDatabase,QL_BENCH_WORKER_CONCURRENCY:String(concurrency)},
        stdio:"inherit",
        signal:stopping.signal,
      });
      worker.once("error",reject);
      worker.once("close",(code)=>code===0 ? resolve() : reject(new Error(`Tier ${concurrency} exited with code ${code}.`)));
    });
    const {rows}=await client.query(
      "SELECT pg_terminate_backend(pid,5000) AS terminated FROM pg_stat_activity WHERE datname=$1 AND application_name='queueless_benchmark'",
      [benchmarkDatabase],
    );
    assert.ok(rows.every(row=>row.terminated),"Previous tier still has database connections.");
  }
  report("complete",{tiers});
}catch(error){
  report("failed",{name:error.name,message:error.message});
  throw error;
}finally{
  try{
    if(server)await new Promise(resolve=>server.close(resolve));
    if(db.isInitialized)await db.destroy();
    if(exists){
      await client.query(`DROP DATABASE ${escapeIdentifier(benchmarkDatabase)}`);
      report("cleanup",{});
    }
  }finally{
    process.removeListener("SIGINT",requestStop);
    process.removeListener("SIGTERM",requestStop);
    await client.end();
  }
}
