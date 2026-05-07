import Link from "next/link";

// Top-level not-found.tsx — Next.js renders this for any unmatched route in
// the app. The locale-scoped [locale]/not-found.tsx only catches explicit
// `notFound()` calls from within that segment; truly unmatched URLs
// (e.g. /en/foo where /foo isn't a defined route) fall back here.
//
// We can't access next-intl context here (this file is outside the
// NextIntlClientProvider tree), so the page is bilingual: both EN and AR
// labels stacked. The "Back to directory" link routes to /en by default —
// the user can switch locale once they're on a valid page.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="bg-c-bg text-c-text antialiased">
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-7xl font-bold tracking-tight text-c-faint mb-4">404</p>
          <h1 className="text-2xl font-bold text-c-text mb-2">Page not found</h1>
          <p className="text-2xl font-bold text-c-text mb-3" dir="rtl">الصفحة غير موجودة</p>
          <p className="text-c-muted mb-1">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
          <p className="text-c-muted mb-8" dir="rtl">
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
          <Link
            href="/en"
            className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Back to the directory · العودة إلى الدليل
          </Link>
        </main>
      </body>
    </html>
  );
}
