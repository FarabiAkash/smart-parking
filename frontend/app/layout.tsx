import type { Metadata } from "next";
import ThemeRegistry from "./ThemeRegistry";
import AppNav from "./components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Parking — Monitoring & Alerts",
  description: "Parking device monitoring and alerting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column" }} suppressHydrationWarning>
        <ThemeRegistry>
          <AppNav />
          <main style={{ flex: 1, padding: 24 }}>
            {children}
          </main>
        </ThemeRegistry>
      </body>
    </html>
  );
}
