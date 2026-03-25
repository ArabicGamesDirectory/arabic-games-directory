import { setRequestLocale } from "next-intl/server";
import { StudioSubmitForm } from "@/components/StudioSubmitForm";

export default async function SubmitStudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StudioSubmitForm />;
}
