"use client";

import { useId } from "react";

export function EverplanLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // Each instance needs its own gradient id — Wordmark renders more than
  // once at a time (e.g. desktop sidebar + CSS-hidden mobile header), and
  // duplicate SVG ids across simultaneous instances is a classic cause of a
  // blank/invisible logo in some browsers.
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Rich Royal Purple & Indigo Gradient */}
        <linearGradient
          id={gradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Emblem */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill={`url(#${gradientId})`}
      />

      {/* Stylized Modern 'E' + Timeline Aperture Track */}
      {/* Top timeline bar with rounded cap */}
      <path
        d="M12 13H26C27.1046 13 28 13.8954 28 15C28 16.1046 27.1046 17 26 17H12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Middle timeline bar with aperture spark */}
      <path
        d="M12 20H22C22.8 20 23.5 20.7 23.5 21.5C23.5 22.3 22.8 23 22 23H12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Bottom timeline bar */}
      <path
        d="M12 27H27C27.8 27 28.5 27.7 28.5 28.5C28.5 29.3 27.8 30 27 30H12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Vertical spine of the E */}
      <path
        d="M12 13V30"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
      />

      {/* Camera Aperture / Event Spark Node on middle bar */}
      <circle cx="26.5" cy="21.5" r="2.25" fill="#facc15" />
    </svg>
  );
}
