"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, PasswordInput, Spinner } from "@/components/ui";
import { AuthHero, AuthHeroMobile } from "@/components/AuthHero";

export default function ResetPasswordPage() {
  // getSession() awaits the client's own init, which is what exchanges the
  // recovery link's code for a session — by the time it resolves, "valid"
  // reflects reality: a real recovery session, or a dead/expired link.
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setValid(Boolean(data.session));
      setReady(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    setDone(true);
    setTimeout(() => {
      window.location.href = "/events";
    }, 1200);
  }

  return (
    <main className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <AuthHero />
      <AuthHeroMobile />

      <div className="relative flex flex-col justify-center px-8 py-12 sm:px-16 lg:min-h-dvh lg:px-20 xl:px-28 bg-surface-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] z-10">
        <div className="relative z-10 mx-auto w-full max-w-lg lg:mx-0 lg:max-w-xl">
          {!ready ? (
            <div className="flex items-center gap-2 text-ink-soft">
              <Spinner /> Checking your link…
            </div>
          ) : !valid ? (
            <>
              <h1 className="font-serif text-[42px] italic leading-tight sm:text-[48px] text-ink">
                Link expired
              </h1>
              <p className="mt-2 text-[17px] text-ink-soft max-w-[340px]">
                This reset link is invalid or has already been used.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-block text-[15px] font-medium text-accent-ink hover:text-accent-strong hover:underline transition-colors"
              >
                Back to sign in
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="font-serif text-[42px] italic leading-tight sm:text-[48px] text-ink">
                Password updated
              </h1>
              <p className="mt-2 text-[17px] text-ink-soft max-w-[340px]">
                Taking you to your events…
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-[42px] italic leading-tight sm:text-[48px] text-ink">
                Set a new password
              </h1>
              <p className="mt-2 text-[17px] text-ink-soft max-w-[340px]">
                Choose something you haven&apos;t used before.
              </p>

              <form onSubmit={submit} className="mt-12 space-y-6">
                <Field label="New password">
                  <PasswordInput
                    required
                    autoFocus
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="!h-[3.25rem] !text-[16px]"
                  />
                </Field>
                <Field label="Confirm password">
                  <PasswordInput
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="!h-[3.25rem] !text-[16px]"
                  />
                </Field>

                {error && (
                  <p className="rounded-md bg-danger-tint border border-danger/20 px-4 py-3 text-[14px] text-danger shadow-sm">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={busy} className="!h-[3.25rem] w-full !text-[16px]">
                  {busy ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
