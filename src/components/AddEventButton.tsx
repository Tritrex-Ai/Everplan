"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Add01Icon } from "hugeicons-react";
import { Modal, FloatingActionButton } from "@/components/ui";
import { EventForm } from "@/components/EventForm";

const AddEventContext = createContext<(() => void) | null>(null);

/** Wraps the events page body so the header button and the mobile FAB can
 * open the same "Add event" sheet — the page itself is a Server Component,
 * so a function can't be passed down as a prop across that boundary. */
export function AddEventProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AddEventContext.Provider value={() => setOpen(true)}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} title="New event">
        <EventForm bare />
      </Modal>
    </AddEventContext.Provider>
  );
}

function useAddEvent() {
  const openSheet = useContext(AddEventContext);
  if (!openSheet) throw new Error("useAddEvent must be used within AddEventProvider");
  return openSheet;
}

export function AddEventTriggerButton({
  className = "",
  hideOnMobile = false,
}: {
  className?: string;
  /** The mobile FAB already covers this action — set when this button sits
   * next to it (the page header) to avoid two "Add event" controls at once. */
  hideOnMobile?: boolean;
}) {
  const open = useAddEvent();
  return (
    <button
      onClick={open}
      className={`${hideOnMobile ? "hidden sm:inline-flex" : "inline-flex"} h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-accent px-5 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-accent-strong ${className}`}
    >
      + Add event
    </button>
  );
}

export function AddEventFAB() {
  const open = useAddEvent();
  return (
    <FloatingActionButton onClick={open} icon={<Add01Icon size={22} />} label="Add event" />
  );
}
