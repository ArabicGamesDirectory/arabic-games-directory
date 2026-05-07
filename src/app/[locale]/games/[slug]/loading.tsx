import { Skeleton } from "@/components/Skeleton";

// Loading state for game detail pages. Matches the page layout (top nav row,
// hero thumbnail, title block with pills, description, two-column details
// grid, links section) so the visual shift on hydration is minimal.
export default function GameLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      <div className="mt-8">
        <Skeleton className="w-full aspect-[460/215] rounded-xl mb-6" />
        <Skeleton className="h-9 w-2/3 mb-2" />
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="flex gap-2 flex-wrap mt-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full mt-4" />
        <Skeleton className="h-4 w-full mt-1" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex gap-1.5 flex-wrap">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
