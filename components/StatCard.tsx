import { ReactNode } from "react";
import Card from "./Card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  accent?: string;
  icon?: ReactNode;
  glow?: "purple" | "blue" | "teal" | "none";
}

export default function StatCard({ label, value, change, trend = "neutral", accent, icon, glow = "none" }: StatCardProps) {
  const trendColour = trend === "up" ? "var(--accent-green)" : trend === "down" ? "var(--accent-red)" : "var(--text-tertiary)";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Card glow={glow} padding="18px 20px">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
        {icon && (
          <div style={{ color: accent || "var(--text-tertiary)", opacity: 0.7 }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1, color: accent || "var(--text-primary)", marginBottom: 10 }}>
        {value}
      </div>
      {change && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: trendColour }}>
          <TrendIcon size={12} />
          <span>{change}</span>
        </div>
      )}
    </Card>
  );
}
