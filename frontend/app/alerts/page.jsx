"use client";

import { useState, useEffect } from "react";
import { fetchJson, apiUrl } from "../lib/api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
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

  const severityOptions = [
    { value: "", label: "All" },
    { value: "INFO", label: "Info" },
    { value: "WARNING", label: "Warning" },
    { value: "CRITICAL", label: "Critical" },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          Alert management
        </Typography>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="severity-label">Severity</InputLabel>
          <Select
            labelId="severity-label"
            value={severity}
            label="Severity"
            onChange={(e) => setSeverity(e.target.value)}
          >
            {severityOptions.map((opt) => (
              <MenuItem key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
                <TableCell>Severity</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    {error ? "Error loading alerts." : "No active alerts."}
                  </TableCell>
                </TableRow>
              )}
              {alerts.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontFamily: "monospace" }}>{a.device_code ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={a.severity}
                      size="small"
                      color={a.severity === "CRITICAL" ? "error" : a.severity === "WARNING" ? "warning" : "default"}
                    />
                  </TableCell>
                  <TableCell>{a.alert_type}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }} noWrap title={a.message}>
                    {a.message}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.875rem" }}>
                    {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => acknowledge(a.id)}
                    >
                      Acknowledge
                    </Button>
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
