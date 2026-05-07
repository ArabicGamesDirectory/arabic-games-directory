import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommunitySubmitForm } from "@/components/CommunitySubmitForm";
import { languageAlternates } from "@/lib/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "community" });
  return {
    title: t("submitTitle"),
    description: t("submitSubtitle"),
    alternates: languageAlternates("/submit-community"),
  };
}

export default async function SubmitCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CommunitySubmitForm />;
}
