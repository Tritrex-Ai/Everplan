"use client";

import { PrinterIcon } from "hugeicons-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed right-5 top-5 flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-[13px] font-semibold text-white hover:bg-black/80"
    >
      <PrinterIcon size={15} /> Print / Save as PDF
    </button>
  );
}
