import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { StudioSubmitForm } from "@/components/StudioSubmitForm";

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
