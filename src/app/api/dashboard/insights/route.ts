import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { openai, isOpenAIConfigured } from "@/lib/server/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Suggestion = { title: string; rationale: string };
type InsightsPayload = {
  summary: string;
  suggestions: Suggestion[];
  refreshedAt: string;
  cached: boolean;
};

type CacheEntry = { data: Omit<InsightsPayload, "cached">; expires: number };

// Per-instance in-memory cache. Cold-start regen is acceptable for v1.
// 24h TTL — author dashboards don't change much within a day.
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  const userId = session.user.id;
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const now = Date.now();
  const hit = cache.get(userId);
  if (!force && hit && hit.expires > now) {
    return NextResponse.json({ ...hit.data, cached: true } satisfies InsightsPayload);
  }

  const posts = await prisma.post.findMany({
    where: { authorId: userId, publishedAt: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      title: true,
      contentMd: true,
      tags: true,
      viewCount: true,
      fireCount: true,
      publishedAt: true,
    },
  });

  if (posts.length === 0) {
    return NextResponse.json({ error: "no_posts" }, { status: 422 });
  }

  const condensed = posts.map((p) => {
    const body = stripMarkdown(p.contentMd).slice(0, 600);
    return {
      title: p.title,
      tags: p.tags,
      views: p.viewCount,
      reactions: p.fireCount,
      published: p.publishedAt?.toISOString().slice(0, 10) ?? null,
      excerpt: body,
    };
  });

  const sys = `You are a sharp, candid editor advising a long-form essayist. You read their work and recommend what to write next. Be specific and tied to real signals. Never use emojis. Avoid hype words. Prefer concrete observations.`;

  const userPrompt = `Here are the author's most recent posts (newest first), with engagement counts and a 600-char excerpt of each:

${JSON.stringify(condensed, null, 2)}

Return STRICT JSON, no prose, matching this exact schema:

{
  "summary": "2-3 sentences naming the patterns/themes you see across these posts. Be specific. Reference at least one post by title.",
  "suggestions": [
    { "title": "A concrete next-post title (5-9 words, no quotation marks)", "rationale": "One sentence (max 25 words) tying this suggestion to a specific signal in their data — a high-engagement post, a recurring theme, a gap, etc." },
    { "title": "...", "rationale": "..." }
  ]
}

Exactly 2 suggestions. The rationales must reference real specifics from the data above.`;

  let payload: Omit<InsightsPayload, "cached">;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as {
      summary?: string;
      suggestions?: Suggestion[];
    };

    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.suggestions) ||
      parsed.suggestions.length === 0
    ) {
      throw new Error("malformed_ai_response");
    }

    const suggestions = parsed.suggestions
      .slice(0, 2)
      .filter(
        (s): s is Suggestion =>
          typeof s?.title === "string" && typeof s?.rationale === "string"
      );

    if (suggestions.length === 0) throw new Error("no_valid_suggestions");

    payload = {
      summary: parsed.summary.trim(),
      suggestions,
      refreshedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[dashboard/insights] generation failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 503 });
  }

  cache.set(userId, { data: payload, expires: now + TTL_MS });
  return NextResponse.json({ ...payload, cached: false } satisfies InsightsPayload);
}
