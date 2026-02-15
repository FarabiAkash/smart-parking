"use client";

import { useState, useEffect } from "react";
import { fetchJson, apiUrl } from "../lib/api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import DownloadIcon from "@mui/icons-material/Download";

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
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      format: "csv",
    });
    if (facilityId) params.set("facility", facilityId);
    if (zoneId) params.set("zone", zoneId);
    const url = apiUrl(`/report-csv/?${params}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Download failed (${res.status}): ${text || res.statusText}`);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "usage.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      const msg =
        e.name === "TypeError" && e.message === "Failed to fetch"
          ? "Network error: cannot reach server. Is Django running on http://127.0.0.1:8000? If using proxy, restart Next.js."
          : e.message;
      setError(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Reports & export
        </Typography>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={3}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  type="date"
                  label="Date from"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  type="date"
                  label="Date to"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <FormControl size="small" fullWidth>
                <InputLabel id="facility-label">Facility (optional)</InputLabel>
                <Select
                  labelId="facility-label"
                  value={facilityId}
                  label="Facility (optional)"
                  onChange={(e) => setFacilityId(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {facilities.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel id="zone-label">Zone (optional)</InputLabel>
                <Select
                  labelId="zone-label"
                  value={zoneId}
                  label="Zone (optional)"
                  onChange={(e) => setZoneId(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {zones.map((z) => (
                    <MenuItem key={z.id} value={z.id}>
                      {z.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={downloadCsv}
                disabled={downloading}
              >
                {downloading ? "Downloading…" : "Download CSV"}
              </Button>
              <Typography variant="body2" color="text.secondary">
                CSV only.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
