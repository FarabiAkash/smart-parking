"use client";

import { useState, useEffect, useRef } from "react";
import { fetchJson } from "../lib/api";

const POLL_MS = 10000;

export default function LivePage() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const intervalRef = useRef(null);

  const load = () => {
    fetchJson("/api/devices/status/")
      .then(setDevices)
      .catch((e) => {
        setError(e.message);
        setDevices([]);
      });
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const filtered = search.trim()
    ? devices.filter(
        (d) =>
          d.code?.toLowerCase().includes(search.toLowerCase()) ||
          d.zone_code?.toLowerCase().includes(search.toLowerCase()) ||
          d.facility_name?.toLowerCase().includes(search.toLowerCase())
      )
    : devices;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Live monitoring</h1>
        <p className="text-sm text-gray-500">Refreshes every 10 seconds</p>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm">Search:</label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Device, zone, facility..."
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 w-64 bg-background text-foreground"
        />
      </div>

      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-3">Device</th>
                <th className="p-3">Zone</th>
                <th className="p-3">Facility</th>
                <th className="p-3">Status</th>
                <th className="p-3">Health</th>
                <th className="p-3">Last telemetry</th>
                <th className="p-3">Last parking log</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-gray-500">
                    {devices.length === 0 ? (error ? "Error loading devices." : "Loading…") : "No devices match search."}
                  </td>
                </tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-3 font-mono">{d.code}</td>
                  <td className="p-3">{d.zone_code}</td>
                  <td className="p-3">{d.facility_name}</td>
                  <td className="p-3">
                    <span
                      className={
                        d.status === "CRITICAL"
                          ? "text-red-600 font-medium"
                          : d.status === "WARNING"
                          ? "text-amber-600 font-medium"
                          : "text-green-600"
                      }
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3">{d.health_score ?? "—"}</td>
                  <td className="p-3 text-sm">
                    {d.last_telemetry_at
                      ? new Date(d.last_telemetry_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3 text-sm">
                    {d.last_parking_log_at
                      ? new Date(d.last_parking_log_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
