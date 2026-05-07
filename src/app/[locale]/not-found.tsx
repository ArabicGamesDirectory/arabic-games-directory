import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Triggered for any unmatched route inside a locale segment, plus by explicit
// `notFound()` calls in update/[slug] pages when a slug doesn't exist. Locale
// is read from getLocale() rather than route params because Next.js doesn't
// pass params to top-level not-found.tsx files.
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <main className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-7xl font-bold tracking-tight text-c-faint mb-4">404</p>
      <h1 className="text-2xl font-bold text-c-text mb-3">{t("title")}</h1>
      <p className="text-c-muted mb-8">{t("body")}</p>
      <Link
        href="/"
        className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
