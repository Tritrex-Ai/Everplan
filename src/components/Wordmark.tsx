"use client";

import { EverplanLogo } from "./EverplanLogo";

/** The Everplan logotype: iconic mark paired with clean modern typography */
export function Wordmark({
  size = "md",
  tone = "ink",
  className = "",
  showIcon = true,
}: {
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "light";
  className?: string;
  showIcon?: boolean;
}) {
  const textSizes = {
    sm: "text-[18px]",
    md: "text-[21px]",
    lg: "text-[28px] sm:text-[32px]",
  };
  const iconSizes = {
    sm: 24,
    md: 30,
    lg: 40,
  };
  const tones = { ink: "text-ink", light: "text-white" };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {showIcon && <EverplanLogo size={iconSizes[size]} />}
      <span
        className={`font-sans font-bold tracking-tight ${textSizes[size]} ${tones[tone]}`}
      >
        Everplan
      </span>
    </div>
  );
}
