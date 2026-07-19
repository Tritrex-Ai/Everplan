# Everplan — prototype

A real-time timeline for events, built for wedding photographers. Create an
event, generate or hand-build its timeline, keep a **private** shot list
against each block, invite your team (and clients, and vendors) with the
right permissions, and on the day run a live Now/Next/Later board that
everyone sees update in real time — plus a no-login link guests can open
themselves.

**Stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase (auth, Postgres,
realtime, RLS) · Claude API (AI timeline builder).

## The flow, end to end

This is what actually happens for a new user, start to finish — useful for
testing, demoing, or just remembering how the pieces connect.

1. **Sign up** at `/login` (email + password, no confirmation email required
   in this prototype). First thing after signing up, every new account lands
   on `/onboarding` — a two-step "Who are you?" wizard (`src/app/onboarding/page.tsx`,
   `src/components/OnboardingFlow.tsx`). It's mandatory: you cannot reach the
   dashboard without answering it (enforced server-side in `/events`, not just
   a UI step you can skip past).
   - Pick **Photographer**, **Videographer**, **Wedding planner**, or
     **Couple**.
   - Photographer/Videographer/Wedding planner get one more question: **Solo**
     or **Team**. Couple skips straight through — team size doesn't apply.
   - This is purely descriptive (`profiles.professions`, `profiles.team_size`)
     — nothing about it gates features today. Editable later from `/account`.
2. **Land on `/events`.** Empty state prompts you to create your first event.
3. **Create an event** (`/events/new`) — title, type, date, location, couple
   names, guest count, coverage needed (photo/video/both). Submitting takes
   you straight into the **AI builder** (`/events/[id]/generate`): describe
   the day in plain language, Claude drafts a full timeline you can accept,
   tweak, or throw out and build by hand instead.
4. **Build the timeline** (the event's default/"Timeline" tab,
   `src/components/TimelineEditor.tsx`) — blocks with a title, start/end
   time, location, and notes. Drag to reorder. Two things live per block:
   - **Guest visibility (the eye icon 👁)** — see "Guest link & per-block
     visibility" below. This is the single most support-relevant control in
     the app; read that section if anything about it looks wrong.
   - Nothing else is gated here — any owner or team member can add/edit
     blocks.
5. **Build the shot list** (Shots tab, `src/components/ShotsPanel.tsx`) —
   shots attach to a block, each with a title, priority, and a **time budget**
   in minutes (defaults to 5). Each block header shows a running "X of Y min
   planned" total that turns amber, passively, once the block's shots add up
   to more than the block's own duration — never a popup, never blocks
   saving. Shots also carry a **visibility**: private (only you) or shared
   (your team can see and check it off too). Toggling a shot's capture status
   greys it out with a strikethrough — this is the "checklist" feature: it
   lives on the **Live** tab (see step 7), not the Timeline tab, since it's a
   day-of action, not a planning one.
6. **Invite people** (event menu → **Invite team member**) with a role:
   - **Team** — full write access to blocks and shots, same as the owner
     except they can only edit/delete shots they created themselves (or that
     are shared with them).
   - **Client** — read-only. Sees the timeline and live board, never the shot
     list.
   - **Vendor / Coordinator / Couple** — same read-only tier as Client today;
     kept as separate DB values for labeling, not separate permissions yet.

   Permissions are enforced by Postgres RLS, not hidden UI — a read-only
   member hitting the write API directly gets rejected by the database, not
   just an app that declines to show them a button.
7. **Run the day** — the **Live** tab (`src/components/LiveBoard.tsx`, full-
   bleed dark screen, meant for a phone in hand) shows Now / Next / Later,
   updating in real time across every device open to it. This is where
   **mark as complete** actually lives: tap a shot to check it off (greys out,
   strikethrough), or tap **Done** / **Running late** on the current block.
   Read-only viewers see the same board with no write controls.
8. **Share with guests** — from the event menu, **Guest link** generates a
   no-login URL (`/g/<token>`) and QR code. Guests never see the shot list,
   ever — only blocks, and only the ones marked visible to guests (see next
   section). Turning the link off invalidates it immediately.
9. **Preview as…** — event owners get a simulator (top of the event chrome)
   to view the event exactly as a Team member or a read-only viewer would see
   it, without actually changing anyone's role. Useful for checking "what
   does my client actually see" before sending an invite.

## Guest link & per-block visibility (read this if the eye icon looks broken)

Every block has a `guest_visible` flag, default **on**. The eye icon next to
each block in the Timeline tab toggles it:

- **Open eye** = this block shows up on the guest link/QR code.
- **Crossed-out eye** = hidden from guests — owner and team still see it on
  their own Timeline/Live tabs, but it's invisible on `/g/<token>`.

**Important:** this only controls what a genuine, logged-out guest sees. If
you (the owner) or a team member open the guest link **while still logged
in**, you are not "a guest" as far as the database is concerned — you're an
authenticated member of the event, and your own account's broader
view-permissions apply on top of whatever the guest link shows. The cleanest
way to check the guest link's actual behavior is to open it in an incognito/
private window (or a different browser entirely) where you are not signed in
at all — that's the only way to see exactly what a real guest sees.

