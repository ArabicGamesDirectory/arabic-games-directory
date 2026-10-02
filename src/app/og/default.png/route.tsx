import { renderOgImage } from "@/lib/ogImage";

// GET /og/default.png — site-wide share image, set as the default og:image in
// the root layout (homepage, stats, about, …). See /og/[kind]/[file] for why
// it isn't under /api/.
export async function GET() {
  return renderOgImage({
    kind: "Directory",
    title: "Arabic Games Directory",
    subtitle: "دليل الألعاب العربية",
    meta: "Games, studios & communities from the MENA region",
    seed: "arabic-games-directory",
  });
}
