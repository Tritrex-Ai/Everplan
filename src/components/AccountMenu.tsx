"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCircleIcon, Logout01Icon } from "hugeicons-react";

/** The persistent, Gmail-style account control: an avatar that opens a
 * small flat panel with identity, a link to /account, and sign-out. Meant
 * to be mounted on every authenticated screen — the dashboard sidebar (and
 * its mobile header), and the event workspace chrome (desktop + mobile). */
export function AccountMenu({
  fullName,
  email,
  compact = false,
}: {
  fullName: string | null;
  email: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const label = fullName || email;
  const initial = (fullName?.trim()?.[0] || email[0] || "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const avatar = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-accent-strong to-accent-tint text-[14px] font-semibold text-white">
      {initial}
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className={
          compact
            ? "flex items-center rounded-full transition-opacity hover:opacity-80"
            : "flex w-full items-center gap-3 rounded-xl border border-line/50 bg-surface-1 p-3 text-left transition-colors hover:bg-surface-2"
        }
      >
        {avatar}
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{label}</p>
            <p className="truncate text-[12px] text-ink-soft">{email}</p>
          </div>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 w-64 overflow-hidden rounded-xl bg-surface-1 p-1.5 outline outline-1 outline-line/60 ${
            compact ? "right-0 top-full mt-2" : "bottom-full left-0 mb-2"
          }`}
        >
          <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
            {avatar}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ink">{label}</p>
              <p className="truncate text-[12px] text-ink-soft">{email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line/60" />
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium text-ink hover:bg-surface-2"
          >
            <UserCircleIcon size={17} /> Account settings
          </Link>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium text-ink-soft hover:bg-surface-2 hover:text-danger disabled:opacity-50"
          >
            <Logout01Icon size={17} /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
