import { setRequestLocale } from "next-intl/server";
import { CommunitySubmitForm } from "@/components/CommunitySubmitForm";

export default async function SubmitCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CommunitySubmitForm />;
}
