import type { Metadata, Viewport } from "next";

import { PwaRuntime } from "@/features/notifications/components/pwa-runtime";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Lingora",
  title: {
    default: "Lingora",
    template: "%s | Lingora",
  },
  description: "Nền tảng học ngôn ngữ hiện đại, tập trung và dễ tiếp cận.",
  appleWebApp: {
    capable: true,
    title: "Lingora",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "48x48" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#118568",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">
        <PwaRuntime />
        {children}
      </body>
    </html>
  );
}
