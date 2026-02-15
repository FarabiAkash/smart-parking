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
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Container from "@mui/material/Container";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import LinkMui from "@mui/material/Link";

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function StatusChip({ status }) {
  const severity = status === "CRITICAL" ? "error" : status === "WARNING" ? "warning" : "success";
  return <Chip label={status} color={severity} size="small" />;
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

  const statCards = summary
    ? [
        { label: "Total parking events", value: summary.total_parking_events },
        { label: "Current occupancy", value: summary.current_occupancy_count },
        { label: "Active devices", value: summary.active_devices_count },
        { label: "Alerts triggered", value: summary.alerts_triggered },
        { label: "Efficiency %", value: summary.efficiency_pct != null ? `${summary.efficiency_pct}%` : "—" },
      ]
    : [];

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Stack spacing={3}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Typography variant="h4" fontWeight={700}>
            Dashboard
          </Typography>
          <TextField
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {summary && (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" }, gap: 2 }}>
              {statCards.map(({ label, value }) => (
                <Card key={label} variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {label}
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {value}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {chartData.length > 0 && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Hourly parking events
                  </Typography>
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0d47a1" name="Events" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            )}

            {summary.zone_breakdown && summary.zone_breakdown.length > 0 && (
              <Card variant="outlined" sx={{ overflow: "hidden" }}>
                <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                  Target vs actual (zone/device)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "action.hover" }}>
                        <TableCell>Zone / Device</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Actual</TableCell>
                        <TableCell>Efficiency %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.zone_breakdown.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.zone_code ?? row.device_code ?? "—"}</TableCell>
                          <TableCell>{row.target}</TableCell>
                          <TableCell>{row.actual}</TableCell>
                          <TableCell>{row.efficiency_pct?.toFixed(1) ?? "—"}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}

            {devices && devices.length > 0 && (
              <Card variant="outlined" sx={{ overflow: "hidden" }}>
                <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                  Device heartbeat (last seen)
                </Typography>
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Device</TableCell>
                        <TableCell>Zone</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Health</TableCell>
                        <TableCell>Last telemetry</TableCell>
                        <TableCell>Last parking log</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {devices.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell sx={{ fontFamily: "monospace" }}>{d.code}</TableCell>
                          <TableCell>{d.zone_code}</TableCell>
                          <TableCell><StatusChip status={d.status} /></TableCell>
                          <TableCell>{d.health_score ?? "—"}</TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {d.last_telemetry_at ? new Date(d.last_telemetry_at).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {d.last_parking_log_at ? new Date(d.last_parking_log_at).toLocaleString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  <LinkMui component={Link} href="/live" underline="hover">
                    Live monitoring
                  </LinkMui>
                  {" "}(polls every 10s)
                </Typography>
              </Card>
            )}
          </>
        )}

        {!summary && !error && (
          <Typography color="text.secondary">Loading…</Typography>
        )}
      </Stack>
    </Container>
  );
}
