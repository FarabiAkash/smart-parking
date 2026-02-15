"""List all URL patterns. Run: python manage.py show_urls"""
from django.core.management.base import BaseCommand
from django.urls import get_resolver


def list_urls(resolver, prefix=""):
    for pattern in resolver.url_patterns:
        if hasattr(pattern, "url_patterns"):
            list_urls(pattern, prefix + str(pattern.pattern))
        else:
            path = prefix + str(pattern.pattern)
            callback = pattern.callback
            name = getattr(callback, "__name__", str(callback))
            print(path.ljust(50), name)


class Command(BaseCommand):
    help = "Print all registered URL patterns"

    def handle(self, *args, **options):
        resolver = get_resolver()
        print("URL pattern".ljust(50), "View")
        print("-" * 70)
        list_urls(resolver)
