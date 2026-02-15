"use client";

import { useState, useEffect } from "react";
import { fetchJson, apiUrl } from "../lib/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [severity, setSeverity] = useState("");

  const load = () => {
    let path = "/api/alerts/?active=true";
    if (severity) path += `&severity=${encodeURIComponent(severity)}`;
    fetchJson(path)
      .then(setAlerts)
      .catch((e) => {
        setError(e.message);
        setAlerts([]);
      });
  };

  useEffect(() => {
    load();
  }, [severity]);

  const acknowledge = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/alerts/${id}/acknowledge/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Alert management</h1>

      <div className="flex items-center gap-2">
        <label className="text-sm">Severity:</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-background text-foreground"
        >
          <option value="">All</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-3">Device</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Type</th>
                <th className="p-3">Message</th>
                <th className="p-3">Created</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-gray-500">
                    {error ? "Error loading alerts." : "No active alerts."}
                  </td>
                </tr>
              )}
              {alerts.map((a) => (
                <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-3 font-mono">{a.device_code ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={
                        a.severity === "CRITICAL"
                          ? "text-red-600 font-medium"
                          : a.severity === "WARNING"
                          ? "text-amber-600 font-medium"
                          : ""
                      }
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="p-3">{a.alert_type}</td>
                  <td className="p-3 max-w-xs truncate" title={a.message}>
                    {a.message}
                  </td>
                  <td className="p-3 text-sm">
                    {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => acknowledge(a.id)}
                      className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Acknowledge
                    </button>
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
