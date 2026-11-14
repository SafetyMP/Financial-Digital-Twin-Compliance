import { AppShell, consoleUrlsFromEnv } from "@digital-twin/console-shell";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const plex = localFont({
  src: [
    {
      path: "../../../../packages/console-shell/assets/fonts/IBMPlexSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../packages/console-shell/assets/fonts/IBMPlexSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../packages/console-shell/assets/fonts/IBMPlexSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Audit Explorer · Digital Twin",
  description: "Policy & audit · Phase 3 tamper-evident ledger search",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const urls = consoleUrlsFromEnv();
  return (
    <html lang="en" className={plex.className}>
      <body>
        <AppShell activeApp="audit" urls={urls}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
