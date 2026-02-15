from django.db import models


class ParkingFacility(models.Model):
    """Site (parking facility)."""
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64, unique=True, blank=True, null=True)
    address = models.CharField(max_length=512, blank=True)

    class Meta:
        verbose_name_plural = "Parking facilities"

    def __str__(self):
        return self.name or self.code or str(self.pk)


class ParkingZone(models.Model):
    """Zone within a facility (e.g. B1, B2, Outdoor)."""
    facility = models.ForeignKey(
        ParkingFacility, on_delete=models.CASCADE, related_name="zones"
    )
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=64)  # e.g. B1, B2

    class Meta:
        unique_together = [["facility", "code"]]

    def __str__(self):
        return f"{self.facility.name} / {self.code}"


class Device(models.Model):
    """Device attached to a parking slot."""
    zone = models.ForeignKey(
        ParkingZone, on_delete=models.CASCADE, related_name="devices"
    )
    code = models.CharField(max_length=128, unique=True)  # e.g. PARK-B1-S005

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.code


class Telemetry(models.Model):
    """Time-series telemetry from devices."""
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="telemetry"
    )
    voltage = models.FloatField()
    current = models.FloatField()
    power_factor = models.FloatField()
    timestamp = models.DateTimeField(db_index=True)

    class Meta:
        verbose_name_plural = "Telemetry"
        ordering = ["-timestamp"]
        constraints = [
            models.UniqueConstraint(
                fields=["device", "timestamp"],
                name="unique_device_timestamp_telemetry",
            )
        ]
        indexes = [
            models.Index(fields=["device", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.device.code} @ {self.timestamp}"


class ParkingLog(models.Model):
    """Occupancy event: slot became occupied or free."""
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="parking_logs"
    )
    is_occupied = models.BooleanField()
    timestamp = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["device", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.device.code} occupied={self.is_occupied} @ {self.timestamp}"


class Alert(models.Model):
    SEVERITY_INFO = "INFO"
    SEVERITY_WARNING = "WARNING"
    SEVERITY_CRITICAL = "CRITICAL"
    SEVERITY_CHOICES = [
        (SEVERITY_INFO, "Info"),
        (SEVERITY_WARNING, "Warning"),
        (SEVERITY_CRITICAL, "Critical"),
    ]
    ALERT_OFFLINE = "offline"
    ALERT_HIGH_POWER = "high_power"
    ALERT_INVALID_DATA = "invalid_data"
    ALERT_TYPE_CHOICES = [
        (ALERT_OFFLINE, "Device offline"),
        (ALERT_HIGH_POWER, "High power usage"),
        (ALERT_INVALID_DATA, "Invalid data"),
    ]

    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="alerts", null=True, blank=True
    )
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES)
    alert_type = models.CharField(max_length=32, choices=ALERT_TYPE_CHOICES)
    message = models.TextField()
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["device", "alert_type"]),
        ]

    def __str__(self):
        return f"{self.alert_type} ({self.severity}) - {self.device_id or 'system'}"


class Target(models.Model):
    """Daily usage target by zone or by device."""
    TARGET_ZONE = "zone"
    TARGET_DEVICE = "device"
    TARGET_SCOPE_CHOICES = [
        (TARGET_ZONE, "Zone"),
        (TARGET_DEVICE, "Device"),
    ]

    zone = models.ForeignKey(
        ParkingZone, on_delete=models.CASCADE, related_name="targets", null=True, blank=True
    )
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="targets", null=True, blank=True
    )
    date = models.DateField(db_index=True)
    target_value = models.FloatField(help_text="Expected occupancy count or usage hours")
    scope = models.CharField(max_length=16, choices=TARGET_SCOPE_CHOICES)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["zone", "date"],
                name="unique_zone_date_target",
                condition=models.Q(zone__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["device", "date"],
                name="unique_device_date_target",
                condition=models.Q(device__isnull=False),
            ),
        ]

    def __str__(self):
        if self.zone_id:
            return f"Zone {self.zone.code} {self.date}: {self.target_value}"
        return f"Device {self.device.code} {self.date}: {self.target_value}"


class DeviceHealthScore(models.Model):
    """Snapshot of device health score (0-100)."""
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="health_scores"
    )
    score = models.FloatField()  # 0-100
    calculated_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-calculated_at"]

    def __str__(self):
        return f"{self.device.code} health={self.score} @ {self.calculated_at}"
