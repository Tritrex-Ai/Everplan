# Everplan — market position

_Research conducted September 2026. Revisit if the competitive landscape moves — this isn't meant to be a permanent artifact._

## The purpose, in one line

A **live, real-time, multi-device coordination tool for the wedding day itself** — for photographers and videographers first. Build the timeline (by hand or via AI from plain language), keep a private-by-default shot list against it, then run the actual day from a synced live board that every device reflects within seconds, sharing exactly as much as you choose with team, clients, vendors, and guests.

Everything Everplan does should trace back to that sentence. Anything that doesn't is scope creep, even if a competitor has it.

## The competitive landscape splits into three layers

Wedding/event software gets compared to Everplan a lot, but most of it isn't actually competing for the same job. There are three distinct layers, and Everplan only belongs in one of them.

### 1. Business-management CRMs

**HoneyBook, Táve (now VSCO Workspace), Dubsado.** Lead management, contracts, invoicing, payments, booking workflows. This is "run my photography business," not "run my wedding day." Photographers already pay for one of these — Everplan should never try to become this.

### 2. Full event-planning suites

**Coordon**, and the same category as Aisle Planner, Planning Pod, AllSeated. Budget tracking, guest RSVPs, vendor payments, seating charts, contacts/CRM, files, shared links. Built for the **wedding planner/coordinator** running the entire event end-to-end — a different buyer than a photographer, doing a different job (owning the whole wedding vs. documenting it). Coordon is not a competitor to Everplan — it's solving someone else's problem, for someone else.

### 3. Wedding-day timeline & shot-list tools for photographers

