# Smart Parking — Monitoring & Alerting

A small platform to monitor parking devices and occupancy: ingest telemetry and occupancy events, see dashboards and device status, manage alerts, and export usage reports. No payments or bookings—just visibility and alerting.

---

## How to run

**Windows:** Clone the repo, then double-click `start.bat`. It sets up the backend venv, runs migrations, and starts Django and Next.js in separate windows.

- **Backend:** http://127.0.0.1:8000  
- **Frontend:** http://localhost:3000  

**Manual start:** From the project root, run the backend with `cd backend`, activate the venv (`venv\Scripts\activate`), then `python manage.py runserver 8000`. In another terminal, `cd frontend` and `npm run dev` for the UI.

---

## Admin panel and adding data

**Login:** http://127.0.0.1:8000/admin/  
Use: **admin** / **12345** (email: admin@gmail.com).

Data is hierarchical: **Facility → Zone → Device**. Create them in that order.

1. **Parking facilities** — Add a facility (e.g. name “Main Lot”, code “MAIN”).
2. **Parking zones** — Add zones under a facility (e.g. “Level B1”, code “B1”).
3. **Devices** — Add devices under a zone. The **code** is what the API uses (e.g. `PARK-B1-S001`). Keep it unique.
4. **Targets** (optional) — Set a daily target per zone or per device (date + target value) so the dashboard can show efficiency.

After that, data comes in via the APIs: telemetry (`POST /api/telemetry/` or bulk), and parking logs (`POST /api/parking-log/`). You can also run `python manage.py seed_test_data` from the `backend` folder (with venv active) to create a sample facility, zone, three devices, and some telemetry/logs for today.

**Offline alerts** are not created automatically by the app. Run from time to time (e.g. every 1–2 minutes via Task Scheduler or a cron):  
`python manage.py check_offline_alerts`  
(from `backend` with venv activated). That creates “device offline” alerts for devices with no telemetry in the last 2 minutes.

---

## What’s implemented

**Backend (Django + DRF)**  
- **Models:** Facility, Zone, Device, Telemetry, ParkingLog, Alert, Target, DeviceHealthScore.  
- **Ingestion:** Single and bulk telemetry (`/api/telemetry/`, `/api/telemetry/bulk/`), parking-log (`/api/parking-log/`). Device must exist; timestamps validated; duplicate (device + timestamp) rejected for telemetry.  
- **Dashboard:** `GET /api/dashboard/summary/?date=YYYY-MM-DD` — total events, current occupancy, active devices, alerts count, hourly usage, target vs actual and efficiency.  
- **Device status:** `GET /api/devices/status/` (optional filters: facility, zone) — last telemetry/log time, status (OK / Warning / Critical), health score (0–100).  
- **Alerts:** List with filters (`/api/alerts/?active=true&severity=...`), acknowledge via `PATCH /api/alerts/<id>/acknowledge/`. Alerts are stored and deduplicated (one open alert per device per type). Types: device offline, high power, invalid data; severities INFO, WARNING, CRITICAL.  
- **Targets:** CRUD for daily targets by zone or device (`/api/targets/`).  
- **Reports:** CSV export at `/report-csv/?date_from=...&date_to=...&format=csv` (and optional facility/zone).  

**Frontend (Next.js)**  
- **Dashboard** — Summary cards for the chosen date, hourly events chart, zone/device target vs actual table, device “heartbeat” (last seen).  
- **Live** — Device list with status and last seen; refreshes every 10 seconds; search by device/zone/facility.  
- **Alerts** — List active alerts, filter by severity, acknowledge.  
- **Reports** — Pick date range (and optionally facility/zone), download CSV.  

Excel/PDF export, auth, and automated offline-check scheduling are not implemented. Tests are not included.

---

## Design details (for reference)

- **Telemetry:** Timestamp cannot be in the future (1 min tolerance). Duplicate (device_code, timestamp) returns 409. Bulk endpoint does partial success: valid rows inserted, errors reported per index.  
- **Offline alert:** No telemetry for 2 minutes; one open “offline” alert per device.  
- **High power:** voltage × current > 2000 W → CRITICAL.  
- **Invalid data:** current > 100 A or voltage > 500 V → WARNING.  
- **Health score (0–100):** Start at 100; subtract 10 per open alert and 30 if last telemetry is older than 5 minutes (or missing).  
- **Efficiency:** For each target on that date, actual = count of parking log events; efficiency = min(100, actual / target × 100).

---

## If you had more time

I’d add tests (ingestion, dashboard, alert dedup), run `check_offline_alerts` on a schedule, add simple auth, and optionally swap the live view to WebSockets and add more charts (e.g. occupancy trend). For scale (e.g. 5,000 devices every 10 seconds), I’d move ingestion to a queue (e.g. Celery + Redis), use PostgreSQL (and possibly TimescaleDB or partitioning), cache dashboard aggregates, and run multiple API workers behind a load balancer with rate limiting.
