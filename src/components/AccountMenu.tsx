"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCircleIcon, Logout01Icon } from "hugeicons-react";
import { motion, AnimatePresence } from "framer-motion";

/** The persistent, modern account control: an avatar that opens an
 * animated glass panel with user identity, a link to /account, and sign-out. */
export function AccountMenu({
  fullName,
  email,
  compact = false,
  avatarUrl: initialAvatarUrl,
}: {
  fullName: string | null;
  email: string;
  compact?: boolean;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [fetchedAvatarUrl, setFetchedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = initialAvatarUrl !== undefined ? initialAvatarUrl : fetchedAvatarUrl;
  const rootRef = useRef<HTMLDivElement>(null);

  const label = fullName || email;
  const initial = (fullName?.trim()?.[0] || email[0] || "?").toUpperCase();

  useEffect(() => {
    if (initialAvatarUrl !== undefined) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const url = data.user?.user_metadata?.avatar_url;
      if (url) setFetchedAvatarUrl(url);
    });
  }, [initialAvatarUrl]);

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

  const renderAvatar = (dimClass = "h-9 w-9") => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={label}
          className={`${dimClass} shrink-0 rounded-full border-2 border-surface-0 bg-surface-2 object-cover shadow-sm`}
        />
      );
    }
    return (
      <div
        className={`${dimClass} shrink-0 rounded-full border-2 border-surface-0 bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center text-white font-semibold text-[13.5px] shadow-sm`}
      >
        {initial}
      </div>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className={
          compact
            ? "flex items-center rounded-full transition-transform active:scale-95 hover:opacity-90"
            : "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-all hover:bg-surface-2 active:scale-[0.99]"
        }
      >
        {renderAvatar(compact ? "h-8.5 w-8.5" : "h-9 w-9")}
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink leading-tight">{label}</p>
            <p className="truncate text-[12px] text-ink-soft leading-tight mt-0.5">{email}</p>
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: compact ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: compact ? 6 : -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 w-64 overflow-hidden rounded-2xl bg-surface-1/95 p-2 shadow-2xl backdrop-blur-xl border border-line/80 ${
              compact ? "right-0 top-full mt-2" : "bottom-full left-0 mb-2"
            }`}
          >
            <div className="flex items-center gap-3 rounded-xl bg-surface-2/60 p-2.5">
              {renderAvatar("h-9 w-9")}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink leading-tight">{label}</p>
                <p className="truncate text-[11.5px] text-ink-soft leading-tight mt-0.5">{email}</p>
              </div>
            </div>
            <div className="my-1.5 h-px bg-line/60" />
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-2 active:bg-surface-3"
            >
              <UserCircleIcon size={18} className="text-accent" /> Account settings
            </Link>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-danger-tint hover:text-danger disabled:opacity-50 active:scale-[0.99]"
            >
              <Logout01Icon size={18} /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
