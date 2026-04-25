import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CommunitySubmitForm } from "@/components/CommunitySubmitForm";

export default async function UpdateCommunityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <CommunitySubmitForm
      initialData={data}
      backHref={`/communities/${slug}`}
    />
  );
}
