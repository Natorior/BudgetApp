import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ledger", template: "%s · Ledger" },
  description: "A quiet, precise personal and business budget ledger.",
  applicationName: "Ledger",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Ledger" },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], shortcut: "/favicon.svg", apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  openGraph: { title: "Ledger Budget", description: "A quiet, precise personal and business budget ledger.", type: "website", images: [{ url: "/og-ledger.png", width: 1200, height: 630, alt: "Abstract private ledger statement" }] },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#101318" },
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <PwaRegistration />
        <Toaster theme="system" position="top-center" />
      </body>
    </html>
  );
}
