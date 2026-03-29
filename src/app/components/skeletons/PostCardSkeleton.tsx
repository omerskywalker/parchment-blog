export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-white/8" />
          <div className="h-3.5 w-1/3 rounded bg-white/5" />
        </div>
        <div className="h-6 w-16 shrink-0 rounded-full bg-white/8" />
      </div>
    </div>
  );
}
