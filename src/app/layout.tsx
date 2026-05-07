import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
});

const SITE_URL = process.env.SITE_URL || "https://arabicgames.directory";
const SITE_NAME = "Arabic Games Directory";
const SITE_DESCRIPTION =
  "A community-curated archive of games developed in the MENA region.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const isRTL = locale === "ar";

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      className={cairo.variable}
      suppressHydrationWarning
    >
      <head>
        {/* Prevents flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('theme-dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-c-bg text-c-text antialiased">{children}</body>
    </html>
  );
}
