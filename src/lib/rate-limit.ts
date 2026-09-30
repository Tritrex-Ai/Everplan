import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by a single Postgres table + RPC (see
 * `check_rate_limit` in the migrations) — no external cache needed at
 * Everplan's current scale. Returns true if the call is allowed.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("checkRateLimit failed", error);
    return true; // fail open — a limiter outage shouldn't take the app down
  }
  return data === true;
}
