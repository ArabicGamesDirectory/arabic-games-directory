import { Skeleton } from "@/components/Skeleton";

// Loading state for the stats page. Counter row + 8 chart-card placeholders +
// the full-width submissions-over-time row. Important here because stats runs
// 4 parallel queries and can be the slowest page on a cold visit.
export default function StatsLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Skeleton className="h-4 w-32 mb-8" />
      <Skeleton className="h-9 w-48 mb-8" />

      {/* Counter row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-c-surface border border-c-border rounded-xl p-5"
          >
            <Skeleton className="h-9 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* 8-card chart grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-c-surface border border-c-border rounded-xl p-5"
          >
            <Skeleton className="h-3 w-24 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>

      {/* Full-width submissions row */}
      <div className="mt-4 bg-c-surface border border-c-border rounded-xl p-5">
        <Skeleton className="h-3 w-32 mb-4" />
        <Skeleton className="h-60 w-full" />
      </div>
    </main>
  );
}
