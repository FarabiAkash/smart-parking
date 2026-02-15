"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from datetime import datetime
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.utils import timezone


def _parse_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def _report_csv_view(request):
    """Serve usage CSV (plain Django view, no DRF)."""
    import csv
    from io import StringIO
    from api.models import ParkingLog

    GET = request.GET
    date_from = _parse_date(GET.get("date_from"))
    date_to = _parse_date(GET.get("date_to"))
    if not date_from:
        date_from = timezone.now().date()
    if not date_to:
        date_to = date_from
    if date_from > date_to:
        date_from, date_to = date_to, date_from
    facility_id = GET.get("facility")
    zone_id = GET.get("zone")

    qs = ParkingLog.objects.filter(
        timestamp__date__gte=date_from,
        timestamp__date__lte=date_to,
    ).select_related("device", "device__zone", "device__zone__facility").order_by("timestamp")
    if facility_id:
        qs = qs.filter(device__zone__facility_id=facility_id)
    if zone_id:
        qs = qs.filter(device__zone_id=zone_id)

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

def _csv_test(request):
    return HttpResponse("CSV test OK", content_type="text/plain")

urlpatterns = [
    path("report-csv/", _report_csv_view),
    path("report-csv", _report_csv_view),
    path("csv-test/", _csv_test),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
