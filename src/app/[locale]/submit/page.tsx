import { setRequestLocale } from "next-intl/server";
import { SubmitForm } from "@/components/SubmitForm";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SubmitForm />;
}
