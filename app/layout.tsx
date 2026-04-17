import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AgentOSProvider from "@/components/AgentOSProvider";

export const metadata: Metadata = {
  title: "Dainamic Hair - Business OS",
  description: "Your hair business, fully automated",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
