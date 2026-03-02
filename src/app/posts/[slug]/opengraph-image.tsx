import { ImageResponse } from "next/og";
import { getPublicPostBySlug } from "@/lib/server/public-posts";
import { s3PublicUrlFromKey } from "@/lib/s3";
import { loadOgFont } from "@/lib/server/og-fonts";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Load fonts once (module scope) so every request doesn't re-read files.
 * These must exist at: src/app/fonts/*
 */
const geistRegular = loadOgFont("fonts/Geist-Regular.otf");
const geistBold = loadOgFont("fonts/Geist-Bold.otf");
const geistMono = loadOgFont("fonts/GeistMono-Regular.otf");

function clamp(str: string, max = 100) {
  const s = (str ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Some SVGs (notably certain generated avatars) omit viewBox.
 * Next/og's renderer requires SVGs to have viewBox.
 */
function ensureSvgHasViewBox(svg: string) {
  if (/viewBox=/.test(svg)) return svg;

  // Try to infer from width/height attributes
  const wMatch = svg.match(/\bwidth=["']?([\d.]+)(px)?["']?/i);
  const hMatch = svg.match(/\bheight=["']?([\d.]+)(px)?["']?/i);
  const w = wMatch ? Number(wMatch[1]) : null;
  const h = hMatch ? Number(hMatch[1]) : null;

  const viewBox = w && h ? `0 0 ${w} ${h}` : `0 0 100 100`;

  // Inject viewBox into the opening <svg ...> tag
  return svg.replace(/<svg\b([^>]*)>/i, (m, attrs) => {
    // If it already has a viewBox somehow, don't double-add
    if (/viewBox=/.test(attrs)) return m;
    return `<svg${attrs} viewBox="${viewBox}">`;
  });
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;

    const ct = (res.headers.get("content-type") || "").toLowerCase();

    // ✅ Special handling for SVG so we can inject viewBox if missing
    if (ct.includes("image/svg")) {
      const raw = await res.text();
      const fixed = ensureSvgHasViewBox(raw);
      const base64 = Buffer.from(fixed).toString("base64");
      return `data:image/svg+xml;base64,${base64}`;
    }

    // Raster images (png/jpg/webp/etc)
    const ab = await res.arrayBuffer();
    const base64 = Buffer.from(ab).toString("base64");
    const safeCt = ct || "image/png";
    return `data:${safeCt};base64,${base64}`;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await getPublicPostBySlug(slug);

  // Shared fonts config
  const fonts = [
    { name: "Geist", data: geistRegular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: geistBold, weight: 700 as const, style: "normal" as const },
    { name: "Geist Mono", data: geistMono, weight: 400 as const, style: "normal" as const },
  ];

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
          fontSize: 52,
          fontWeight: 700,
          fontFamily: "Geist",
        }}
      >
        Post not found
      </div>,
      { ...size, fonts },
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
        color: "white",
        fontFamily: "Geist",
        backgroundColor: "#070708",
      }}
    >
      {/* layered background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(900px 500px at 15% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%)",
            "radial-gradient(900px 500px at 80% 35%, rgba(255,255,255,0.06), rgba(0,0,0,0) 60%)",
            "radial-gradient(1200px 630px at 50% 30%, rgba(255,255,255,0.07), rgba(0,0,0,0.92))",
          ].join(", "),
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
          borderRadius: 40,
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundColor: "rgba(0,0,0,0.38)",
          boxShadow: "0 20px 90px rgba(0,0,0,0.62)",
          padding: 56,
          overflow: "hidden",
        }}
      >
        {/* inner highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 40,
            border: "1px solid rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />

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
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.4,
              textShadow: "0 2px 30px rgba(0,0,0,0.55)",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              height: 1,
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.10)",
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
                width={52}
                height={52}
                alt=""
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  objectFit: "cover",
                  boxShadow: "0 10px 35px rgba(0,0,0,0.55)",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 700, opacity: 0.92 }}>
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
              opacity: 0.9,
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
    { ...size, fonts },
  );
}
