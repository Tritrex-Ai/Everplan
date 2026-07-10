"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { Button, Modal } from "@/components/ui";

export function GuestLinkDialog({
  eventId,
  guestToken,
  open,
  onClose,
  onTokenChange,
}: {
  eventId: string;
  guestToken: string | null;
  open: boolean;
  onClose: () => void;
  onTokenChange: (token: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const link =
    guestToken && typeof window !== "undefined"
      ? `${window.location.origin}/g/${guestToken}`
      : null;

  useEffect(() => {
    if (!link) {
      queueMicrotask(() => setQrDataUrl(null));
      return;
    }
    QRCode.toDataURL(link, { width: 240, margin: 1 }).then(setQrDataUrl);
  }, [link]);

  async function enable() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("events")
      .update({ guest_token: token })
      .eq("id", eventId);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onTokenChange(token);
  }

  async function disable() {
    if (!confirm("Disable the guest link? The current QR code and link will stop working.")) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ guest_token: null })
      .eq("id", eventId);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onTokenChange(null);
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Guest link">
      {!guestToken ? (
        <div>
          <p className="text-[14px] leading-relaxed text-ink-soft">
            Turn on a no-login link guests can scan or open to see the live
            timeline — Now/Next/Later only. They never see your shot list,
            private or shared.
          </p>
          {error && (
            <p className="mt-3 rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button onClick={enable} disabled={busy} className="mt-4 w-full">
            {busy ? "Enabling…" : "Enable guest link"}
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-[14px] leading-relaxed text-ink-soft">
            Anyone with this link or QR code can view the live timeline —
            no account needed. Only blocks you&apos;ve marked visible to
            guests will show up here. Turn it off any time.
          </p>

          {qrDataUrl && (
            <div className="mt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Guest link QR code"
                className="h-48 w-48 rounded-lg bg-white p-2"
              />
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">
              {link}
            </span>
            <button
              onClick={copyLink}
              className="shrink-0 text-[13px] font-medium text-accent-ink hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}

          <Button
            onClick={disable}
            disabled={busy}
            variant="danger"
            className="mt-4 w-full"
          >
            {busy ? "Disabling…" : "Disable guest link"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
