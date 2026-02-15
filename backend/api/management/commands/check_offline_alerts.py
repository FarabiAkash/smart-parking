"""Run periodically (e.g. every 1-2 min) to create offline alerts for devices with no recent telemetry."""
from django.core.management.base import BaseCommand
from api.services import create_offline_alerts


class Command(BaseCommand):
    help = "Create offline alerts for devices with no telemetry in the last 2 minutes."

    def handle(self, *args, **options):
        create_offline_alerts()
        self.stdout.write(self.style.SUCCESS("Offline alert check done."))
