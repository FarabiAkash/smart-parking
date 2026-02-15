"""
Business logic: alert creation with dedup, thresholds.
Document thresholds in README.
"""
from django.utils import timezone
from .models import Alert, Device, Telemetry

# Thresholds (document in README)
OFFLINE_MINUTES = 2
HIGH_POWER_WATTS = 2000  # voltage * current > this -> high_power
INVALID_CURRENT_MAX = 100  # A
INVALID_VOLTAGE_MAX = 500  # V


def acknowledge_offline_alerts_for_device(device):
    """When device sends telemetry again, mark open offline alerts as acknowledged."""
    Alert.objects.filter(
        device=device,
        alert_type=Alert.ALERT_OFFLINE,
        acknowledged_at__isnull=True,
    ).update(acknowledged_at=timezone.now())


def get_or_create_alert(device, alert_type, severity, message):
    """Create alert only if no open (unacknowledged) alert for same device + type."""
    if not device:
        return None
    exists = Alert.objects.filter(
        device=device,
        alert_type=alert_type,
        acknowledged_at__isnull=True,
    ).exists()
    if exists:
        return None
    return Alert.objects.create(
        device=device,
        alert_type=alert_type,
        severity=severity,
        message=message,
    )


def check_telemetry_alerts(device, voltage, current):
    """After saving telemetry: create high_power or invalid_data alerts if needed."""
    power = voltage * current
    if power > HIGH_POWER_WATTS:
        get_or_create_alert(
            device,
            Alert.ALERT_HIGH_POWER,
            Alert.SEVERITY_CRITICAL,
            f"Power {power:.1f} W exceeds threshold {HIGH_POWER_WATTS} W",
        )
    if current > INVALID_CURRENT_MAX or voltage > INVALID_VOLTAGE_MAX:
        get_or_create_alert(
            device,
            Alert.ALERT_INVALID_DATA,
            Alert.SEVERITY_WARNING,
            f"Abnormal reading: voltage={voltage}, current={current}",
        )


def create_offline_alerts():
    """Create offline alert for each device with no telemetry in last OFFLINE_MINUTES."""
    from django.db.models import Max

    cutoff = timezone.now() - timezone.timedelta(minutes=OFFLINE_MINUTES)
    # Devices that have at least one telemetry
    last_telemetry = (
        Telemetry.objects.values("device_id")
        .annotate(last=Max("timestamp"))
        .filter(last__lt=cutoff)
    )
    device_ids = [r["device_id"] for r in last_telemetry]
    for device in Device.objects.filter(pk__in=device_ids):
        get_or_create_alert(
            device,
            Alert.ALERT_OFFLINE,
            Alert.SEVERITY_WARNING,
            f"No telemetry received for {OFFLINE_MINUTES} minutes.",
        )


# Health score: 0-100. Formula (document in README):
# Base 100; -10 per open (unacknowledged) alert; -30 if last telemetry > 5 min ago.
HEALTH_OFFLINE_MINUTES = 5
HEALTH_PENALTY_PER_ALERT = 10
HEALTH_OFFLINE_PENALTY = 30


def compute_health_score(device):
    """Compute device health score 0-100. Not persisted; call from device status API."""
    from django.db.models import Max, Count

    score = 100.0
    # Open alerts
    open_count = Alert.objects.filter(
        device=device, acknowledged_at__isnull=True
    ).count()
    score -= open_count * HEALTH_PENALTY_PER_ALERT
    # Offline: no telemetry in last HEALTH_OFFLINE_MINUTES
    last_ts = Telemetry.objects.filter(device=device).aggregate(Max("timestamp"))["timestamp__max"]
    if last_ts:
        from datetime import timedelta
        if timezone.now() - last_ts > timedelta(minutes=HEALTH_OFFLINE_MINUTES):
            score -= HEALTH_OFFLINE_PENALTY
    else:
        score -= HEALTH_OFFLINE_PENALTY  # Never sent telemetry
    return max(0, min(100, round(score, 1)))
