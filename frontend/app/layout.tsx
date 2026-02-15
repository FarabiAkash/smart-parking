import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <nav className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-4">
          <Link href="/" className="font-semibold text-foreground hover:underline">
            Dashboard
          </Link>
          <Link href="/live" className="text-foreground hover:underline">
            Live
          </Link>
          <Link href="/alerts" className="text-foreground hover:underline">
            Alerts
          </Link>
          <Link href="/reports" className="text-foreground hover:underline">
            Reports
          </Link>
        </nav>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
