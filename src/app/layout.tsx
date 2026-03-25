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

export const metadata: Metadata = {
  title: "Arabic Games Directory",
  description: "A directory of games developed in the MENA region.",
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
            __html: `try{const t=localStorage.getItem('theme');if(t==='gray')document.documentElement.classList.add('theme-gray');if(t==='dark')document.documentElement.classList.add('theme-dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-c-bg text-c-text antialiased">{children}</body>
    </html>
  );
}
