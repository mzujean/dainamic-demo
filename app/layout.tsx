import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AgentOSProvider from "@/components/AgentOSProvider";

export const metadata: Metadata = {
  title: "Dainamic Hair - Business OS",
  description: "Your hair business, fully automated",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dainamic",
  },
  icons: {
    icon: "/dainamic-logo-2.png",
    apple: "/dainamic-logo-2.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/dainamic-logo-2.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          <AgentOSProvider>
            {children}
          </AgentOSProvider>
        </main>
      </body>
    </html>
  );
}