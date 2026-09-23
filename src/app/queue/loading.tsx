import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading the queue">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-7 w-80" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <div className="mt-10 space-y-px overflow-hidden rounded-card border border-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-surface px-5 py-4">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
