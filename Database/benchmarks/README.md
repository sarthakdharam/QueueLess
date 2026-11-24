# QueueLess clinic load benchmark

Run from the repository root with the local backend dependencies and PostgreSQL available.

```powershell
$env:QL_BENCH_ADMIN_PASSWORD_FILE = 'Database/.local-postgres/admin-password.txt'
$env:QL_BENCH_REPORT = 'Database/.local-postgres/benchmark-results.jsonl'
node Database/benchmarks/clinic-load.mjs
```

The runner uses the connection from the backend configuration and accepts only a loopback PostgreSQL host. If the configured PostgreSQL role can create databases, omit `QL_BENCH_ADMIN_PASSWORD_FILE`. The runner creates a random benchmark database owned by the application role and drops that database during cleanup. The normal application database only serves as the connection used to issue the create and drop commands.

The default fixture contains 50 clinics, 36,400 synthetic patients per clinic, and just over 10 million rows across patients, registrations, queue entries, appointments, and notifications. Set `QL_BENCH_PATIENTS_PER_CLINIC=400` for a smaller verification run, or `200000` for 10 million patients plus their related rows.

Loading and API traffic happen in separate phases. The runner writes committed batch progress, verified row counts, and request counts, error counts, throughput and latency by concurrency tier to the JSON Lines report. Latency percentiles cover successful responses; refer to the error counts alongside them. Concurrency is the number of simultaneous API requests from the local runner. This is a read workload, with separate functional checks for clinic isolation and emergency slot blocking.

By default the runner tests 200 and 300 concurrent requests, each in a fresh API process and database connection pool. Set `QL_BENCH_TIERS` to a comma-separated list to run other tiers. The worker exits after each tier so timed-out requests cannot leave pending work in the next tier.

Workers start 2 ms apart by default to reach sustained concurrency without opening every TCP connection at once. Set `QL_BENCH_START_INTERVAL_MS=0` to test a cold connection burst.

Each tier also measures one real check-in for a synthetic patient during the read workload. Check-in latency and status are reported separately from the read results.
