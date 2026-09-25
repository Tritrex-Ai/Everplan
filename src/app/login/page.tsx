"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, PasswordInput } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { AuthHero, AuthHeroMobile } from "@/components/AuthHero";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setResetSent(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

    if (result.error) {
      setError(result.error.message);
      setBusy(false);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // The browser client writes the session to a cookie via an internal
    // onAuthStateChange listener that isn't guaranteed to have finished by
    // the time signInWithPassword's promise resolves. Navigating before it
    // lands means the middleware's next request reads no session and
    // bounces back to /login. Poll for the cookie itself — the exact thing
    // the middleware depends on — before doing a hard navigation (a full
    // page load, not router.push(), so the fresh cookie always rides along
    // with the request instead of relying on Next.js's client router).
    const hasAuthCookie = () => /(?:^|; )sb-[^=]+-auth-token=/.test(document.cookie);
    for (let i = 0; i < 40 && !hasAuthCookie(); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    window.location.href = "/events";
  }

  return (
    <main className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <AuthHero />
      <AuthHeroMobile />

      <div className="relative flex flex-col justify-center px-8 py-12 sm:px-16 lg:min-h-dvh lg:px-20 xl:px-28 bg-surface-0 z-10">
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]"></div>
        
        <div className="relative z-10 mx-auto w-full max-w-lg lg:mx-0 lg:max-w-xl">
          <h1 className="font-serif text-[42px] italic leading-tight sm:text-[48px] text-ink">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Start your first timeline" : "Reset your password"}
          </h1>
          <p className="mt-2 text-[17px] text-ink-soft max-w-[340px]">
            {mode === "signin"
              ? "Sign in to your studio. For wedding photographers and videographers."
              : mode === "signup"
                ? "For wedding photographers and videographers."
                : resetSent
                  ? "Check your inbox for a link to set a new password."
                  : "We'll email you a link to set a new password."}
          </p>

          {mode === "forgot" ? (
            resetSent ? (
              <div className="mt-12">
                <p className="rounded-md bg-ok-tint px-4 py-3 text-[14px] text-ok-ink">
                  Sent to {email}. It can take a minute to arrive — check spam too.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setResetSent(false);
                    setMode("signin");
                  }}
                  className="mt-6 text-[15px] font-medium text-accent-ink hover:text-accent-strong hover:underline transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <motion.form
                onSubmit={submitForgot}
                className="mt-12 space-y-6"
                animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Field label="Email">
                  <Input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    autoComplete="email"
                    className="!h-[3.25rem] !text-[16px]"
                  />
                </Field>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="rounded-md bg-danger-tint border border-danger/20 px-4 py-3 text-[14px] text-danger shadow-sm">
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" disabled={busy} className="!h-[3.25rem] w-full !text-[16px]">
                  {busy ? "Sending…" : "Send reset link"}
                </Button>
              </motion.form>
            )
          ) : (
            <motion.form
              onSubmit={submit}
              className="mt-12 space-y-6"
              animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {mode === "signup" && (
                <Field label="Your name">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ade Balogun"
                    autoComplete="name"
                    className="!h-[3.25rem] !text-[16px]"
                  />
                </Field>
              )}
              <Field label="Email">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  autoComplete="email"
                  className="!h-[3.25rem] !text-[16px]"
                />
              </Field>
              <div className="space-y-2">
                <Field label="Password">
                  <PasswordInput
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="!h-[3.25rem] !text-[16px]"
                  />
                </Field>
                {mode === "signin" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetSent(false);
                        setMode("forgot");
                      }}
                      className="text-[13px] font-medium text-ink-soft hover:text-accent-ink transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="rounded-md bg-danger-tint border border-danger/20 px-4 py-3 text-[14px] text-danger shadow-sm">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" disabled={busy} className="!h-[3.25rem] w-full !text-[16px]">
                {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </motion.form>
          )}

          {mode === "forgot" ? (
            !resetSent && (
              <p className="mt-8 text-[15px] text-ink-soft">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("signin");
                  }}
                  className="font-medium text-accent-ink hover:text-accent-strong hover:underline transition-colors"
                >
                  Back to sign in
                </button>
              </p>
            )
          ) : (
            <p className="mt-8 text-[15px] text-ink-soft">
              {mode === "signin" ? "New to Everplan?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
                className="font-medium text-accent-ink hover:text-accent-strong hover:underline transition-colors"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
