import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ledger", template: "%s · Ledger" },
  description: "A quiet, precise personal and business budget ledger.",
  applicationName: "Ledger",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Ledger" },
  formatDetection: { telephone: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
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
        <Toaster theme="system" position="top-center" />
      </body>
    </html>
  );
}
