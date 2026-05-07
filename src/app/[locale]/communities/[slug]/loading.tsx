import { Skeleton } from "@/components/Skeleton";

// Loading state for community detail. Same shape as studio (header, hero,
// title, description) plus the topics + social-links blocks.
export default function CommunityLoading() {
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
        <Skeleton className="h-4 w-full mt-1" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-3 w-24 mb-2" />
        <div className="flex gap-1.5 flex-wrap">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>

      <div className="mt-8">
        <Skeleton className="h-3 w-20 mb-2" />
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
