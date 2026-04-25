"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale() {
    const nextLocale = locale === "en" ? "ar" : "en";
    // Next.js App Router does NOT re-render the root layout on client-side
    // navigation, so `<html dir>` would stay stale until a manual refresh.
    // Update it imperatively here so the RTL/LTR flip happens immediately.
    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    }
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <button
      onClick={switchLocale}
      title={locale === "en" ? "Switch to Arabic" : "Switch to English"}
      className="fixed bottom-4 start-4 z-50 h-9 px-3 rounded-full bg-c-surface border border-c-border shadow-sm flex items-center justify-center text-xs font-medium text-c-muted hover:text-c-text hover:border-c-border-hover transition-colors"
    >
      {locale === "en" ? "عربي" : "English"}
    </button>
  );
}
