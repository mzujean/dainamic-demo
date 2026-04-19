"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Megaphone,
  Users, BarChart3, MessageCircle, Settings, Zap, TrendingUp, Brain
} from "lucide-react";

const NAV = [
  { href: "/",           icon: LayoutDashboard, label: "Overview" },
  { href: "/progress",   icon: TrendingUp,      label: "Progress" },
  { href: "/store",      icon: ShoppingBag,     label: "Store" },
  { href: "/inventory",  icon: Package,         label: "Inventory" },
  { href: "/content",    icon: Megaphone,       label: "Content" },
  { href: "/clients",    icon: Users,           label: "Clients" },
  { href: "/analytics",  icon: BarChart3,       label: "Analytics" },
  { href: "/whatsapp",   icon: MessageCircle,   label: "WhatsApp" },
  { href: "/agents",     icon: Zap,             label: "Agents" },
  { href: "/agents/memory", icon: Brain,           label: "Memory" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 64, minHeight: "100vh",
      background: "rgba(255,255,255,0.03)",
      borderRight: "0.5px solid var(--glass-border)",
      display: "flex", flexDirection: "column",
      alignItems: "center", paddingTop: 20, paddingBottom: 20,
      gap: 4, position: "sticky", top: 0, height: "100vh", flexShrink: 0,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", marginBottom: 20, flexShrink: 0 }}>
        <img src="/logo.jpg" alt="Dainamic" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} title={label} style={{
            width: 40, height: 40, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: active ? "var(--glass-white-hover)" : "transparent",
            border: active ? "0.5px solid var(--glass-border-strong)" : "0.5px solid transparent",
            color: active ? "var(--text-primary)" : "var(--text-tertiary)",
            transition: "all 0.15s", textDecoration: "none",
          }}>
            <Icon size={16} />
          </Link>
        );
      })}

      <div style={{ flex: 1 }} />
      <Link href="/settings" title="Settings" style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", textDecoration: "none" }}>
        <Settings size={16} />
      </Link>
    </aside>
  );
}
