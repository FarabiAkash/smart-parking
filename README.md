# Smart Parking — Monitoring & Alerting

This project is a monitoring and alerting setup for parking devices. You can push telemetry and occupancy events into it, look at dashboards and device status, handle alerts, and pull usage out as CSV.

**Stack:** Backend Django 6 + Django REST Framework, frontend Next.js 16 (React). Database: SQLite (default Django `db.sqlite3` in `backend`).

---

## How to run

On Windows, clone the repo and double-click `start.bat`. It creates the backend venv if needed, runs migrations, and opens two windows: one for Django, one for Next.js.

Backend is at http://127.0.0.1:8000, frontend at http://localhost:3000.

If you prefer to start things yourself: in one terminal, `cd backend`, run `venv\Scripts\activate`, then `python manage.py runserver 8000`. In another, `cd frontend` and `npm run dev`.

---

## Admin panel and adding data

Log in at http://127.0.0.1:8000/admin/ with **admin** / **12345** (email: admin@gmail.com).

- **Hierarchy:** facility → zone → device. Create in that order.
- **Facilities:** e.g. name “Main Lot”, code “MAIN”.
- **Zones:** under a facility, e.g. “Level B1”, code “B1”.
- **Devices:** under a zone; **code** is what the API uses (e.g. `PARK-B1-S001`). Keep it unique.
- **Targets (optional):** daily target per zone or device (date + value) for dashboard efficiency.
- **Data:** once structure exists, telemetry and parking logs come in via the APIs.
- **Quick data:** run `python manage.py seed_test_data` from `backend` (venv active) to create a sample facility, zone, three devices, and today’s telemetry/logs.
- **Offline alerts:** not automatic. Run `python manage.py check_offline_alerts` periodically (e.g. every 1–2 min via Task Scheduler/cron) from `backend` with venv activated.

---

## What’s in the app

**Backend (Django + DRF)**

- Models: facility, zone, device, telemetry, parking log, alert, target, device health score.
- POST telemetry (single or bulk) and parking logs; device must exist, timestamps validated; duplicate device+timestamp rejected.
- Dashboard summary by date: events, occupancy, active devices, alerts, hourly breakdown, efficiency (if targets set).
- Device status: last-seen, status (OK / Warning / Critical), health score 0–100.
- Alerts: list (with filters), acknowledge; one open alert per device per type (offline, high power, invalid data).
- Targets: CRUD by zone or device.
- Reports: CSV at `/report-csv/` (date range, optional facility/zone).

**Frontend (Next.js)**

- Dashboard: summary cards, date picker, hourly chart, target vs actual, device heartbeat table.
- Live: device list, 10s refresh, search.
- Alerts: list, filter by severity, acknowledge.
- Reports: date range + optional facility/zone, download CSV.

---

## Incomplete features

- Excel and PDF export (only CSV is implemented).
- Authentication and user roles.
- Automated scheduling for `check_offline_alerts` (no cron/celery setup in repo).
- Unit or integration tests.
- Occupancy per zone: no API or UI for “X of Y slots occupied” per zone; dashboard has global occupancy and zone breakdown only where targets exist (actual = event count, not occupancy).

---

## API Endpoints

Base URL: `http://127.0.0.1:8000/api/`

| Method | Endpoint                    | Description                                                   |
| ------ | --------------------------- | ------------------------------------------------------------- |
| GET    | `/health/`                  | Health check                                                  |
| POST   | `/telemetry/`               | Single telemetry ingestion                                    |
| POST   | `/telemetry/bulk/`          | Bulk telemetry ingestion                                      |
| POST   | `/parking-log/`             | Occupancy event (device became occupied/free)                 |
| GET    | `/alerts/`                  | List alerts (query: `severity`, `acknowledged`)               |
| PATCH  | `/alerts/<id>/acknowledge/` | Acknowledge an alert                                          |
| GET    | `/dashboard/summary/`       | Dashboard summary for a date (query: `date`)                  |
| GET    | `/devices/status/`          | Device list with status (query: `facility`, `zone`)           |
| GET    | `/targets/`                 | List targets (query: `zone_id`, `date_from`, `date_to`)       |
| POST   | `/targets/`                 | Create target                                                 |
| PATCH  | `/targets/<id>/`            | Update target                                                 |
| GET    | `/report-csv/`              | Usage CSV (query: `date_from`, `date_to`, `facility`, `zone`) |
| GET    | `/reports/usage/`           | Same as `/report-csv/`                                        |

---

## Design details (for reference)

- **Telemetry:** No future timestamps (1 min tolerance). Duplicate device+timestamp → 409. Bulk: partial success, errors by index.
- **Offline alert:** No telemetry for 2 min; one open offline alert per device.
- **High power:** voltage×current > 2000 W → CRITICAL.
- **Invalid data:** current > 100 A or voltage > 500 V → WARNING.
- **Health score (0–100):** Start 100; −10 per open alert; −30 if last telemetry > 5 min or missing.
- **Efficiency:** min(100, actual events / target × 100) per target.

---

## If I had more time

- Add tests for ingestion APIs, dashboard summary, and alert dedup.
- Run `check_offline_alerts` on a schedule (e.g. Celery beat or system cron).
- Add simple auth.
- Switch the live view to WebSockets and add more charts (e.g. occupancy over time).
- **At scale (e.g. 5,000 devices every 10s):** ingestion behind a queue (Celery + Redis), PostgreSQL with TimescaleDB or partitioning for time-series, cache dashboard aggregates, multiple API workers behind a load balancer with rate limiting.
