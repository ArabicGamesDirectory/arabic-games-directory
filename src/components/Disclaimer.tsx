import { getTranslations } from "next-intl/server";

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
      </div>
    </footer>
  );
}
