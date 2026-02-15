from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health),
    path("telemetry/", views.telemetry_create),
    path("telemetry/bulk/", views.telemetry_bulk_create),
    path("parking-log/", views.parking_log_create),
    path("alerts/", views.alert_list),
    path("alerts/<int:pk>/acknowledge/", views.alert_acknowledge),
    path("dashboard/summary/", views.dashboard_summary),
    path("devices/status/", views.device_status_list),
    path("targets/", views.target_list),
    path("targets/<int:pk>/", views.target_update),
    path("report-csv/", views.reports_usage),
    path("report-csv", views.reports_usage),
    path("reports/usage/", views.reports_usage),
    path("reports/usage", views.reports_usage),
]
