"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Calendar01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react";

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** A custom-themed calendar dropdown replacing the native <input type="date">
 * — themed via react-day-picker's --rdp-* CSS vars mapped onto the app's own
 * accent tokens, so it follows light/dark automatically. Flat (border only,
 * no shadow), single global focus ring like every other control. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseDateValue(value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2/70 px-3.5 text-left text-[14.5px] text-ink transition-all hover:bg-surface-3/60"
      >
        <Calendar01Icon size={17} className="shrink-0 text-ink-faint" />
        <span className={selected ? "text-ink" : "text-ink-faint"}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 rounded-xl border border-line bg-surface-1 p-2"
          style={
            {
              "--rdp-accent-color": "var(--color-accent)",
              "--rdp-accent-background-color": "var(--color-accent-tint)",
              "--rdp-today-color": "var(--color-accent)",
              "--rdp-day-height": "2.25rem",
              "--rdp-day-width": "2.25rem",
              "--rdp-day_button-height": "2.1rem",
              "--rdp-day_button-width": "2.1rem",
              "--rdp-day_button-border": "none",
              "--rdp-selected-border": "none",
              "--rdp-nav_button-height": "2rem",
              "--rdp-nav_button-width": "2rem",
            } as React.CSSProperties
          }
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) onChange(formatDateValue(d));
              setOpen(false);
            }}
            defaultMonth={selected}
            className="text-ink"
            classNames={{
              day_button: "rounded-full text-[13.5px] hover:bg-surface-2 transition-colors",
              today: "font-semibold",
              selected: "bg-accent! text-white!",
              outside: "text-ink-faint",
              caption_label: "text-[14px] font-semibold text-ink",
              button_previous: "rounded-lg hover:bg-surface-2 text-ink-soft",
              button_next: "rounded-lg hover:bg-surface-2 text-ink-soft",
              weekday: "text-ink-faint text-[12px] font-medium",
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? <ArrowLeft01Icon size={16} /> : <ArrowRight01Icon size={16} />,
            }}
          />
        </div>
      )}
    </div>
  );
}
