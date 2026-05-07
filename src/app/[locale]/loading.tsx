import { Skeleton } from "@/components/Skeleton";

// Loading skeleton for the homepage. Mirrors the actual layout shape (header,
// tabs row, search bar, filter dropdowns, sort row, then a few card placeholders)
// so the page doesn't visually shift when the real content arrives.
export default function HomeLoading() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-8">
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-4 w-96" />
      </header>
      <div className="mb-6">
        <Skeleton className="h-10 w-72 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl mb-4" />
      <div className="flex gap-2 flex-wrap mb-4">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-5 w-48 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-c-surface border border-c-border rounded-xl overflow-hidden flex flex-col sm:flex-row">
      <Skeleton className="w-full sm:w-[230px] aspect-[460/215] sm:aspect-auto sm:self-stretch shrink-0 rounded-none" />
      <div className="flex-1 p-4">
        <Skeleton className="h-5 w-2/3 mb-2" />
        <Skeleton className="h-3 w-1/3 mb-3" />
        <Skeleton className="h-3 w-3/4 mb-3" />
        <div className="flex gap-1.5 flex-wrap">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}
