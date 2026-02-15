"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssessmentIcon from "@mui/icons-material/Assessment";

const navItems = [
  { href: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/live", label: "Live", icon: <LiveTvIcon /> },
  { href: "/alerts", label: "Alerts", icon: <WarningAmberIcon /> },
  { href: "/reports", label: "Reports", icon: <AssessmentIcon /> },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <AppBar position="sticky" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar disableGutters sx={{ px: 2, gap: 1 }}>
        <LocalParkingIcon sx={{ mr: 1, fontSize: 28 }} />
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Smart Parking
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Button
                key={href}
                component={Link}
                href={href}
                startIcon={icon}
                sx={{
                  color: "white",
                  px: 2,
                  ...(isActive && {
                    bgcolor: "rgba(255,255,255,0.15)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                  }),
                }}
              >
                {label}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
