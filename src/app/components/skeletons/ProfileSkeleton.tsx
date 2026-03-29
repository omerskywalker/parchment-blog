export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* avatar + button */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-start">
          <div className="h-20 w-20 rounded-full bg-white/8" />
          <div className="h-9 w-28 rounded-md bg-white/8" />
        </div>

        {/* fields */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-white/8" />
            <div className="h-9 w-full rounded-md bg-white/5" />
            <div className="h-3 w-40 rounded bg-white/5" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-8 rounded bg-white/8" />
            <div className="h-24 w-full rounded-md bg-white/5" />
          </div>
          <div className="h-9 w-16 rounded-md bg-white/8" />
        </div>
      </div>
    </div>
  );
}
