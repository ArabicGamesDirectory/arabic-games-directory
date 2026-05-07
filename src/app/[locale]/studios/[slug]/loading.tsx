import { Skeleton } from "@/components/Skeleton";

// Loading state for studio detail. Header row, hero, name + type badge,
// description, then a games-list skeleton.
export default function StudioLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      <div className="mt-8">
        <Skeleton className="w-full max-w-[460px] aspect-[460/215] rounded-xl mb-6" />
        <Skeleton className="h-9 w-2/3 mb-2" />
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-4 w-full mt-4" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </div>

      <div className="mt-10">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-c-surface border border-c-border rounded-xl overflow-hidden flex flex-col sm:flex-row"
            >
              <Skeleton className="w-full sm:w-[230px] aspect-[460/215] sm:aspect-auto sm:self-stretch shrink-0 rounded-none" />
              <div className="flex-1 p-4">
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-3 w-2/3 mb-3" />
                <div className="flex gap-1.5 flex-wrap">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
