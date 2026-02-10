import Link from "next/link";

export function TagChips({
  tags,
  className = "",
  hrefPrefix = "/posts?tag=",
  clickable = true,
}: {
  tags: string[] | null | undefined;
  className?: string;
  hrefPrefix?: string;
  clickable?: boolean;
}) {
  const list = (tags ?? []).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <span className={`flex mt-3 flex-wrap gap-2 ${className}`}>
      {list.map((t) =>
        clickable ? (
          <Link
            key={t}
            href={`${hrefPrefix}${encodeURIComponent(t)}`}
            className="inline-flex items-center rounded-sm border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            #{t}
          </Link>
        ) : (
          <span
            key={t}
            className="inline-flex items-center rounded-sm border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80"
          >
            #{t}
          </span>
        ),
      )}
    </span>
  );
}
