import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SubmitForm } from "@/components/SubmitForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "submit" });
  const { data } = await supabase
    .from("games")
    .select("name")
    .eq("slug", slug)
    .single();
  return {
    title: data ? `${t("updateTitle")}: ${data.name as string}` : t("updateTitle"),
    description: t("updateSubtitle"),
    robots: { index: false },
  };
}

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <SubmitForm
      initialData={data}
      backHref={`/games/${slug}`}
    />
  );
}
