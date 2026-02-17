import Link from "next/link";

type Variant = "feed" | "detail";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function TagChips({
  tags,
  className = "",
  hrefPrefix = "/posts?tag=",
  variant = "detail",
  clickable, // optional override
}: {
  tags: string[] | null | undefined;
  className?: string;
  hrefPrefix?: string;
  variant?: Variant;
  clickable?: boolean;
}) {
  const list = (tags ?? []).filter(Boolean);
  if (list.length === 0) return null;

  // feed = non-clickable | detail = clickable
  const isClickable = clickable ?? variant === "detail";

  const baseChip =
    "inline-flex items-center rounded-sm border px-2.5 py-1 text-xs transition-colors mb-2 mt-1";

  const chipByVariant =
    variant === "feed"
      ? "border-white/10 bg-white/5 text-white/70"
      : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/25";

  const chipClass = cx(baseChip, chipByVariant);

  return (
    <span className={cx("mt-3 flex flex-wrap gap-2", className)}>
      {list.map((t) =>
        isClickable ? (
          <Link key={t} href={`${hrefPrefix}${encodeURIComponent(t)}`} className={chipClass}>
            #{t}
          </Link>
        ) : (
          <span key={t} className={chipClass}>
            #{t}
          </span>
        ),
      )}
    </span>
  );
}
