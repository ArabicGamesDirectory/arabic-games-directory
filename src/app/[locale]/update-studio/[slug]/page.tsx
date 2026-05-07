import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { StudioSubmitForm } from "@/components/StudioSubmitForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "studio" });
  const { data } = await supabase
    .from("studios")
    .select("name")
    .eq("slug", slug)
    .single();
  return {
    title: data ? `${t("updateTitle")}: ${data.name as string}` : t("updateTitle"),
    description: t("updateSubtitle"),
    robots: { index: false },
  };
}

export default async function UpdateStudioPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { data, error } = await supabase
    .from("studios")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <StudioSubmitForm
      initialData={data}
      backHref={`/studios/${slug}`}
    />
  );
}
