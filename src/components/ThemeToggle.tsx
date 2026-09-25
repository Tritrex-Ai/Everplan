"use client";

import { useSyncExternalStore } from "react";
import { Sun01Icon, Moon02Icon } from "hugeicons-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { resolvedTheme, toggleTheme } = useTheme();

  if (!isClient) {
    return (
      <div
        className={`h-9 w-9 rounded-xl bg-surface-2 border border-line flex items-center justify-center opacity-60 ${className}`}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`group relative flex items-center gap-2 h-9 px-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-line text-ink-soft hover:text-ink transition-all active:scale-95 ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              className="text-amber-400"
            >
              <Moon02Icon size={17} />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              className="text-amber-500"
            >
              <Sun01Icon size={17} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="text-[13px] font-medium capitalize">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}
