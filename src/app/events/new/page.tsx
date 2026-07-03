import Link from "next/link";
import { EventForm } from "@/components/EventForm";

export default function NewEventPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <header className="mb-6">
        <Link href="/events" className="text-[14px] text-ink-soft hover:text-ink">
          ← My events
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold tracking-tight">New event</h1>
      </header>
      <EventForm />
    </main>
  );
}
