"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";

/* Curated wedding photography, Unsplash License (free for commercial use).
   Rotates every 7s with a slow crossfade — the day's arc: ceremony, the
   walk down the aisle, golden hour, first dance. */
export const AUTH_SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1481688413812-9486e2fc5201?q=80&w=1800&auto=format&fit=crop",
    caption: "The ceremony, exactly on schedule.",
    credit: "kazuend",
  },
  {
    url: "https://images.unsplash.com/photo-1704281657570-350a6ef6a0c1?q=80&w=1800&auto=format&fit=crop",
    caption: "The walk down the aisle — never rushed.",
    credit: "Kari Bjorn Photography",
  },
  {
    url: "https://images.unsplash.com/photo-1756087612479-d0ff735a3aea?q=80&w=1800&auto=format&fit=crop",
    caption: "Golden hour, captured right on time.",
    credit: "Natali Hordiiuk",
  },
  {
    url: "https://images.unsplash.com/photo-1764269720571-cc09b086c2a4?q=80&w=1800&auto=format&fit=crop",
    caption: "The first dance, right on cue.",
    credit: "Samuel Cruz",
  },
];

function useSlideIndex() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % AUTH_SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);
  return index;
}

/** Full-height split panel, desktop and up. */
export function AuthHero() {
  const index = useSlideIndex();

  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-night-0 lg:block">
      {AUTH_SLIDES.map((slide, i) => (
        <div
          key={slide.url}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.url}
            alt=""
            className="h-full w-full scale-105 object-cover"
            loading={i === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      {/* warm scrim for legibility, not a moody blackout */}
      <div className="absolute inset-0 bg-gradient-to-t from-night-0/85 via-night-0/10 to-night-0/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-night-0/25 via-transparent to-transparent" />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <Wordmark size="lg" tone="light" />

        <div className="max-w-md">
          <p className="font-serif text-[42px] italic leading-[1.08] text-white xl:text-[52px]">
            Every beautiful moment,
            <br />
            <span className="text-night-accent">perfectly timed.</span>
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-8 bg-white/40" />
            <p className="text-[14px] text-white/75">{AUTH_SLIDES[index].caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Condensed top band for phones — same photography, no rotation (keeps the
 * first paint light on mobile networks), shorter headline. */
export function AuthHeroMobile() {
  const slide = AUTH_SLIDES[0];

  return (
    <div className="relative h-[42vh] min-h-[280px] w-full overflow-hidden bg-night-0 lg:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-night-0/90 via-night-0/15 to-night-0/35" />

      <div className="relative flex h-full flex-col justify-between p-6">
        <Wordmark size="md" tone="light" />
        <p className="font-serif text-[26px] italic leading-[1.15] text-white">
          Every beautiful moment,{" "}
          <span className="text-night-accent">perfectly timed.</span>
        </p>
      </div>
    </div>
  );
}
