import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Middleware runs on nearly every request, including public routes like the
// landing page and /login itself. Without a timeout, a Supabase hiccup (DNS,
// network partition, an outage) leaves getUser() hanging until Vercel's own
// hard function timeout kills it — a bare 504 for the entire site instead of
// a real page. This isn't the actual security boundary anyway (every
// protected page does its own getUser() check, and RLS enforces access at
// the database level regardless) — it only exists to fast-path redirects —
// so on a timeout we fail open and let the request through; the real checks
// downstream still apply.
const AUTH_CHECK_TIMEOUT_MS = 5000;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // undefined = couldn't verify in time (timeout or error) — distinct from
  // null, which means Supabase actually confirmed no session.
  let user: { id: string } | null | undefined;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("auth check timed out")), AUTH_CHECK_TIMEOUT_MS)
      ),
    ]);
    user = result.data.user;
  } catch {
    user = undefined;
  }

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login";
  const isProtected =
    path.startsWith("/events") ||
    path.startsWith("/api") ||
    path.startsWith("/account") ||
    path.startsWith("/onboarding");

  if (user === null && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/events";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
