"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui";
import { AuthHero, AuthHeroMobile } from "@/components/AuthHero";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      return;
    }

    // A hard navigation, not router.push(). The auth cookie the browser
    // client just wrote and the next request's middleware read of it can
    // race under Next.js's client-side router — a full page load always
    // sends the fresh cookie with it, so there's nothing to race.
    window.location.href = "/events";
  }

  return (
    <main className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <AuthHero />
      <AuthHeroMobile />

      <div className="flex flex-col justify-center px-6 py-10 sm:px-14 lg:min-h-dvh lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-xl">
          <h1 className="font-serif text-[38px] italic leading-tight sm:text-[44px]">
            {mode === "signin" ? "Welcome back" : "Start your first timeline"}
          </h1>
          <p className="mt-2 text-[16px] text-ink-soft">
            {mode === "signin"
              ? "Sign in to your studio."
              : "For wedding photographers and videographers."}
          </p>

          <form onSubmit={submit} className="mt-10 space-y-5">
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
            <Field label="Password">
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="!h-[3.25rem] !text-[16px]"
              />
            </Field>

            {error && (
              <p className="rounded-md bg-danger-tint px-3.5 py-2.5 text-[14px] text-danger">
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy} className="!h-[3.25rem] w-full !text-[16px]">
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-7 text-[15px] text-ink-soft">
            {mode === "signin" ? "New to Everplan?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-accent-ink hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
