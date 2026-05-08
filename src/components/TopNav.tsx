import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SubmitMenu from "@/components/SubmitMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Site-wide top navigation. Renders on every locale page from `[locale]/layout.tsx`.
//
// `About` lives in the footer only — keeping the top bar focused on the two
// primary actions (Stats, Submit). Theme + Language toggles are inline here
// instead of floating bottom-corner buttons so they don't overlap content on
// mobile.
//
// Stats is styled as a soft indigo pill (not a plain link) because the page
// is genuinely worth visiting and the previous neutral-gray treatment made it
// feel like a hidden feature.
//
// On mobile the link cluster wraps below the brand to avoid horizontal scroll.
export default async function TopNav() {
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <nav className="border-b border-c-border bg-c-bg sticky top-0 z-40 backdrop-blur-sm bg-c-bg/80">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/"
          className="text-sm font-semibold text-c-text hover:text-indigo-500 transition-colors shrink-0"
        >
          {tNav("brand")}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/stats"
            className="text-sm font-medium px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors inline-flex items-center gap-1"
          >
            <span aria-hidden>📊</span>
            <span>{tCommon("stats")}</span>
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
