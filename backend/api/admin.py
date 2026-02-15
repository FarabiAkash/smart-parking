from django.contrib import admin
from .models import (
    ParkingFacility,
    ParkingZone,
    Device,
    Telemetry,
    ParkingLog,
    Alert,
    Target,
    DeviceHealthScore,
)


@admin.register(ParkingFacility)
class ParkingFacilityAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "address")


@admin.register(ParkingZone)
class ParkingZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "facility")
    list_filter = ("facility",)


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("code", "zone")
    list_filter = ("zone__facility", "zone")
    search_fields = ("code",)


@admin.register(Telemetry)
class TelemetryAdmin(admin.ModelAdmin):
    list_display = ("device", "voltage", "current", "power_factor", "timestamp")
    list_filter = ("device__zone",)
    date_hierarchy = "timestamp"


@admin.register(ParkingLog)
class ParkingLogAdmin(admin.ModelAdmin):
    list_display = ("device", "is_occupied", "timestamp")
    list_filter = ("device__zone", "is_occupied")
    date_hierarchy = "timestamp"


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("device", "severity", "alert_type", "message", "acknowledged_at", "created_at")
    list_filter = ("severity", "alert_type")
    date_hierarchy = "created_at"


@admin.register(Target)
class TargetAdmin(admin.ModelAdmin):
    list_display = ("date", "zone", "device", "target_value", "scope")
    list_filter = ("scope", "date")


@admin.register(DeviceHealthScore)
class DeviceHealthScoreAdmin(admin.ModelAdmin):
    list_display = ("device", "score", "calculated_at")
    date_hierarchy = "calculated_at"
