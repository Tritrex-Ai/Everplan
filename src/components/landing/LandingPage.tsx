"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { Wordmark } from "@/components/Wordmark";
import {
  LockKeyIcon,
  Camera01Icon,
  Video02Icon,
  ClipboardIcon,
  FavouriteIcon,
} from "hugeicons-react";

/* Everplan marketing page. Flat, tonal, one accent — same rules as the app
 * itself (see globals.css): no drop shadows, depth from surface-0/1/2 tonal
 * steps, hairlines only where a tone shift can't separate two things. Motion
 * is framer-motion (already a dependency elsewhere in the app) rather than a
 * new animation library, kept subtle and skipped entirely under
 * prefers-reduced-motion. */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};
const fadeRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

function Reveal({
  children,
  variants = fadeUp,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(!reduce);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <div className="bg-surface-0 text-ink">
      <IntroLoader visible={loading} />
      <Header />
      <main id="top">
        <Hero />
        <Features />
        <HowItWorks />
        <Audience />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function IntroLoader({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          exit={{ y: "-100%" }}
          transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 bg-surface-0"
          aria-hidden="true"
        >
          <Wordmark size="md" />
          <div className="relative h-px w-[180px] overflow-hidden bg-line">
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.85, ease: "easeInOut" }}
              style={{ originX: 0 }}
              className="absolute inset-0 block bg-accent"
            />
          </div>
          <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-faint">
            Loading your day
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface-0/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6">
        <Link href="#top" aria-label="Everplan home">
          <Wordmark size="md" />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Who it's for", "#who"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-[14.5px] font-medium text-ink-soft transition-colors hover:bg-surface-1 hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-3.5 py-2.5 text-[14.5px] font-semibold text-ink-soft transition-colors hover:bg-surface-1 hover:text-ink"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------- */

function StaggerLine({ text, className = "", startDelay = 0 }: { text: string; className?: string; startDelay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: startDelay + i * 0.045 }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const boardY = useTransform(scrollYProgress, [0, 1], [0, -24]);

  return (
    <section ref={heroRef} className="relative overflow-hidden border-b border-line pt-20">
      <HeroArt />
      <div className="relative z-10 mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-11 px-6 pb-22 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div>
          <p className="mb-5 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            <span className="h-px w-7 bg-accent" />
            Live event-day timelines
          </p>
          <h1 className="mb-5 text-[38px] font-semibold leading-[1.06] tracking-[-0.028em] sm:text-[52px] lg:text-[58px]">
            <StaggerLine text="The wedding day always slips." />
            <br />
            <StaggerLine
              text="Yours won't feel like it."
              className="font-serif font-medium italic"
              startDelay={0.35}
            />
          </h1>
          <Reveal variants={reduce ? fadeUp : fadeUp} delay={0.15}>
            <p className="mb-7 max-w-[52ch] text-[18px] text-ink-soft">
              Everplan replaces the spreadsheet, the group chat, and the crumpled shot list. Build
              the timeline once — then run the whole day live from the phone already in your hand,
              with every device on your team a few seconds behind reality at most.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-13 items-center justify-center rounded-lg bg-accent px-6.5 text-[16px] font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                Start your first timeline
              </Link>
              <a
                href="#how"
                className="inline-flex h-13 items-center justify-center rounded-lg border border-line bg-surface-0 px-6.5 text-[16px] font-semibold text-ink transition-colors hover:bg-surface-1"
              >
                See how it works
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <p className="mt-3.5 text-[13.5px] text-ink-faint">
              Free to start · Built for photographers, videographers &amp; planners
            </p>
          </Reveal>
        </div>

        <motion.div style={reduce ? undefined : { y: boardY }} className="relative z-10 justify-self-stretch md:justify-self-end">
          <LiveBoardMock />
        </motion.div>
      </div>
    </section>
  );
}

function HeroArt() {
  const reduce = useReducedMotion();
  const drawProps = reduce
    ? {}
    : {
        initial: { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: { once: true },
        transition: { duration: 1.1, ease: "easeOut" as const },
      };
  return (
    <svg
      className="pointer-events-none absolute -right-10 -bottom-2 z-0 hidden w-[min(72vw,760px)] text-line lg:block"
      viewBox="0 0 760 260"
      fill="none"
      aria-hidden="true"
    >
      <g className="text-accent/55" stroke="currentColor" strokeWidth={1.5}>
        <motion.path {...drawProps} d="M560 200 a80 80 0 0 1 160 0" />
        <motion.path {...drawProps} d="M640 86 v-24" />
        <motion.path {...drawProps} d="M700 110 l17 -17" />
        <motion.path {...drawProps} d="M580 110 l-17 -17" />
        <motion.path {...drawProps} d="M724 156 h24" />
        <motion.path {...drawProps} d="M532 156 h-24" />
      </g>
      <g stroke="currentColor" strokeWidth={1.5}>
        <motion.path {...drawProps} d="M0 200 H760" />
        <motion.path {...drawProps} d="M40 226 H720" />
        <motion.path {...drawProps} d="M120 248 H640" />
        <motion.path {...drawProps} d="M140 200 v-10" />
        <motion.path {...drawProps} d="M260 200 v-10" />
        <motion.path {...drawProps} d="M380 200 v-10" />
        <motion.path {...drawProps} d="M500 200 v-10" />
      </g>
    </svg>
  );
}

function LiveBoardMock() {
  const [minute, setMinute] = useState(2);
  const [shotChecked, setShotChecked] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setMinute((m) => m + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setShotChecked(true), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="img"
      aria-label="Everplan's live day-of board showing the current, next, and later timeline blocks with shot checklists"
      className="w-full max-w-[420px] overflow-hidden rounded-xl border border-night-line bg-night-0 text-[14px] text-night-ink"
    >
      <div className="flex items-center justify-between border-b border-night-line bg-night-1 px-4.5 py-3.5">
        <div>
          <div className="text-[14.5px] font-semibold tracking-tight">Riley &amp; Sam</div>
          <div className="mt-0.5 font-mono text-[12.5px] text-night-ink-soft">Sat Oct 12</div>
        </div>
        <span className="flex items-center gap-2 font-mono text-[15px] font-semibold text-night-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-night-accent" />
          4:{String(minute).padStart(2, "0")} PM
        </span>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <span className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-night-accent">Now</span>
        <div className="rounded-md bg-night-2 px-3.5 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14.5px] font-semibold">Golden hour portraits</span>
            <span className="font-mono text-[12.5px] text-night-ink-soft">4:00 – 4:25</span>
          </div>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {[
              { label: "Couple — wide, west lawn", done: true },
              { label: "Ring detail in low light", done: true },
              { label: "Veil toss, backlit", done: shotChecked },
              { label: "Parents joining, candid", done: false },
            ].map((s) => (
              <li
                key={s.label}
                className={`flex items-center gap-2.5 text-[13.5px] ${
                  s.done ? "text-night-ink-soft line-through" : "text-night-ink-soft"
                }`}
              >
                <span
                  className={`h-4 w-4 shrink-0 rounded-[5px] border-[1.5px] ${
                    s.done ? "border-ok bg-ok" : "border-night-ink-soft/60"
                  }`}
                />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <span className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-night-ink-soft">Next</span>
        <div className="rounded-md bg-night-1 px-3.5 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14.5px] font-semibold">Cocktail hour candids</span>
            <span className="font-mono text-[12.5px] text-night-ink-soft">4:30 – 5:15</span>
          </div>
          <p className="mt-1.5 text-[12.5px] font-semibold text-warn">Running 10 min late</p>
        </div>
        <span className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-night-ink-soft">Later</span>
        <div className="flex items-baseline justify-between rounded-md bg-night-1 px-3.5 py-2.5 text-[13.5px] text-night-ink-soft">
          <span>Reception entrance</span>
          <span className="font-mono">5:30</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-night-line bg-night-1 px-4.5 py-2.5 text-[12px] text-night-ink-soft">
        <span>3 teammates viewing</span>
        <span>Synced just now</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <Reveal className="mb-14 max-w-[640px]">
      <p className="mb-3.5 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-accent-strong">
        <span className="h-px w-7 bg-accent" />
        {eyebrow}
      </p>
      <h2 className="mb-3.5 text-[28px] font-semibold leading-[1.12] tracking-[-0.024em] sm:text-[34px] lg:text-[40px]">
        {title}
      </h2>
      {sub && <p className="text-[17px] text-ink-soft">{sub}</p>}
    </Reveal>
  );
}

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="mb-3.5 text-accent"
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Features() {
  return (
    <section id="features" className="py-22">
      <div className="mx-auto max-w-[1120px] px-6">
        <SectionHead
          eyebrow="What's inside"
          title={
            <>
              Everything the day needs, <span className="font-serif font-medium italic">nothing it doesn&apos;t</span>
            </>
          }
          sub="One timeline for the whole team — built before the day, run during it, and shared exactly as far as you decide."
        />

        <FeatureRow
          copy={
            <>
              <FeatureIcon>
                <path d="M12 3l1.6 4.2L18 8.8l-4.4 1.6L12 14.6l-1.6-4.2L6 8.8l4.4-1.6z" />
                <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
                <path d="M5 16l.5 1.3 1.3.5-1.3.5L5 19.6l-.5-1.3-1.3-.5 1.3-.5z" />
              </FeatureIcon>
              <p className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                AI timeline builder
              </p>
              <h3 className="mb-3 text-[24px] font-semibold leading-tight tracking-[-0.018em]">
                Describe the day. Get a draft timeline in seconds.
              </h3>
              <p className="max-w-[46ch] text-[16px] text-ink-soft">
                Tell Everplan how the day runs in plain language — &quot;ceremony at 3, first look
                before, sunset at 6:40&quot; — and it drafts a full shot-by-shot timeline: blocks,
                durations, and a starter shot list for each.
              </p>
              <p className="mt-3 max-w-[46ch] text-[16px] text-ink-soft">
                Accept it, tweak it block by block, or skip it entirely and build by hand. The
                draft is a head start, never a cage.
              </p>
            </>
          }
          mock={<AiBuilderMock />}
        />

        <FeatureRow
          flip
          copy={
            <>
              <FeatureIcon>
                <circle cx="12" cy="13" r="8" />
                <path d="M12 13V8.5" />
                <path d="M12 13l3 2" />
                <path d="M9 2h6" />
              </FeatureIcon>
              <p className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                Editor &amp; shot time budgets
              </p>
              <h3 className="mb-3 text-[24px] font-semibold leading-tight tracking-[-0.018em]">
                Every shot gets a time cost. Every block shows the total.
              </h3>
              <p className="max-w-[46ch] text-[16px] text-ink-soft">
                Drag blocks to reorder the day. Inside each one, every shot carries its own time
                estimate — and the block header keeps a running total against its duration.
              </p>
              <p className="mt-3 max-w-[46ch] text-[16px] text-ink-soft">
                Go over budget and the number quietly changes color. No popup, no nagging — just
                enough signal to cut a shot before the day does it for you.
              </p>
            </>
          }
          mock={<BudgetMock />}
        />

        <FeatureRow
          copy={
            <>
              <FeatureIcon>
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <path d="M12 14.5v2.5" />
              </FeatureIcon>
              <p className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                Private shot lists
              </p>
              <h3 className="mb-3 text-[24px] font-semibold leading-tight tracking-[-0.018em]">
                Your shot list is yours until you say otherwise.
              </h3>
              <p className="max-w-[46ch] text-[16px] text-ink-soft">
                Every block carries its own shot list, private by default. Share a single shot
                with your second, or a whole block with the team — and keep the experimental stuff
                to yourself.
              </p>
              <p className="mt-3 max-w-[46ch] text-[16px] text-ink-soft">
                Privacy is enforced at the database level, not just hidden in the interface. What
                you haven&apos;t shared genuinely cannot be read by anyone else.
              </p>
            </>
          }
          mock={<PrivacyMock />}
        />

        <FeatureRow
          flip
          copy={
            <>
              <FeatureIcon>
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5" />
                <circle cx="17.5" cy="9.5" r="2.5" />
                <path d="M15.8 14.8c2.9.2 5 2 5.7 5.2" />
              </FeatureIcon>
              <p className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                Roles &amp; permissions
              </p>
              <h3 className="mb-3 text-[24px] font-semibold leading-tight tracking-[-0.018em]">
                Team writes. Clients and vendors read. The database agrees.
              </h3>
              <p className="max-w-[46ch] text-[16px] text-ink-soft">
                Invite your second shooter as Team with full write access, and the couple or the DJ
                as Client or Vendor — strictly read-only, enforced by real database permissions
                rather than cosmetic hiding.
              </p>
              <p className="mt-3 max-w-[46ch] text-[16px] text-ink-soft">
                Not sure what the florist will see? Preview the event as any role before you send
                the invite.
              </p>
            </>
          }
          mock={<RolesMock />}
        />

        <FeatureRow
          copy={
            <>
              <FeatureIcon>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path d="M14 14h3v3h-3zM19 15.5h2M15.5 19v2M19 19h2v2h-2z" />
              </FeatureIcon>
              <p className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                Guest view
              </p>
              <h3 className="mb-3 text-[24px] font-semibold leading-tight tracking-[-0.018em]">
                &quot;What&apos;s next?&quot; — answered by a QR code, not by you.
              </h3>
              <p className="max-w-[46ch] text-[16px] text-ink-soft">
                Generate a no-login guest link and drop the QR code on the welcome sign. Guests get
                a live Now / Next / Later view of the celebration on their own phones.
              </p>
              <p className="mt-3 max-w-[46ch] text-[16px] text-ink-soft">
                Visibility is per block: the ceremony and reception can be public while prep, first
                look, and behind-the-scenes blocks stay completely hidden.
              </p>
            </>
          }
          mock={<GuestMock />}
        />
      </div>
    </section>
  );
}

function FeatureRow({
  copy,
  mock,
  flip = false,
}: {
  copy: React.ReactNode;
  mock: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 border-t border-line py-11 first:border-t-0 first:pt-0 md:grid-cols-2 md:gap-16">
      <Reveal variants={flip ? fadeRight : fadeLeft} className={flip ? "md:order-2" : ""}>
        {copy}
      </Reveal>
      <Reveal variants={flip ? fadeLeft : fadeRight}>{mock}</Reveal>
    </div>
  );
}

function MockShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4.5 text-[14px]">
      <div className="overflow-hidden rounded-lg border border-line bg-surface-0">{children}</div>
    </div>
  );
}

function AiBuilderMock() {
  return (
    <MockShell>
      <div className="border-b border-line bg-surface-0 px-4 py-3.5 text-[14px] text-ink-soft">
        <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          You
        </span>
        &quot;Ceremony at 3 at the chapel, first look before, golden hour at 6:40, reception till 11.&quot;
      </div>
      <div className="bg-surface-1 px-4 py-3.5">
        <span className="mb-2.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-accent-strong">
          Draft timeline
        </span>
        {[
          ["Prep & details", "12:30 · 90 min"],
          ["First look", "2:15 · 30 min"],
          ["Ceremony", "3:00 · 45 min"],
          ["Golden hour portraits", "6:40 · 25 min"],
        ].map(([n, t]) => (
          <div
            key={n}
            className="mb-1.5 flex items-baseline justify-between rounded-md border border-line bg-surface-0 px-3 py-2.5 last-of-type:mb-3"
          >
            <span className="text-[13.5px] font-semibold">{n}</span>
            <span className="font-mono text-[12.5px] text-ink-faint">{t}</span>
          </div>
        ))}
        <div className="flex gap-2">
          <span className="rounded-md bg-accent px-3.5 py-2 text-[13px] font-semibold text-white">
            Accept draft
          </span>
          <span className="rounded-md border border-line bg-surface-0 px-3.5 py-2 text-[13px] font-semibold text-ink">
            Edit blocks
          </span>
        </div>
      </div>
    </MockShell>
  );
}

function BudgetMock() {
  return (
    <MockShell>
      <div className="border-b border-line bg-surface-0 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="select-none text-ink-faint">⠿</span>
          <span className="flex-1 text-[14px] font-semibold">First look</span>
          <span className="font-mono text-[12.5px] text-ink-faint">18 of 30 min</span>
        </div>
      </div>
      <div className="border-b border-line bg-surface-1 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="select-none text-ink-faint">⠿</span>
          <span className="flex-1 text-[14px] font-semibold">Golden hour portraits</span>
          <span className="font-mono text-[12.5px] font-semibold text-warn-ink">28 of 25 min</span>
        </div>
        <ul className="ml-6 mt-2.5 flex flex-col gap-1.5">
          {[
            ["Couple — wide, west lawn", "6 min"],
            ["Veil toss, backlit", "8 min"],
            ["Parents joining, candid", "8 min"],
            ["Ring detail in low light", "6 min"],
          ].map(([label, est]) => (
            <li key={label} className="flex items-center gap-2 text-[13px] text-ink-soft">
              {label}
              <span className="ml-auto font-mono text-[12px] text-ink-faint">{est}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-surface-0 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="select-none text-ink-faint">⠿</span>
          <span className="flex-1 text-[14px] font-semibold">Reception entrance</span>
          <span className="font-mono text-[12.5px] text-ink-faint">12 of 20 min</span>
        </div>
      </div>
    </MockShell>
  );
}

function PrivacyMock() {
  return (
    <MockShell>
      <div className="bg-surface-0 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex-1 text-[14px] font-semibold">Ceremony — shot list</span>
          <span className="text-[12px] font-semibold text-accent-strong">2 of 4 shared</span>
        </div>
        <ul className="mt-2.5 flex flex-col gap-1.5">
          <li className="flex items-center gap-2 text-[13px] text-ink-soft">
            <LockKeyIcon size={13} className="shrink-0 text-ink-faint" />
            Processional from balcony
            <span className="ml-auto text-[12px] text-ink-faint">Only you</span>
          </li>
          <li className="flex items-center gap-2 text-[13px] text-ink-soft">
            <LockKeyIcon size={13} className="shrink-0 text-ink-faint" />
            Double-exposure experiment
            <span className="ml-auto text-[12px] text-ink-faint">Only you</span>
          </li>
          <li className="flex items-center gap-2 text-[13px] text-ink-soft">
            Vow close-ups, both angles
            <span className="ml-auto text-[12px] font-semibold text-accent-strong">Team</span>
          </li>
          <li className="flex items-center gap-2 text-[13px] text-ink-soft">
            Grandparents&apos; reaction
            <span className="ml-auto text-[12px] font-semibold text-accent-strong">Team</span>
          </li>
        </ul>
      </div>
    </MockShell>
  );
}

function RolesMock() {
  return (
    <MockShell>
      {[
        { initials: "MJ", name: "Maya J.", sub: "Second shooter", role: "Team", detail: "full access", team: true },
        { initials: "R+S", name: "Riley & Sam", sub: "The couple", role: "Client", detail: "read-only", team: false },
        { initials: "DJ", name: "Deck the Halls DJ", sub: "Vendor", role: "Vendor", detail: "read-only", team: false },
      ].map((r) => (
        <div key={r.name} className="flex items-center gap-3 border-b border-line bg-surface-0 px-3.5 py-3">
          <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-soft">
            {r.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold">{r.name}</span>
            <span className="block truncate text-[12px] text-ink-faint">{r.sub}</span>
          </span>
          <span className={`shrink-0 text-right text-[12.5px] font-semibold ${r.team ? "text-accent-strong" : "text-ink-soft"}`}>
            {r.role}
            <small className="block text-[11px] font-normal text-ink-faint">{r.detail}</small>
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2.5 bg-surface-1 px-3.5 py-2.5 text-[12.5px] text-ink-soft">
        <span>
          Previewing as <b className="text-ink">Vendor</b> — shot lists hidden
        </span>
        <span className="rounded-md border border-line bg-surface-0 px-2.5 py-1 text-[12px] font-semibold text-ink">
          Exit preview
        </span>
      </div>
    </MockShell>
  );
}

function GuestMock() {
  const blocks = [
    { name: "Bridal prep", visible: false },
    { name: "First look", visible: false },
    { name: "Ceremony", visible: true },
    { name: "Cocktail hour", visible: true },
    { name: "Reception", visible: true },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4.5 text-[14px]">
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-line sm:grid-cols-[1fr_auto]">
        <div className="border-b border-line sm:border-b-0 sm:border-r">
          {blocks.map((b) => (
            <div
              key={b.name}
              className="flex items-center gap-2.5 border-b border-line bg-surface-0 px-3.5 py-2.5 text-[13.5px] last:border-b-0"
            >
              <span className="font-semibold">{b.name}</span>
              <span className="ml-2.5 mr-auto pl-2.5 text-[11.5px] text-ink-faint">
                {b.visible ? "Guests can see" : "Hidden"}
              </span>
              <span
                className={`relative h-5 w-8.5 shrink-0 rounded-full border ${
                  b.visible ? "border-accent bg-accent" : "border-line bg-surface-2"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3.5 w-3.5 rounded-full border border-line bg-surface-0 transition-all ${
                    b.visible ? "left-4" : "left-0.5"
                  }`}
                />
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-2.5 bg-surface-1 px-5 py-4.5 text-center text-[12px] text-ink-faint">
          <QrGlyph />
          Scan for the live schedule
          <br />
          No app, no login
        </div>
      </div>
    </div>
  );
}

function QrGlyph() {
  return (
    <svg width={86} height={86} viewBox="0 0 86 86" fill="none" aria-hidden="true">
      <rect x={0.5} y={0.5} width={85} height={85} rx={8} className="fill-surface-0 stroke-line" />
      <g className="fill-ink">
        <path fillRule="evenodd" d="M12 12h20v20H12zM17 17h10v10H17z" />
        <path fillRule="evenodd" d="M54 12h20v20H54zM59 17h10v10H59z" />
        <path fillRule="evenodd" d="M12 54h20v20H12zM17 59h10v10H17z" />
        <rect x={38} y={12} width={6} height={6} />
        <rect x={38} y={24} width={6} height={6} />
        <rect x={12} y={38} width={6} height={6} />
        <rect x={24} y={38} width={6} height={6} />
        <rect x={38} y={38} width={6} height={6} />
        <rect x={50} y={42} width={6} height={6} />
        <rect x={62} y={38} width={6} height={6} />
        <rect x={42} y={54} width={6} height={6} />
        <rect x={54} y={58} width={6} height={6} />
        <rect x={66} y={54} width={6} height={6} />
        <rect x={60} y={68} width={6} height={6} />
        <rect x={72} y={66} width={6} height={6} />
        <rect x={44} y={70} width={6} height={6} />
      </g>
      <rect x={36} y={36} width={14} height={14} rx={3} className="fill-accent" />
    </svg>
  );
}

/* ---------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    { when: "Weeks out", title: "Sign up & pick your role", body: "Photographer, videographer, planner, or couple — solo or with a team. Everplan shapes itself around how you work." },
    { when: "Planning", title: "Build the timeline", body: "Describe the day and let AI draft it, or hand-build every block. Attach shot lists and time budgets as you go." },
    { when: "Day of", title: "Run it live", body: "Open the board, mark shots captured and blocks done or late — every teammate's phone updates within seconds." },
    { when: "During the party", title: "Share with guests", body: "Put the QR code on the welcome sign. Guests follow along live — only the blocks you chose to show." },
  ];
  return (
    <section id="how" className="border-y border-line bg-surface-1 py-22">
      <div className="mx-auto max-w-[1120px] px-6">
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              From booking to bouquet toss, <span className="font-serif font-medium italic">in four moves</span>
            </>
          }
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:gap-7">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1} className="relative border-l border-line pb-6.5 pl-6.5 md:border-l-0 md:border-t md:pb-0 md:pl-0 md:pt-6.5">
              <span className="absolute -left-[5.5px] top-0 h-2.5 w-2.5 rounded-full border-2 border-accent bg-surface-1 md:-top-[5.5px] md:left-0" />
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent-strong">{s.when}</p>
              <h3 className="mb-1.5 text-[17px] font-semibold tracking-[-0.01em]">{s.title}</h3>
              <p className="text-[14.5px] text-ink-soft">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */

function Audience() {
  const cards = [
    { icon: Camera01Icon, title: "Photographers", body: "Your shot list lives next to the schedule instead of buried three days deep in a text thread." },
    { icon: Video02Icon, title: "Videographers", body: "Know exactly when golden hour, speeches, and the first dance land — and when they slip." },
    { icon: ClipboardIcon, title: "Planners", body: "One live board for every vendor. Mark a block late once and everyone knows at once." },
    { icon: FavouriteIcon, title: "Couples", body: "See your own day at a glance and let guests follow along — without fielding a single \"what time is…?\"" },
  ];
  return (
    <section id="who" className="py-22">
      <div className="mx-auto max-w-[1120px] px-6">
        <SectionHead
          eyebrow="Who it's for"
          title={
            <>
              Built for the people <span className="font-serif font-medium italic">holding the day together</span>
            </>
          }
        />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.08} className="bg-surface-0 px-5.5 py-6.5">
              <Icon size={26} className="mb-3 text-accent" />
              <h3 className="mb-1.5 text-[15.5px] font-semibold">{title}</h3>
              <p className="text-[14px] text-ink-soft">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */

function FinalCta() {
  const reduce = useReducedMotion();
  const drawProps = reduce
    ? {}
    : {
        initial: { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: { once: true },
        transition: { duration: 1.1, ease: "easeOut" as const },
      };
  return (
    <section className="relative overflow-hidden bg-night-0 py-27.5 text-center text-night-ink">
      <svg className="pointer-events-none absolute bottom-0 left-1/2 w-[min(90vw,900px)] -translate-x-1/2 text-night-line" viewBox="0 0 900 180" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth={1.5}>
          <motion.path {...drawProps} d="M0 150 H900" />
          <motion.path {...drawProps} d="M60 170 H840" />
          <motion.path {...drawProps} d="M110 150 v-12" />
          <motion.path {...drawProps} d="M290 150 v-12" />
          <motion.path {...drawProps} d="M470 150 v-12" />
          <motion.path {...drawProps} d="M650 150 v-12" />
          <motion.path {...drawProps} d="M830 150 v-12" />
        </g>
        <g className="text-night-accent" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <motion.path {...drawProps} d="M450 40 l0 -18 M450 74 l0 18 M433 57 l-18 0 M467 57 l18 0" />
          <motion.path {...drawProps} d="M441 48 l-9 -9 M459 48 l9 -9 M441 66 l-9 9 M459 66 l9 9" />
        </g>
      </svg>
      <Reveal className="relative z-10 mx-auto max-w-[1120px] px-6">
        <h2 className="mb-4 text-[28px] font-semibold leading-[1.12] tracking-[-0.024em] text-night-ink sm:text-[34px] lg:text-[40px]">
          The next wedding day is coming.
          <br />
          <span className="font-serif font-medium italic text-night-accent">Run it, don&apos;t chase it.</span>
        </h2>
        <p className="mx-auto mb-8.5 max-w-[48ch] text-[17px] text-night-ink-soft">
          Build your first timeline in minutes. Bring the team on when you&apos;re ready.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-13 items-center justify-center rounded-lg bg-night-accent px-6.5 text-[16px] font-semibold text-night-0 transition-opacity hover:opacity-90"
          >
            Start your first timeline
          </Link>
          <Link
            href="/login"
            className="inline-flex h-13 items-center justify-center rounded-lg border border-night-line px-6.5 text-[16px] font-semibold text-night-ink transition-colors hover:bg-night-1"
          >
            Log in
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface-0 py-9">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-5 px-6 text-[14px] text-ink-faint">
        <Link href="#top">
          <Wordmark size="md" className="text-[15.5px] text-ink-soft" />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-5.5">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <Link href="/login" className="hover:text-ink">Log in</Link>
          <Link href="/login" className="hover:text-ink">Get started</Link>
        </nav>
        <span>© 2026 Everplan</span>
      </div>
    </footer>
  );
}
