import type { ReactNode } from "react";

export default function PremiumCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`premium-card p-5 ${className}`}>
      {children}
    </div>
  );
}