(As of this fix, `src/app/g/[token]/page.tsx` also explicitly filters
`guest_visible = true` on the query itself, rather than relying only on RLS —
so this now holds regardless of who's viewing.)

## Roles, at a glance

| DB role (`members.role`) | Viewer tier (`ViewerRole`) | Can write blocks/shots? | Sees shot list? |
|---|---|---|---|
| owner | owner | yes, everything | yes, everything |
| team | team | yes (own shots fully; shared shots' status) | yes — own + shared |
| client | readonly | no | never |
| vendor / coordinator / couple | readonly | no | never |

`src/lib/roles.ts` is the single source of truth for these rules on the
client; `supabase/migrations/*.sql` is the source of truth in the database —
the client-side checks exist only to shape the UI, RLS is what actually
enforces them.

## Run it locally

Prereqs: Node 20+, the [Supabase CLI](https://supabase.com/docs/guides/cli).
This project runs against a **hosted** Supabase project (no Docker required).

```bash
npm install

# 1. Create a project at supabase.com, then push the schema + auth config:
supabase link --project-ref <ref>
supabase db push
supabase config push   # disables required email confirmation for this prototype

# 2. Configure env — from Project Settings -> API
cp .env.example .env.local
#    NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
#    ANTHROPIC_API_KEY=<your key>   ← needed only for the AI builder

# 3. Run the app
npm run dev
```

Open http://localhost:3000, create an account (no email confirmation needed —
`config.toml` sets `enable_confirmations = false`), and you're in.

**Try the realtime board:** open the same event's **Live** tab in two browser
windows (or your phone on the same network), check a shot off in one — it
flips in the other within a couple of seconds.

**Try the team view:** invite a second email from the event's `⋯ → Invite team
member` menu, then sign up with that email in a private window. The team
member sees the timeline and live board, but only the shots you've shared.

**Try the guest link:** enable it from the event menu, open the link in an
incognito window, then toggle a block's eye icon in the owner's window — the
incognito guest view updates live within a couple of seconds.

## Deploying

1. Deploy to Vercel (or any Node host) with these env vars:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`
2. Before going beyond a prototype audience, re-enable "Confirm email" in the
   Supabase dashboard → Auth and configure SMTP.

## Where things live

| Thing | Where |
|---|---|
| Schema, RLS, privacy enforcement | `supabase/migrations/*.sql` |
| Role/permission rules (client-side mirror of RLS) | `src/lib/roles.ts` |
| Onboarding wizard | `src/app/onboarding/page.tsx`, `src/components/OnboardingFlow.tsx` |
| AI builder prompt (tune me) | `src/lib/ai/timeline-prompt.ts` |
| AI builder endpoint | `src/app/api/generate-timeline/route.ts` |
| Design tokens (colors, flat/no-shadow system) | `src/app/globals.css` |
| Timeline editor (blocks, guest-visibility eye icon) | `src/components/TimelineEditor.tsx` |
| Live board (the screen that matters on the day) | `src/components/LiveBoard.tsx` |
| Guest-facing live board (`/g/[token]`) | `src/components/GuestLiveBoard.tsx`, `src/app/g/[token]/page.tsx` |
| Now/Next/Later clock logic | `src/lib/time.ts` |

## Decisions worth knowing about

- **Shot-list privacy is enforced in Postgres, not the UI.** RLS on `shots`:
  private shots are visible only to the event owner (and whoever created
  them); other members only ever receive rows with `visibility = 'shared'`.
  A trigger stops non-owners/non-creators from changing a shot's visibility
  or other protected columns. Realtime respects the same policies, so
  private shots never reach another member's device.
- **Guest visibility is enforced at the query level, not just RLS**, because
  RLS on `blocks` is permissive across multiple policies — an authenticated
  member's own "can view blocks" policy has no `guest_visible` check (it
  doesn't need one; it's for the Timeline/Live tabs). The guest page adds its
  own explicit `.eq("guest_visible", true)` filter so it can never depend on
  which policy happened to grant the row.
- **The `events` table's own SELECT policy avoids self-referencing `events`.**
  An earlier version checked membership via a function that re-queried
  `events` from within itself; that broke every `INSERT ... RETURNING` (which
  PostgREST/supabase-js always use) because Postgres's command-counter
  visibility means a row can't see itself via a sub-query within the same
  command. Fixed in `20260704000000_fix_events_self_reference.sql` — the
  owner check is now a direct column comparison on the row in hand.
- **Blocks are time-ranged** (`start_time`/`end_time` timestamps, plus a
  `position` for manual ordering) so the future guest-photo feature can line
  photos up to the timeline without a rebuild. The `event_images` table
  already tags every upload with `event_id` + `captured_at` for the same
  reason.
- **"Preview as…" is a client-side simulation, not a real role change.** The
  server always fetches data as the real signed-in owner (so nothing is
  actually hidden at the network level); the UI then filters what it renders
  to match the simulated role, being careful not to use the owner's own user
  ID for "is this my private content" checks while previewing — otherwise the
  owner's own private shots would leak into the simulated view.
- **The AI builder returns structured JSON** (Claude structured outputs with a
  JSON schema), validated with zod before it touches the UI. Generic wedding
  pacing only; no hard-coded cultural logic.
- **Not built on purpose:** guest uploads/QR/galleries, posing tools, billing,
  a functional (non-descriptive) use of the profession/team-size fields, deep
  cultural timeline logic, offline mode, native apps, 2FA, analytics,
  integrations, a collaborative co-editor permission tier (between Team and
  Client — flagged as a future idea, intentionally not built yet).
