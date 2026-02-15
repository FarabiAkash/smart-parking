"use client";

import { useState, useEffect } from "react";
import { fetchJson, apiUrl } from "../lib/api";

export default function ReportsPage() {
  const [facilities, setFacilities] = useState([]);
  const [zones, setZones] = useState([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [facilityId, setFacilityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJson("/api/devices/status/")
      .then((devices) => {
        const byFacility = new Map();
        const byZone = new Map();
        devices.forEach((d) => {
          if (d.facility_id != null && !byFacility.has(d.facility_id)) {
            byFacility.set(d.facility_id, { id: d.facility_id, name: d.facility_name });
          }
          if (d.zone_id != null && !byZone.has(d.zone_id)) {
            byZone.set(d.zone_id, { id: d.zone_id, code: d.zone_code });
          }
        });
        setFacilities(Array.from(byFacility.values()));
        setZones(Array.from(byZone.values()));
      })
      .catch(() => {});
  }, []);

  const downloadCsv = async () => {
    setError(null);
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        format: "csv",
      });
      if (facilityId) params.set("facility", facilityId);
      if (zoneId) params.set("zone", zoneId);
      const url = apiUrl(`/api/reports/usage/?${params}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "usage.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports & export</h1>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Date from</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Date to</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-background text-foreground"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Facility (optional)</label>
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-background text-foreground"
          >
            <option value="">All</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Zone (optional)</label>
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-background text-foreground"
          >
            <option value="">All</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading ? "Downloading…" : "Download CSV"}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Excel/PDF export: not implemented (see README).
        </p>
      </div>
    </div>
  );
}
