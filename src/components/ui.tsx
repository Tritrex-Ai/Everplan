"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Cancel01Icon, EyeIcon, ViewOffIcon } from "hugeicons-react";
import { motion, AnimatePresence } from "framer-motion";

/* ---------------------------------------------------------------------------
   Everplan Elevated UI Component Kit (Inspired by Coordon + Modern OS)
   Dual-mode, Tactile, Animated Bottom Sheets, and Luminous Accents
   --------------------------------------------------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "tonal" | "ghost" | "danger" | "ai";
  size?: "lg" | "md" | "sm";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap active:scale-[0.98] select-none";
  const sizes = {
    lg: "h-12 px-5 text-[15px] font-semibold",
    md: "h-11 px-4 text-[14.5px]",
    sm: "h-8 px-3 text-[13px] rounded-lg",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-accent to-emerald-600 text-white shadow-sm hover:shadow-[0_0_20px_var(--color-accent-glow)] hover:brightness-110",
    tonal:
      "bg-accent-tint text-accent-ink border border-accent/20 hover:bg-accent-tint-strong hover:border-accent/30",
    ghost:
      "text-ink-soft hover:bg-surface-2 hover:text-ink active:bg-surface-3",
    danger:
      "bg-danger-tint text-danger border border-danger/20 hover:bg-danger hover:text-white",
    ai: "bg-gradient-to-r from-purple-600 via-indigo-600 to-accent text-white shadow-md hover:shadow-lg hover:brightness-110",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-xl bg-surface-2/70 px-3.5 text-[14.5px] text-ink border border-line placeholder:text-ink-faint focus:bg-surface-1 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all ${className}`}
      {...props}
    />
  );
}

export function PasswordInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`h-11 w-full rounded-xl bg-surface-2/70 px-3.5 pr-12 text-[14.5px] text-ink border border-line placeholder:text-ink-faint focus:bg-surface-1 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-ink-faint hover:text-ink transition-colors"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={show ? "hide" : "show"}
            initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 30 }}
            transition={{ duration: 0.15 }}
          >
            {show ? <ViewOffIcon size={18} /> : <EyeIcon size={18} />}
          </motion.div>
        </AnimatePresence>
      </button>
    </div>
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl bg-surface-2/70 px-3.5 py-3 text-[14.5px] text-ink border border-line placeholder:text-ink-faint focus:bg-surface-1 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all resize-none ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-11 w-full rounded-xl bg-surface-2/70 px-3 text-[14.5px] text-ink border border-line focus:bg-surface-1 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-[12.5px] text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className = "",
  dot = false,
}: {
  tone?: "neutral" | "accent" | "ok" | "warn" | "danger" | "purple";
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const tones = {
    neutral: "bg-surface-2 text-ink-soft border border-line",
    accent: "bg-accent-tint text-accent-ink border border-accent/20",
    ok: "bg-ok-tint text-ok-ink border border-ok/20",
    warn: "bg-warn-tint text-warn-ink border border-warn/20",
    danger: "bg-danger-tint text-danger border border-danger/20",
    purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  };
  const dotTones = {
    neutral: "bg-ink-faint",
    accent: "bg-accent",
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    purple: "bg-purple-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium tracking-wide ${tones[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]} animate-pulse`}
        />
      )}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Responsive Animated Bottom Sheet / Modal
   On mobile: slides smoothly up from the bottom with top drag handle pill
   On desktop: centered floating dialog with scale + fade animation
   --------------------------------------------------------------------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* Frosted Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Desktop Centered Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="hidden sm:block relative z-10 w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl bg-surface-1 border border-line p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-2 hover:text-ink transition-colors"
              >
                <Cancel01Icon size={16} />
              </button>
            </div>
            {children}
          </motion.div>

          {/* Mobile Animated Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="sm:hidden relative z-10 w-full max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-surface-1 border-t border-line px-5 pt-3 pb-8 shadow-2xl"
          >
            {/* Sheet Handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink-faint/30" />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-faint hover:text-ink transition-colors"
              >
                <Cancel01Icon size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-1 border border-line px-6 py-12 text-center">
      {icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-accent border border-line">
          {icon}
        </div>
      ) : null}
      <p className="text-[18px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-ink-soft leading-relaxed">
        {body}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function FloatingActionButton({
  onClick,
  label,
  icon,
  className = "",
}: {
  onClick: () => void;
  label?: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`fixed bottom-20 right-5 z-40 flex items-center gap-2 h-13 px-4 rounded-full bg-gradient-to-r from-accent to-emerald-600 text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:brightness-110 sm:hidden ${className}`}
    >
      {icon}
      {label && <span className="text-[14px] font-semibold">{label}</span>}
    </motion.button>
  );
}
