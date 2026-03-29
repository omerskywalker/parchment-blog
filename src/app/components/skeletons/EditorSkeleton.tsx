export function EditorSkeleton() {
  return (
    <main className="mx-auto max-w-[845px] px-4 py-10 animate-pulse">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 rounded-md bg-white/8" />
        <div className="h-8 w-20 rounded-md bg-white/8" />
      </div>

      {/* heading */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-8 w-24 rounded bg-white/8" />
        <div className="h-6 w-14 rounded-full bg-white/5" />
      </div>

      {/* form card */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6 space-y-5">
        {/* title field */}
        <div className="space-y-2">
          <div className="h-4 w-10 rounded bg-white/8" />
          <div className="h-9 w-full rounded-md bg-white/5" />
        </div>
        {/* slug field */}
        <div className="space-y-2">
          <div className="h-4 w-10 rounded bg-white/8" />
          <div className="h-9 w-full rounded-md bg-white/5" />
        </div>
        {/* tags field */}
        <div className="space-y-2">
          <div className="h-4 w-10 rounded bg-white/8" />
          <div className="h-9 w-full rounded-md bg-white/5" />
        </div>
        {/* content editor */}
        <div className="space-y-2">
          <div className="h-4 w-14 rounded bg-white/8" />
          <div className="h-64 w-full rounded-md bg-white/5" />
        </div>
        {/* action row */}
        <div className="flex justify-end">
          <div className="h-9 w-24 rounded-md bg-white/8" />
        </div>
      </div>
    </main>
  );
}
