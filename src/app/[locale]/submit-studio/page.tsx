import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StudioSubmitForm } from "@/components/StudioSubmitForm";
import { languageAlternates } from "@/lib/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studio" });
  return {
    title: t("submitTitle"),
    description: t("submitSubtitle"),
    alternates: languageAlternates("/submit-studio"),
  };
}

export default async function SubmitStudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StudioSubmitForm />;
}
