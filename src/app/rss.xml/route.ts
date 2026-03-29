import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = getBaseUrl();

  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      title: true,
      slug: true,
      publishedAt: true,
      tags: true,
      author: { select: { name: true, username: true } },
    },
  });

  const items = posts
    .map((p) => {
      const url = `${base}/posts/${p.slug}`;
      const pubDate = p.publishedAt ? new Date(p.publishedAt).toUTCString() : "";
      const authorName = p.author.name ?? p.author.username ?? "Parchment";
      const categories = (p.tags ?? [])
        .map((t) => `    <category>${escapeXml(t)}</category>`)
        .join("\n");

      return `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <pubDate>${pubDate}</pubDate>
    <author>${escapeXml(authorName)}</author>
${categories}
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Parchment Blog</title>
    <link>${base}</link>
    <description>A clean space for independent thought.</description>
    <language>en</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
