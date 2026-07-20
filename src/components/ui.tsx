"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Cancel01Icon, EyeIcon, ViewOffIcon } from "hugeicons-react";
import { motion, AnimatePresence } from "framer-motion";

/* Flat component kit: tonal surfaces, no shadows, hairlines only when a tone
   shift can't do the job. One accent. */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "tonal" | "ghost" | "danger";
  size?: "md" | "sm";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
  const sizes = {
    md: "h-11 px-4 text-[15px]",
    sm: "h-8 px-3 text-[13px]",
  };
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-strong active:bg-accent-strong",
    tonal:
      "bg-accent-tint text-accent-ink hover:bg-accent-tint-strong active:bg-accent-tint-strong",
    ghost: "text-ink-soft hover:bg-surface-2 active:bg-surface-3",
    danger: "bg-danger-tint text-danger hover:bg-danger hover:text-white",
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
      className={`h-11 w-full rounded-md bg-gradient-to-b from-surface-2 to-surface-1 px-3.5 text-[15px] text-ink shadow-inner placeholder:text-ink-faint focus:bg-surface-1 focus:outline-2 focus:outline-accent transition-all ${className}`}
      {...props}
    />
  );
}

export function PasswordInput({
  className = "",
  onDrag,
  onDragStart,
  onDragEnd,
  onAnimationStart,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <motion.input
        type={show ? "text" : "password"}
        initial={false}
        animate={{ filter: show ? ["blur(4px)", "blur(0px)"] : ["blur(4px)", "blur(0px)"] }}
        transition={{ duration: 0.2 }}
        className={`h-11 w-full rounded-md bg-gradient-to-b from-surface-2 to-surface-1 px-3.5 pr-12 text-[15px] text-ink shadow-inner placeholder:text-ink-faint focus:bg-surface-1 focus:outline-2 focus:outline-accent transition-all ${className}`}
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
            initial={{ opacity: 0, scale: 0.8, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 45 }}
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
      className={`w-full rounded-md bg-surface-2 px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:bg-surface-1 focus:outline-2 focus:outline-accent transition-colors resize-none ${className}`}
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
      className={`h-11 w-full rounded-md bg-surface-2 px-3 text-[15px] text-ink focus:outline-2 focus:outline-accent ${className}`}
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
      <span className="mb-1.5 block text-[13px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[13px] text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: "neutral" | "accent" | "ok" | "warn" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-ink-soft",
    accent: "bg-accent-tint text-accent-ink",
    ok: "bg-ok-tint text-ok-ink",
    warn: "bg-warn-tint text-warn-ink",
    danger: "bg-danger-tint text-danger",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-h-[92dvh] overflow-y-auto rounded-t-xl bg-surface-1 p-5 sm:max-w-md sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            <Cancel01Icon size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
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
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface-1 px-6 py-12 text-center">
      <p className="font-serif text-[19px] italic">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-ink-soft">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
