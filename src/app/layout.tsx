import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Arabic Games Directory",
  description: "A directory of games developed in the MENA region.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Prevents flash of wrong theme on load */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme');if(t==='gray')document.documentElement.classList.add('theme-gray');if(t==='dark')document.documentElement.classList.add('theme-dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-c-bg text-c-text antialiased">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