[TimelinePro](https://timelineproapp.com/), [TimelineFlow](https://shop.northline.works/products/timelineflow), [Day of Timeline](https://dayoftimeline.app/), [ShotLace](https://shotlace.com/), [theShotlist](https://www.theshotlistapp.com/). **This is Everplan's actual competitive set.**

| Tool | Core angle | Pricing |
|---|---|---|
| **TimelineFlow** | $49 one-time purchase, no subscription, fully **offline** after load. Golden-hour calculator, leave-by times, second-shooter timing. Exports static links/Word docs/text — not live sync. | One-time, $49 |
| **ShotLace** | Auto-**generates** formal family/group shot lists from a client questionnaire ("peel-away algorithm") instead of building them by hand. Offline crew access, shot-efficiency analytics. | $3.49/event or $14.99/mo |
| **TimelinePro** | Templates, client/vendor feedback on the timeline, shareable links, sunset tracker, swipe-to-complete. | 4 plan tiers, 10-day trial |
| **Day of Timeline** | Web portal + mobile app, sync, collaboration. | — |
| **theShotlist** | Client-collaborative shot requests, cross-platform. | Pre-launch |

**None of them advertise true live, multi-device sync during the event.** TimelinePro's "shareable links" and activity alerts are adjacent but not the same as a Now/Next/Later board updating on every phone within seconds. None of them have real, database-enforced role tiers (Team writes, Client/Vendor read-only) or a public no-login guest QR view. **That's Everplan's actual open lane.**

## Feature-by-feature: what Coordon has that Everplan doesn't

The actual audit — every feature from the Coordon walkthrough, whether Everplan has an equivalent, and a verdict.

| Coordon feature | Does Everplan have it? | Verdict | Why |
|---|---|---|---|
| Role-based onboarding ("What brings you to Coordon?") | Yes — mandatory "Who are you?" wizard | Already have | — |
| 5-step guided event creation wizard | No — single-page form | **Don't add** | More steps than what Everplan already does. Copying it would be a regression, not an upgrade. |
| Countdown "flip clock" widget | No | **Skip for now** | Needs a new "Overview" screen Everplan doesn't have; low value against that structural cost. |
| Mini calendar month view | No | **Skip** | Everplan's whole point is Now/Next/Later, not a generic calendar. Would blur the focus. |
| Budget tracking | No | **Skip** | Layer 2 (planning-suite) territory — different buyer, different job. |
| Full Contacts/CRM (call/message/email, phone import, Vendors/Team filters) | No — has team invites/roles instead | **Skip** | Everplan's roles answer "who can see what." A rolodex answers "how do I reach this vendor" — not Everplan's job. |
| Files & Documents (generic file drawer) | Partial — shots already support reference images | **Skip the generic version** | The narrow, purpose-built version (photos on a shot) already covers the real photographer use case. |
| Shared Links | Yes, more purpose-built — Guest link + role-based invites | Already have | Everplan's version is narrower and does more (real permission enforcement, not just a link). |
| Notes & Details (separate section) | Yes — folded into each block's own notes field | Already have | Simpler than a parallel section. |
| RSVP system | No | **Skip** | Guest-list ownership belongs to the couple/planner, not the photographer. |
| Tasks as a separate tab | No — shots serve this role | **Skip** | Already covered; a second to-do system would be redundant. |
| Save to Calendar (native device export) | No | **Low-priority maybe** | Cheap, no new feature surface, genuine minor utility. |
| Export Event Data as PDF | No | **Low-priority maybe** | Same reasoning — cheap, self-contained, not urgent. |
| AI Timeline Assistant (upload a PDF/image, chat to build) | Yes — the AI builder now also accepts an uploaded PDF or photo | Done | Extended the existing AI builder rather than adding a new one. Photographers often get a timeline PDF straight from the coordinator and no longer have to retype it. |
| Reusable timeline/task templates | No | **Worth considering** | Speeds up the core job (building timelines) without adding new feature surface. |
| Floating bottom pill tab bar | No — sidebar/top nav | **Skip** | Cosmetic nav overhaul; high effort relative to value. |
| Richer empty states (multiple concrete next actions) | Partial — one CTA today | **Add** | Zero new feature surface, makes existing functionality (AI builder + manual add) more discoverable. |
| Auto-generated shot lists from client questionnaire *(ShotLace, not Coordon)* | No | **Add** | The headline recommendation from this research — sharpens the existing niche instead of expanding it. |

**Net read:** most of what Coordon has and Everplan doesn't is correctly out of scope — it belongs to a different job entirely. The genuine adds are narrow: better empty states, auto-generated shot lists, PDF/image input for the AI builder, and maybe reusable templates. Everything else on this list is either already covered in a more focused form, or purpose-built for a buyer Everplan isn't chasing.

## What Everplan explicitly is not, and shouldn't become

- **Not a CRM.** No leads, contracts, invoicing, payments. That's HoneyBook/Táve/Dubsado's job.
- **Not a full event-planning suite.** No budget tracking, guest RSVP management, seating charts. That's Coordon's job, for a different buyer.
- **Not offline-first or one-time-purchase.** TimelineFlow owns that angle, and it's a genuinely different architecture bet (no connectivity requirement) that conflicts with Everplan's actual differentiator (live sync needs a connection). Not a gap to close — a different product, for a photographer with different priorities.
- **Not a general task manager.** A generic "Tasks" tab, the way Coordon has one, is the wrong shape. Everplan's shots already *are* the task list for the one job that matters here — there's no need for a second, parallel to-do system.

## One validated idea worth exploring later

Not from Coordon — from ShotLace: **auto-generating shot lists from client input** (skip the manual family-formal-list building that eats 30–45 minutes per event). This sharpens Everplan's existing niche rather than expanding it, since it's still squarely "help the photographer plan the shots for this specific wedding," not a new feature category. Not committed, not scoped — just the one idea from this research that's actually worth a proper look.

## Sources

- [Coordon](https://www.coordon.com/en) · [Features](https://www.coordon.com/en/features) · [App Store listing](https://apps.apple.com/us/app/coordon-wedding-event-plan/id6758043255)
- [TimelinePro](https://timelineproapp.com/)
- [TimelineFlow](https://shop.northline.works/products/timelineflow)
- [Day of Timeline](https://dayoftimeline.app/)
- [ShotLace](https://shotlace.com/)
- [theShotlist App](https://www.theshotlistapp.com/)
- [7 Best CRMs for Photographers in 2025](https://adventureinstead.com/academy/blog/best-crms-for-photographers/)
- [HoneyBook vs Tave vs Dubsado for Wedding Vendors (2026)](https://grecolabs.com/resources/honeybook-vs-tave-vs-dubsado)
