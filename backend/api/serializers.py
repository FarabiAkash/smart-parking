from rest_framework import serializers
from django.utils import timezone
from .models import Device, Telemetry, ParkingLog, Target


def parse_timestamp(value):
    """Parse ISO 8601 timestamp; reject future beyond 1 min tolerance."""
    if isinstance(value, timezone.datetime):
        return value
    try:
        dt = serializers.DateTimeField().to_internal_value(value)
        if dt.tzinfo is None:
            dt = timezone.make_aware(dt)
        # Reject future more than 1 minute
        if dt > timezone.now() + timezone.timedelta(minutes=1):
            raise serializers.ValidationError("Timestamp cannot be in the future.")
        return dt
    except Exception as e:
        raise serializers.ValidationError(str(e) or "Invalid timestamp.")


class TelemetrySerializer(serializers.Serializer):
    device_code = serializers.CharField(max_length=128)
    voltage = serializers.FloatField(min_value=0)
    current = serializers.FloatField(min_value=0)
    power_factor = serializers.FloatField(min_value=0, max_value=1)
    timestamp = serializers.CharField()

    def validate_timestamp(self, value):
        return parse_timestamp(value)

    def validate_device_code(self, value):
        if not Device.objects.filter(code=value).exists():
            raise serializers.ValidationError("Device not found.")
        return value


class TelemetryBulkItemSerializer(serializers.Serializer):
    device_code = serializers.CharField(max_length=128)
    voltage = serializers.FloatField(min_value=0)
    current = serializers.FloatField(min_value=0)
    power_factor = serializers.FloatField(min_value=0, max_value=1)
    timestamp = serializers.CharField()

    def validate_timestamp(self, value):
        return parse_timestamp(value)


class ParkingLogSerializer(serializers.Serializer):
    device_code = serializers.CharField(max_length=128)
    is_occupied = serializers.BooleanField()
    timestamp = serializers.CharField()

    def validate_timestamp(self, value):
        return parse_timestamp(value)

    def validate_device_code(self, value):
        if not Device.objects.filter(code=value).exists():
            raise serializers.ValidationError("Device not found.")
        return value


class TargetSerializer(serializers.Serializer):
    zone_id = serializers.IntegerField(required=False, allow_null=True)
    device_id = serializers.IntegerField(required=False, allow_null=True)
    date = serializers.DateField()
    target_value = serializers.FloatField(min_value=0)
    scope = serializers.ChoiceField(choices=Target.TARGET_SCOPE_CHOICES)

    def validate(self, attrs):
        zone_id = attrs.get("zone_id")
        device_id = attrs.get("device_id")
        scope = attrs.get("scope")
        if scope == Target.TARGET_ZONE:
            if not zone_id:
                raise serializers.ValidationError({"zone_id": "Required for zone target."})
            attrs["device_id"] = None
        else:
            if not device_id:
                raise serializers.ValidationError({"device_id": "Required for device target."})
            attrs["zone_id"] = None
        return attrs
