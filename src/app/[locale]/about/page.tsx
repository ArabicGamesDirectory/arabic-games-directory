import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tCommon = await getTranslations("common");

  // Rich-text renderers for inline links inside translated paragraphs.
  // The translation strings use <submit>...</submit> and <contact>...</contact>
  // pseudo-tags; next-intl swaps each tag for the result of these callbacks.
  const richSubmit = (chunks: React.ReactNode) => (
    <Link href="/submit" className="text-indigo-500 hover:underline">
      {chunks}
    </Link>
  );
  const richContact = (chunks: React.ReactNode) => (
    <Link href="/contact" className="text-indigo-500 hover:underline">
      {chunks}
    </Link>
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="text-sm text-c-muted hover:text-c-text transition-colors"
      >
        {tCommon("backToDirectory")}
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-c-text">
          {t("title")}
        </h1>
        <p className="text-c-muted text-sm mt-2">{t("subtitle")}</p>
      </div>

      <div className="space-y-8">
        <Section heading={t("missionHeading")}>
          <p>{t("missionBody")}</p>
        </Section>

        <Section heading={t("scopeHeading")}>
          <p>{t("scopeBody")}</p>
        </Section>

        <Section heading={t("submitHeading")}>
          <p>{t.rich("submitBody", { submit: richSubmit })}</p>
        </Section>

        <Section heading={t("moderationHeading")}>
          <p>{t("moderationBody")}</p>
        </Section>

        <Section heading={t("openHeading")}>
          <p>{t("openBody")}</p>
        </Section>

        <Section heading={t("faqHeading")}>
          <div className="space-y-5">
            <FaqItem question={t("faqQ1")}>{t("faqA1")}</FaqItem>
            <FaqItem question={t("faqQ2")}>{t("faqA2")}</FaqItem>
            <FaqItem question={t("faqQ3")}>
              {t.rich("faqA3", { contact: richContact })}
            </FaqItem>
            <FaqItem question={t("faqQ4")}>
              {t.rich("faqA4", { contact: richContact })}
            </FaqItem>
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-wider text-c-faint uppercase mb-3">
        {heading}
      </h2>
      <div className="text-c-soft leading-relaxed">{children}</div>
    </section>
  );
}

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-c-text mb-1">{question}</h3>
      <p className="text-c-soft leading-relaxed">{children}</p>
    </div>
  );
}
