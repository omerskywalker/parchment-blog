// app/posts/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getPublicPostBySlug } from "@/lib/server/public-posts";
import { s3PublicUrlFromKey } from "@/lib/s3";
import { loadOgFont } from "@/lib/server/og-fonts";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function clamp(str: string, max = 100) {
  const s = (str ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;

    const ct = res.headers.get("content-type") || "image/png";
    const ab = await res.arrayBuffer();
    const base64 = Buffer.from(ab).toString("base64");
    return `data:${ct};base64,${base64}`;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const geistRegular = loadOgFont("fonts/Geist-Regular.otf");
  const geistBold = loadOgFont("fonts/Geist-Bold.otf");
  const geistMono = loadOgFont("fonts/GeistMono-Regular.otf");

  const post = await getPublicPostBySlug(slug);

  if (!post) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0b0c",
          color: "white",
          fontSize: 48,
          fontWeight: 800,
          fontFamily: "Geist",
        }}
      >
        Post not found
      </div>,
      {
        ...size,
        fonts: [
          { name: "Geist", data: geistRegular, weight: 400 as const, style: "normal" as const },
          { name: "Geist", data: geistBold, weight: 700 as const, style: "normal" as const },
        ],
      },
    );
  }

  const title = clamp(post.title, 115);
  const authorName = post.author?.name ?? post.author?.username ?? "Anonymous";
  const views = post.viewCount ?? 0;
  const fire = post.fireCount ?? 0;
  const read = post.readingTimeMin ?? 1;

  let avatarSrc: string | null = null;
  if (post.author?.avatarKey) {
    const url = s3PublicUrlFromKey(post.author.avatarKey);
    if (url) avatarSrc = await fetchImageAsDataUrl(url);
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        padding: 64,
        backgroundColor: "#070708",
        color: "white",
        fontFamily: "Geist",
      }}
    >
      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "radial-gradient(1200px 630px at 50% 30%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))",
        }}
      />

      {/* card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: 36,
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundColor: "rgba(0,0,0,0.35)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
          padding: 56,
        }}
      >
        {/* brand */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            opacity: 0.9,
            letterSpacing: 0.2,
            fontWeight: 500,
          }}
        >
          Parchment Blog
        </div>

        {/* title */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: -1.2,
            }}
          >
            {title}
          </div>

          {/* subtle divider */}
          <div
            style={{
              display: "flex",
              marginTop: 22,
              height: 1,
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          />
        </div>

        {/* bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* author */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                width={48}
                height={48}
                alt=""
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 650, opacity: 0.92 }}>
                {authorName}
              </div>
              <div style={{ display: "flex", fontSize: 16, opacity: 0.6 }}>/posts/{slug}</div>
            </div>
          </div>

          {/* stats */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              opacity: 0.88,
              fontFamily: "Geist Mono",
            }}
          >
            <div style={{ display: "flex" }}>🔥 {fire}</div>
            <div style={{ display: "flex", opacity: 0.35 }}>·</div>
            <div style={{ display: "flex" }}>👁 {views}</div>
            <div style={{ display: "flex", opacity: 0.35 }}>·</div>
            <div style={{ display: "flex", fontFamily: "Geist" }}>{read} min</div>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      // ✅ Must include at least one font
      // ✅ weight must be literal union (use `as const`)
      fonts: [
        { name: "Geist", data: geistRegular, weight: 400 as const, style: "normal" as const },
        { name: "Geist", data: geistBold, weight: 700 as const, style: "normal" as const },
        { name: "Geist Mono", data: geistMono, weight: 400 as const, style: "normal" as const },
      ],
    },
  );
}
