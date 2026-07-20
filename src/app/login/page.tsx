"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, PasswordInput } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { AuthHero, AuthHeroMobile } from "@/components/AuthHero";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

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

      <div className="relative flex flex-col justify-center px-8 py-12 sm:px-16 lg:min-h-dvh lg:px-20 xl:px-28 bg-surface-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] z-10">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]"></div>
        
        <div className="relative z-10 mx-auto w-full max-w-lg lg:mx-0 lg:max-w-xl">
          <h1 className="font-serif text-[42px] italic leading-tight sm:text-[48px] text-ink">
            {mode === "signin" ? "Welcome back" : "Start your first timeline"}
          </h1>
          <p className="mt-2 text-[17px] text-ink-soft max-w-[340px]">
            {mode === "signin"
              ? "Sign in to your studio. For wedding photographers and videographers."
              : "For wedding photographers and videographers."}
          </p>

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
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Forgot password flow coming soon.");
                    }}
                    className="text-[13px] font-medium text-ink-soft hover:text-accent-ink transition-colors"
                  >
                    Forgot your password?
                  </a>
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
        </div>
      </div>
    </main>
  );
}
