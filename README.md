# Smart Parking — Monitoring & Alerting Platform

Monitoring and alerting for parking devices (no payments, bookings, or reservations).

## Setup / run (Windows)

1. Clone the repo.
2. Double-click `start.bat`.

**Backend:** http://127.0.0.1:8000  
**Frontend:** http://localhost:3000  
**Admin:** http://127.0.0.1:8000/admin/ (create a superuser with `python manage.py createsuperuser` in `backend` with venv activated)

To create sample data: use Django admin to add a Parking Facility, Zone(s), and Device(s). Then send telemetry and parking logs via the API or a script.

**Offline alerts:** Run periodically (e.g. every 1–2 min) from `backend` with venv activated:
```bash
python manage.py check_offline_alerts
```

---

## Completed features

- **Backend**
  - Data models: ParkingFacility, ParkingZone, Device, Telemetry, ParkingLog, Alert, Target, DeviceHealthScore
  - `POST /api/telemetry/` — single telemetry ingestion (device exists, valid timestamp, no duplicate device+timestamp)
  - `POST /api/telemetry/bulk/` — bulk telemetry (partial success: valid rows inserted, errors per index)
  - `POST /api/parking-log/` — occupancy event ingestion
  - `GET /api/dashboard/summary/?date=YYYY-MM-DD` — total events, current occupancy, active devices, alerts triggered, hourly usage, efficiency (target vs actual)
  - `GET /api/devices/status/?facility=...&zone=...` — device list with last seen, status, health score
  - `GET /api/alerts/?active=true&severity=...` — list alerts; `PATCH /api/alerts/<id>/acknowledge/` — acknowledge
  - `GET/POST /api/targets/`, `PATCH /api/targets/<id>/` — daily targets by zone or device
  - `GET /api/reports/usage/?date_from=...&date_to=...&format=csv` — CSV export
  - Alerts: device offline (>2 min no telemetry), high power, invalid data; severity INFO/WARNING/CRITICAL; stored and deduplicated
  - Device health score 0–100 (formula below)
- **Frontend**
  - Dashboard: summary cards, date picker, hourly events chart, zone/device target vs actual table, device heartbeat table
  - Live monitoring: device status table, poll every 10 seconds, search
  - Alerts panel: list active alerts, filter by severity, acknowledge
  - Reports: date range and facility/zone filters, Download CSV

---

## Incomplete features

- Excel and PDF export (only CSV implemented)
- Authentication / user roles
- Automated run of `check_offline_alerts` (e.g. cron) not set up in repo
- Tests (unit/integration) not included

---

## What I would do next with more time

- Add pytest (or Django test runner) tests for ingestion APIs, dashboard summary, and alert dedup
- Run `check_offline_alerts` via a scheduler (e.g. Celery beat or Windows Task Scheduler)
- Add simple auth (e.g. token or session) for API and frontend
- Improve timezone handling (store and display in a chosen timezone)
- Optional: WebSockets or Server-Sent Events instead of 10s polling for live view
- More charts (e.g. occupancy trend over time, health trend)

---

## Design notes (thresholds and formulas)

- **Telemetry:** Timestamp must not be in the future (1 min tolerance). Duplicate (device_code, timestamp) is rejected (409).
- **Bulk telemetry:** Partial success: valid records are bulk-inserted; invalid indices are returned in `errors`.
- **Offline alert:** No telemetry received for **2 minutes**; created by `check_offline_alerts` (run periodically). Dedup: one open “offline” alert per device.
- **High power:** Power = voltage × current > **2000 W** → CRITICAL alert. Dedup: one open “high_power” per device.
- **Invalid data:** Current > **100 A** or voltage > **500 V** → WARNING alert. Dedup: one open “invalid_data” per device.
- **Device health score (0–100):** Base 100; -10 per open (unacknowledged) alert; -30 if last telemetry is older than **5 minutes** (or never). Clamped to 0–100.
- **Dashboard “current occupancy”:** For the selected date, latest parking log per device (by timestamp) and count of devices with `is_occupied=True`.
- **Active devices:** Devices that sent at least one telemetry or parking log on that date.
- **Efficiency:** For targets defined for that date (by zone or device), actual = count of parking log events; efficiency = min(100, actual / target × 100).

---

## Scalability thought exercise

**“What changes would you make if 5,000 devices send data every 10 seconds?”**

- **Ingestion:** Move to an async queue (e.g. Celery + Redis). API endpoints enqueue payloads; workers validate and bulk-insert in batches (e.g. 500–1000 rows per batch) to avoid long HTTP requests and DB lock contention. Use connection pooling (e.g. PgBouncer for PostgreSQL).
- **Database:** Switch to PostgreSQL (or similar) and consider TimescaleDB or partitioning for Telemetry and ParkingLog by time (e.g. monthly). Indexes on (device_id, timestamp) and read replicas for dashboard/report queries.
- **Dashboard and reports:** Cache aggregated metrics (e.g. daily summary, hourly counts) in Redis with short TTL; recompute via background jobs. Serve device status from cache where possible.
- **Rate limiting and scaling:** Apply rate limits per client/IP to avoid abuse. Run multiple API workers behind a load balancer; ensure idempotency and duplicate handling (e.g. unique constraint + “on conflict ignore” or 409) so retries are safe.
- **Offline checks:** Run `check_offline_alerts` in a distributed way (e.g. shard devices across workers) so one job doesn’t scan 5,000 devices in a single process.
