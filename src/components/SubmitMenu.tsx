"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

export default function SubmitMenu({
  buttonLabel,
  gameLabel,
  communityLabel,
}: {
  buttonLabel: string;
  gameLabel: string;
  communityLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
      >
        {buttonLabel}
        <span aria-hidden className="text-xs opacity-80">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 min-w-[180px] bg-c-surface border border-c-border rounded-lg shadow-lg overflow-hidden z-20"
        >
          <Link
            href="/submit"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-c-text hover:bg-c-bg transition-colors"
          >
            {gameLabel}
          </Link>
          <Link
            href="/submit-community"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-c-text hover:bg-c-bg transition-colors"
          >
            {communityLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
