"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchJson } from "./lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardPage() {
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      fetchJson(`/api/dashboard/summary/?date=${date}`).then(setSummary).catch((e) => setError(e.message)),
      fetchJson("/api/devices/status/").then(setDevices).catch(() => setDevices([])),
    ]).catch(() => {});
  }, [date]);

  const chartData = summary?.hourly_usage?.map((h) => ({
    hour: h.hour ? new Date(h.hour).getHours() : 0,
    label: `${new Date(h.hour).getHours()}:00`,
    count: h.count,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-background text-foreground"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total parking events</p>
              <p className="text-2xl font-semibold">{summary.total_parking_events}</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">Current occupancy</p>
              <p className="text-2xl font-semibold">{summary.current_occupancy_count}</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">Active devices</p>
              <p className="text-2xl font-semibold">{summary.active_devices_count}</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">Alerts triggered</p>
              <p className="text-2xl font-semibold">{summary.alerts_triggered}</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">Efficiency %</p>
              <p className="text-2xl font-semibold">
                {summary.efficiency_pct != null ? `${summary.efficiency_pct}%` : "—"}
              </p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Hourly parking events</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Events" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {summary.zone_breakdown && summary.zone_breakdown.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <h2 className="text-lg font-semibold p-4 border-b border-gray-200 dark:border-gray-700">
                Target vs actual (zone/device)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="p-3">Zone / Device</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Actual</th>
                      <th className="p-3">Efficiency %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.zone_breakdown.map((row, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-3">{row.zone_code ?? row.device_code ?? "—"}</td>
                        <td className="p-3">{row.target}</td>
                        <td className="p-3">{row.actual}</td>
                        <td className="p-3">{row.efficiency_pct?.toFixed(1) ?? "—"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {devices && devices.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <h2 className="text-lg font-semibold p-4 border-b border-gray-200 dark:border-gray-700">
                Device heartbeat (last seen)
              </h2>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <th className="p-3">Device</th>
                      <th className="p-3">Zone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Health</th>
                      <th className="p-3">Last telemetry</th>
                      <th className="p-3">Last parking log</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-3 font-mono">{d.code}</td>
                        <td className="p-3">{d.zone_code}</td>
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
              <p className="p-3 text-sm text-gray-500">
                <Link href="/live" className="underline">Live monitoring</Link> (polls every 10s)
              </p>
            </div>
          )}
        </>
      )}

      {!summary && !error && (
        <p className="text-gray-500">Loading…</p>
      )}
    </div>
  );
}
