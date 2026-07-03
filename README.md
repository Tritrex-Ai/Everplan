# Everplan — prototype

A real-time timeline for events, built for wedding photographers. Create an
event, generate or hand-build its timeline, keep a **private** shot list
against each block, and on the day run a live Now/Next/Later board that the
whole team sees update in real time.

**Stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase (auth, Postgres,
realtime, RLS) · Claude API (AI timeline builder).

## Run it locally

Prereqs: Node 20+, Docker Desktop, the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install

# 1. Start the local Supabase stack (applies migrations automatically)
supabase start

# 2. Configure env — copy the anon key printed by `supabase status`
cp .env.example .env.local
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from `supabase status`>
#    ANTHROPIC_API_KEY=<your key>   ← needed only for the AI builder

# 3. Run the app
npm run dev
```

Open http://localhost:3000, create an account (no email confirmation locally),
and you're in.

**Try the realtime board:** open the same event's **Live** tab in two browser
windows (or your phone on the same network), check a shot off in one — it
flips in the other within a couple of seconds.

**Try the team view:** invite a second email from the event's `⋯ → Invite team
member` menu, then sign up with that email in a private window. The team
member sees the timeline and live board, but only the shots you've shared.

## Deploying

1. Create a project at [supabase.com](https://supabase.com), then push the schema:
   `supabase link --project-ref <ref> && supabase db push`
2. Deploy to Vercel (or any Node host) with these env vars:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`
3. In the Supabase dashboard → Auth, disable "Confirm email" for
   frictionless prototype signups (or keep it on and configure SMTP).

## Where things live

| Thing | Where |
|---|---|
| Schema, RLS, privacy enforcement | `supabase/migrations/20260703000000_init.sql` |
| AI builder prompt (tune me) | `src/lib/ai/timeline-prompt.ts` |
| AI builder endpoint | `src/app/api/generate-timeline/route.ts` |
| Design tokens (colors, flat/no-shadow system) | `src/app/globals.css` |
| Live board (the screen that matters) | `src/components/LiveBoard.tsx` |
| Now/Next/Later clock logic | `src/lib/time.ts` |

## Decisions worth knowing about

- **Shot-list privacy is enforced in Postgres, not the UI.** RLS on `shots`:
  private shots are visible only to the event owner; members only ever receive
  rows with `visibility = 'shared'`. A trigger stops non-owners from changing
  a shot's visibility. Realtime respects the same policies, so private shots
  never reach a team member's device.
- **Blocks are time-ranged** (`start_time`/`end_time` timestamps, plus a
  `position` for manual ordering) so the future guest-photo feature can line
  photos up to the timeline without a rebuild. The `event_images` table
  already tags every upload with `event_id` + `captured_at` for the same
  reason.
- **Roles beyond owner/team** (coordinator, couple) exist in the data model
  (`member_role` enum) but have no screens yet — per the brief.
- **The AI builder returns structured JSON** (Claude structured outputs with a
  JSON schema), validated with zod before it touches the UI. Generic wedding
  pacing only; no hard-coded cultural logic.
- **Not built on purpose:** guest uploads/QR/galleries, posing tools, billing,
  coordinator/couple screens, deep cultural timeline logic, offline mode,
  native apps, 2FA, analytics, integrations.
