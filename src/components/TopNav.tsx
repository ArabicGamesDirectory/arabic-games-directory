import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SubmitMenu from "@/components/SubmitMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Site-wide top navigation. Renders on every locale page from `[locale]/layout.tsx`.
// Replaces the previous bottom-corner floating Theme + Language toggles —
// those are now inline at the end of this bar so they no longer overlap content
// on small screens.
//
// On mobile the link cluster wraps below the brand to avoid horizontal scroll.
export default async function TopNav() {
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <nav className="border-b border-c-border bg-c-bg sticky top-0 z-40 backdrop-blur-sm bg-c-bg/80">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/"
          className="text-sm font-semibold text-c-text hover:text-indigo-500 transition-colors shrink-0"
        >
          {t("brand")}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/stats"
            className="text-sm text-c-muted hover:text-c-text transition-colors"
          >
            {tCommon("stats")}
          </Link>
          <Link
            href="/about"
            className="text-sm text-c-muted hover:text-c-text transition-colors"
          >
            {t("about")}
          </Link>
          <SubmitMenu />
          <div className="flex items-center gap-2 ms-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
