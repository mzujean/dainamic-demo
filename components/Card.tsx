import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  glow?: "purple" | "blue" | "teal" | "none";
  padding?: string | number;
  onClick?: () => void;
}

export default function Card({ children, style, className, glow = "none", padding = "20px", onClick }: CardProps) {
  const glowMap = {
    purple: "0 0 24px rgba(167,139,250,0.12)",
    blue:   "0 0 24px rgba(96,165,250,0.12)",
    teal:   "0 0 24px rgba(45,212,191,0.12)",
    none:   "none",
  };
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "var(--glass-white)",
        border: "0.5px solid var(--glass-border)",
        borderRadius: "var(--r-lg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        padding,
        boxShadow: glowMap[glow],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
