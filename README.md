# QueueLess native development (Ubuntu 24.04)

QueueLess runs directly on Ubuntu: PostgreSQL stores application data, Express serves the API, and Vite serves the React frontend. No Docker or Compose is required.

## Prerequisites

- Ubuntu 24.04
- Node.js 24 and npm
- PostgreSQL and pgAdmin 4

Install PostgreSQL if needed:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

Use Node.js 24 for this project. Check the installed versions with `node --version` and `npm --version`; if you use nvm, install/select Node 24 with `nvm install 24` and `nvm use 24`.

## PostgreSQL and environment

Start the local PostgreSQL service and check that it is listening on the usual port:

```bash
sudo systemctl start postgresql
pg_isready -h localhost -p 5432
```

Use the existing `queueless` database and PostgreSQL role you manage in pgAdmin 4. This project does not create databases automatically. If the database or role does not exist yet, create/configure it in pgAdmin before starting the backend.

From the project root, create `.env` from the safe template only if you do not already have a local file:

```bash
test -f .env || cp .env.example .env
```

Set `DB_HOST`, `DB_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in `.env` to your local PostgreSQL connection details. The defaults for native development are `localhost` and `5432`. Keep `.env` private; it is excluded by `.gitignore`. `.env.example` contains placeholders only.

The backend resolves the root `.env` relative to its own source file, so it loads the same settings regardless of the directory used to launch it.

## Install dependencies

Open a terminal in the project root and install backend dependencies:

```bash
cd Backend
npm ci
```

Open a second terminal in the project root and install frontend dependencies:

```bash
cd Frontend
npm ci
```

## Start the application

Run the backend and frontend in separate terminals. In the backend terminal:

```bash
cd ~/Desktop/QueueLess/Backend
npm run dev
```

After the backend reports a successful PostgreSQL connection, open the frontend terminal:

```bash
cd ~/Desktop/QueueLess/Frontend
npm run dev
```

Open the frontend at <http://localhost:5173>. The backend health endpoint is <http://localhost:3000/api/health>. Frontend requests to `/api` are proxied by Vite to `http://127.0.0.1:3000`, so browser requests can use relative paths without adding a separate CORS package.

Stop each development server with `Ctrl+C` in its own terminal. PostgreSQL can remain running; stop it separately only if needed with `sudo systemctl stop postgresql`.

## Checks

From `Backend/`, check the configured database connection with:

```bash
node src/config/test-connection.js
```

From `Frontend/`, run the available frontend checks:

```bash
npm run lint
npm run build
```

## Phase 1: clinic accounts

Before starting the backend, set `JWT_SECRET` in the root `.env` to a random secret of at least 32 characters. Apply the initial database migration from `Backend/`:

```bash
npm run migration:run
```

The migration creates clinics, clinic administrator accounts, and trial subscriptions. The API is versioned under `/api/v1`:

- `POST /api/v1/auth/register` creates a clinic, its administrator, and a one-month trial in one transaction. The request includes `clinicName`, `address`, `city`, `state`, `contactNumber`, `email`, `adminName`, `password`, and `acceptedTerms: true`.
- `POST /api/v1/auth/login` accepts `email` and `password` and returns a 12-hour bearer token.
- `GET /api/v1/auth/me` returns the authenticated user's clinic profile. Send `Authorization: Bearer <token>`.

The initial React landing page links to clinic registration and login. Patient discovery and online appointments are planned for a later phase.

## Phase 2: clinic operations

Apply pending migrations from `Backend/`. This command applies both the Phase 1 foundation and the Phase 2 clinic operations migration on a fresh database:

```bash
npm run migration:run
```

Phase 2 adds clinic setup, doctor configuration, working hours and breaks, walk-in registration, a receptionist queue dashboard, and audited queue actions. The clinic dashboard refreshes from PostgreSQL every 20 seconds; Socket.IO live updates are planned for Phase 5.

Authenticated clinic endpoints use the bearer token returned by login or registration:

- `GET /api/v1/clinic/setup` loads the clinic, working-hour settings, doctor list, and setup completion status.
- `PUT /api/v1/clinic/profile` updates clinic contact and profile fields.
- `PUT /api/v1/clinic/settings` saves weekly hours, breaks, slot length, appointment capacity, and queue preferences.
- `GET|POST /api/v1/clinic/doctors`, `PUT|DELETE /api/v1/clinic/doctors/:doctorId` manage clinic doctors.
- `GET /api/v1/clinic/dashboard` returns the day's queue and registration counts.
- `POST /api/v1/clinic/walk-ins` registers a walk-in. Registration is rejected while walk-ins are disabled or outside configured operating hours.
- `POST /api/v1/clinic/queue/call-next` calls the next waiting patient through the backend queue service.
- `POST /api/v1/clinic/queue/:queueId/{call|start|complete|miss|cancel}` applies an allowed status transition and writes an audit record.

Queue tokens are unique per clinic, doctor and local clinic date. Queue-changing operations are transactional. The first implementation supports a single active consultation per doctor queue and provides staff controls for calling, starting, completing, missing, or cancelling a visit.

## Troubleshooting

- **Connection refused:** Check PostgreSQL status with `pg_isready -h localhost -p 5432` and start the service if needed.
- **Password authentication failed:** Confirm the database role and password in pgAdmin match the private `.env` values.
- **Database does not exist:** Confirm the existing database is named `queueless`; this application will not create it.
- **Port already in use:** Check whether PostgreSQL (5432), backend (3000), or Vite (5173) is already using its port.
- **Frontend API request fails:** Keep the backend running at `127.0.0.1:3000`; Vite forwards `/api` requests to it.
