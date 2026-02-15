from datetime import datetime
from django.utils import timezone
from django.db.models import Count, Max, Min, Q
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status

from .models import Device, Telemetry, ParkingLog, Alert, Target, ParkingZone, ParkingFacility
from .serializers import (
    TelemetrySerializer,
    TelemetryBulkItemSerializer,
    ParkingLogSerializer,
    TargetSerializer,
)
from .services import (
    check_telemetry_alerts,
    acknowledge_offline_alerts_for_device,
    compute_health_score,
)


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
def telemetry_create(request):
    """POST /api/telemetry/ - single telemetry ingestion."""
    ser = TelemetrySerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    device = Device.objects.get(code=data["device_code"])
    ts = data["timestamp"]
    if Telemetry.objects.filter(device=device, timestamp=ts).exists():
        return Response(
            {"detail": "Duplicate telemetry for this device and timestamp."},
            status=status.HTTP_409_CONFLICT,
        )
    obj = Telemetry.objects.create(
        device=device,
        voltage=data["voltage"],
        current=data["current"],
        power_factor=data["power_factor"],
        timestamp=ts,
    )
    acknowledge_offline_alerts_for_device(device)
    check_telemetry_alerts(device, data["voltage"], data["current"])
    return Response(
        {"id": obj.pk, "device_code": device.code, "timestamp": ts.isoformat()},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def telemetry_bulk_create(request):
    """POST /api/telemetry/bulk/ - bulk telemetry; partial success: insert valid, return errors."""
    if not isinstance(request.data, list):
        return Response(
            {"detail": "Expected a list of telemetry records."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    to_create = []
    errors = []
    seen = set()  # (device_code, timestamp key) for duplicate in request

    for i, item in enumerate(request.data):
        ser = TelemetryBulkItemSerializer(data=item)
        if not ser.is_valid():
            errors.append({"index": i, "errors": ser.errors})
            continue
        data = ser.validated_data
        try:
            device = Device.objects.get(code=data["device_code"])
        except Device.DoesNotExist:
            errors.append({"index": i, "errors": {"device_code": ["Device not found."]}})
            continue
        ts = data["timestamp"]
        key = (device.code, ts.isoformat())
        if key in seen:
            errors.append({"index": i, "errors": {"timestamp": ["Duplicate in request."]}})
            continue
        if Telemetry.objects.filter(device=device, timestamp=ts).exists():
            errors.append({"index": i, "errors": {"timestamp": ["Duplicate in database."]}})
            continue
        seen.add(key)
        to_create.append(
            Telemetry(
                device=device,
                voltage=data["voltage"],
                current=data["current"],
                power_factor=data["power_factor"],
                timestamp=ts,
            )
        )

    if to_create:
        Telemetry.objects.bulk_create(to_create)
        for obj in to_create:
            acknowledge_offline_alerts_for_device(obj.device)
            check_telemetry_alerts(obj.device, obj.voltage, obj.current)

    return Response(
        {"created": len(to_create), "errors": errors},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def parking_log_create(request):
    """POST /api/parking-log/ - occupancy event ingestion."""
    ser = ParkingLogSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    device = Device.objects.get(code=data["device_code"])
    ParkingLog.objects.create(
        device=device,
        is_occupied=data["is_occupied"],
        timestamp=data["timestamp"],
    )
    return Response(
        {"detail": "Parking log created."},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def alert_list(request):
    """GET /api/alerts/?active=true&severity=..."""
    qs = Alert.objects.select_related("device", "device__zone", "device__zone__facility")
    active = request.query_params.get("active")
    if active is not None:
        if str(active).lower() in ("true", "1", "yes"):
            qs = qs.filter(acknowledged_at__isnull=True)
        else:
            qs = qs.filter(acknowledged_at__isnull=False)
    sev = request.query_params.get("severity")
    if sev:
        qs = qs.filter(severity=sev)
    qs = qs.order_by("-created_at")[:500]
    data = [
        {
            "id": a.pk,
            "device_code": a.device.code if a.device else None,
            "severity": a.severity,
            "alert_type": a.alert_type,
            "message": a.message,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "created_at": a.created_at.isoformat(),
        }
        for a in qs
    ]
    return Response(data)


@api_view(["PATCH"])
def alert_acknowledge(request, pk):
    """PATCH /api/alerts/<id>/acknowledge/"""
    try:
        alert = Alert.objects.get(pk=pk)
    except Alert.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if alert.acknowledged_at is None:
        alert.acknowledged_at = timezone.now()
        alert.save(update_fields=["acknowledged_at"])
    return Response({
        "id": alert.pk,
        "acknowledged_at": alert.acknowledged_at.isoformat(),
    })


def _parse_date(s):
    """Parse YYYY-MM-DD; return date or None."""
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


@api_view(["GET"])
def dashboard_summary(request):
    """GET /api/dashboard/summary/?date=YYYY-MM-DD"""
    date_str = request.query_params.get("date")
    if not date_str:
        return Response(
            {"detail": "Query parameter 'date' (YYYY-MM-DD) is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    day = _parse_date(date_str)
    if day is None:
        return Response(
            {"detail": "Invalid date. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    start = timezone.make_aware(datetime.combine(day, datetime.min.time()))
    end = timezone.make_aware(datetime.combine(day, datetime.max.time()))

    total_parking_events = ParkingLog.objects.filter(
        timestamp__gte=start, timestamp__lte=end
    ).count()

    # Current occupancy: latest log per device on that date; count is_occupied
    latest_per_device = (
        ParkingLog.objects.filter(timestamp__gte=start, timestamp__lte=end)
        .values("device_id")
        .annotate(last_ts=Max("timestamp"))
    )
    occupied_count = 0
    for row in latest_per_device:
        log = ParkingLog.objects.filter(
            device_id=row["device_id"], timestamp=row["last_ts"]
        ).first()
        if log and log.is_occupied:
            occupied_count += 1

    # Active devices: sent telemetry or parking log on that date
    telemetry_devices = set(
        Telemetry.objects.filter(timestamp__gte=start, timestamp__lte=end)
        .values_list("device_id", flat=True)
        .distinct()
    )
    log_devices = set(
        ParkingLog.objects.filter(timestamp__gte=start, timestamp__lte=end)
        .values_list("device_id", flat=True)
        .distinct()
    )
    active_devices_count = len(telemetry_devices | log_devices)

    # Alerts triggered (created on that date)
    alerts_triggered = Alert.objects.filter(
        created_at__gte=start, created_at__lte=end
    ).count()

    # Hourly usage: count of parking log events per hour
    from django.db.models.functions import TruncHour
    hourly = (
        ParkingLog.objects.filter(timestamp__gte=start, timestamp__lte=end)
        .annotate(hour=TruncHour("timestamp"))
        .values("hour")
        .annotate(count=Count("id"))
        .order_by("hour")
    )
    hourly_usage = [{"hour": h["hour"].isoformat() if h["hour"] else None, "count": h["count"]} for h in hourly]

    # Targets and efficiency for this date
    targets = Target.objects.filter(date=day).select_related("zone", "device")
    total_target = 0.0
    total_actual = 0.0
    zone_breakdown = []
    for t in targets:
        if t.zone_id:
            devices_in_zone = Device.objects.filter(zone=t.zone)
            actual = ParkingLog.objects.filter(
                device__zone=t.zone,
                timestamp__gte=start,
                timestamp__lte=end,
            ).count()
            total_target += t.target_value
            total_actual += actual
            zone_breakdown.append({
                "zone_code": t.zone.code,
                "target": t.target_value,
                "actual": actual,
                "efficiency_pct": min(100, (actual / t.target_value * 100)) if t.target_value else 0,
            })
        else:
            actual = ParkingLog.objects.filter(
                device=t.device,
                timestamp__gte=start,
                timestamp__lte=end,
            ).count()
            total_target += t.target_value
            total_actual += actual
            zone_breakdown.append({
                "device_code": t.device.code,
                "target": t.target_value,
                "actual": actual,
                "efficiency_pct": min(100, (actual / t.target_value * 100)) if t.target_value else 0,
            })
    efficiency_pct = (total_actual / total_target * 100) if total_target else None

    return Response({
        "date": date_str,
        "total_parking_events": total_parking_events,
        "current_occupancy_count": occupied_count,
        "active_devices_count": active_devices_count,
        "alerts_triggered": alerts_triggered,
        "hourly_usage": hourly_usage,
        "efficiency_pct": round(efficiency_pct, 1) if efficiency_pct is not None else None,
        "target_actual_comparison": {"target": total_target, "actual": total_actual} if total_target else None,
        "zone_breakdown": zone_breakdown,
    })


@api_view(["GET"])
def device_status_list(request):
    """GET /api/devices/status/?facility=...&zone=..."""
    qs = Device.objects.select_related("zone", "zone__facility").order_by("code")
    facility_id = request.query_params.get("facility")
    if facility_id:
        qs = qs.filter(zone__facility_id=facility_id)
    zone_id = request.query_params.get("zone")
    if zone_id:
        qs = qs.filter(zone_id=zone_id)

    last_telemetry = Telemetry.objects.values("device_id").annotate(ts=Max("timestamp"))
    last_telemetry_map = {r["device_id"]: r["ts"] for r in last_telemetry}
    last_log = ParkingLog.objects.values("device_id").annotate(ts=Max("timestamp"))
    last_log_map = {r["device_id"]: r["ts"] for r in last_log}

    open_alerts = Alert.objects.filter(acknowledged_at__isnull=True).values_list("device_id", flat=True)
    critical = set(Alert.objects.filter(acknowledged_at__isnull=True, severity=Alert.SEVERITY_CRITICAL).values_list("device_id", flat=True))
    warning = set(Alert.objects.filter(acknowledged_at__isnull=True, severity=Alert.SEVERITY_WARNING).values_list("device_id", flat=True))

    data = []
    for d in qs:
        status_val = "OK"
        if d.id in critical:
            status_val = "CRITICAL"
        elif d.id in warning:
            status_val = "WARNING"
        data.append({
            "id": d.id,
            "code": d.code,
            "zone_id": d.zone_id,
            "zone_code": d.zone.code,
            "facility_id": d.zone.facility_id,
            "facility_name": d.zone.facility.name,
            "last_telemetry_at": last_telemetry_map.get(d.id).isoformat() if last_telemetry_map.get(d.id) else None,
            "last_parking_log_at": last_log_map.get(d.id).isoformat() if last_log_map.get(d.id) else None,
            "status": status_val,
            "health_score": compute_health_score(d),
        })
    return Response(data)


@api_view(["GET", "POST"])
def target_list(request):
    """GET/POST /api/targets/"""
    if request.method == "GET":
        qs = Target.objects.select_related("zone", "device").order_by("-date", "zone__code", "device__code")
        date_str = request.query_params.get("date")
        if date_str:
            day = _parse_date(date_str)
            if day:
                qs = qs.filter(date=day)
        zone_id = request.query_params.get("zone_id")
        if zone_id:
            qs = qs.filter(zone_id=zone_id)
        device_id = request.query_params.get("device_id")
        if device_id:
            qs = qs.filter(device_id=device_id)
        data = [
            {
                "id": t.pk,
                "zone_id": t.zone_id,
                "zone_code": t.zone.code if t.zone else None,
                "device_id": t.device_id,
                "device_code": t.device.code if t.device else None,
                "date": str(t.date),
                "target_value": t.target_value,
                "scope": t.scope,
            }
            for t in qs[:200]
        ]
        return Response(data)

    ser = TargetSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    if data["scope"] == Target.TARGET_ZONE:
        zone = ParkingZone.objects.get(pk=data["zone_id"])
        target, created = Target.objects.update_or_create(
            zone=zone,
            date=data["date"],
            defaults={"device": None, "target_value": data["target_value"], "scope": data["scope"]},
        )
    else:
        device = Device.objects.get(pk=data["device_id"])
        target, created = Target.objects.update_or_create(
            device=device,
            date=data["date"],
            defaults={"zone": None, "target_value": data["target_value"], "scope": data["scope"]},
        )
    return Response(
        {"id": target.pk, "date": str(target.date), "target_value": target.target_value, "scope": target.scope},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["PATCH"])
def target_update(request, pk):
    """PATCH /api/targets/<id>/"""
    try:
        target = Target.objects.get(pk=pk)
    except Target.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    new_value = request.data.get("target_value")
    if new_value is not None:
        target.target_value = float(new_value)
        target.save(update_fields=["target_value"])
    return Response({
        "id": target.pk,
        "date": str(target.date),
        "target_value": target.target_value,
        "scope": target.scope,
    })


@api_view(["GET"])
def reports_usage(request):
    """GET /api/reports/usage/?date_from=...&date_to=...&format=csv"""
    date_from = _parse_date(request.query_params.get("date_from"))
    date_to = _parse_date(request.query_params.get("date_to"))
    if not date_from:
        date_from = timezone.now().date()
    if not date_to:
        date_to = date_from
    if date_from > date_to:
        date_from, date_to = date_to, date_from
    facility_id = request.query_params.get("facility")
    zone_id = request.query_params.get("zone")
    fmt = request.query_params.get("format", "csv").lower()

    qs = ParkingLog.objects.filter(
        timestamp__date__gte=date_from,
        timestamp__date__lte=date_to,
    ).select_related("device", "device__zone", "device__zone__facility").order_by("timestamp")
    if facility_id:
        qs = qs.filter(device__zone__facility_id=facility_id)
    if zone_id:
        qs = qs.filter(device__zone_id=zone_id)

    if fmt == "csv":
        import csv
        from io import StringIO
        buf = StringIO()
        w = csv.writer(buf)
        w.writerow(["date", "device_code", "zone_code", "facility", "is_occupied", "timestamp"])
        for log in qs:
            w.writerow([
                log.timestamp.date(),
                log.device.code,
                log.device.zone.code,
                log.device.zone.facility.name,
                log.is_occupied,
                log.timestamp.isoformat(),
            ])
        resp = HttpResponse(buf.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="usage.csv"'
        return resp
    return Response({"detail": "Only format=csv is supported."}, status=status.HTTP_400_BAD_REQUEST)
