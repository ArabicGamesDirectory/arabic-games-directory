import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Disclaimer() {
  const t = await getTranslations("footer");
  return (
    <footer className="mt-12 border-t border-c-border">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-2">
          {t("disclaimerTitle")}
        </h2>
        <p className="text-sm text-c-muted leading-relaxed" dir="auto">
          {t("disclaimerBody")}
        </p>
        <div className="mt-4 text-sm flex gap-4 flex-wrap">
          <Link
            href="/about"
            className="text-c-muted hover:text-indigo-500 transition-colors"
          >
            {t("about")} →
          </Link>
          <Link
            href="/contact"
            className="text-c-muted hover:text-indigo-500 transition-colors"
          >
            {t("contact")} →
          </Link>
          {/* RSS feed link — locale-prefix-free since /feed.xml is a single
              English feed served from the app root, not a localized route. */}
          <a
            href="/feed.xml"
            className="text-c-muted hover:text-indigo-500 transition-colors"
          >
            {t("rss")} →
          </a>
        </div>
      </div>
    </footer>
  );
}
