"use client";

import { useState, useEffect, useRef } from "react";
import { fetchJson } from "../lib/api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
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
import SearchIcon from "@mui/icons-material/Search";

const POLL_MS = 10000;

function StatusChip({ status }) {
  const severity = status === "CRITICAL" ? "error" : status === "WARNING" ? "warning" : "success";
  return <Chip label={status} color={severity} size="small" />;
}

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
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Typography variant="h4" fontWeight={700}>
            Live monitoring
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Refreshes every 10 seconds
          </Typography>
        </Box>

        <TextField
          placeholder="Device, zone, facility..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ maxWidth: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell>Device</TableCell>
                <TableCell>Zone</TableCell>
                <TableCell>Facility</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Health</TableCell>
                <TableCell>Last telemetry</TableCell>
                <TableCell>Last parking log</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    {devices.length === 0
                      ? error
                        ? "Error loading devices."
                        : "Loading…"
                      : "No devices match search."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontFamily: "monospace" }}>{d.code}</TableCell>
                  <TableCell>{d.zone_code}</TableCell>
                  <TableCell>{d.facility_name}</TableCell>
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
      </Stack>
    </Container>
  );
}
