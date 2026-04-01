#!/usr/bin/env node
/**
 * Nightly roadmap summary emailer.
 * Reads open/recently-merged PRs from GitHub and sends a digest via Resend.
 *
 * Required env vars (set as GitHub Actions secrets):
 *   RESEND_API_KEY  — Resend API key (copy from Vercel env)
 *   SUMMARY_EMAIL   — recipient address
 *   GH_TOKEN        — injected automatically by GitHub Actions
 *   REPO            — set to ${{ github.repository }} in the workflow
 */

const { RESEND_API_KEY, SUMMARY_EMAIL, GH_TOKEN, REPO } = process.env;

if (!RESEND_API_KEY || !SUMMARY_EMAIL || !GH_TOKEN || !REPO) {
  console.error("Missing required env vars. Check RESEND_API_KEY, SUMMARY_EMAIL, GH_TOKEN, REPO.");
  process.exit(1);
}

const ghHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "parchment-nightly-summary",
};

async function gh(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers: ghHeaders });
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}`);
  return res.json();
}

// ── fetch data ────────────────────────────────────────────────────────────────

const [openPRs, closedPRs, runsData] = await Promise.all([
  gh("/pulls?state=open&per_page=30&sort=created&direction=asc"),
  gh("/pulls?state=closed&sort=updated&direction=desc&per_page=20"),
  gh("/actions/runs?branch=main&per_page=5"),
]);

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recentlyMerged = closedPRs.filter(
  (pr) => pr.merged_at && new Date(pr.merged_at) > sevenDaysAgo,
);

const latestRun = runsData.workflow_runs?.find((r) => r.name === "CI");
const ciEmoji = latestRun?.conclusion === "success" ? "✅" : latestRun?.conclusion === "failure" ? "❌" : "⏳";
const ciLabel = latestRun
  ? `${ciEmoji} ${latestRun.conclusion ?? "in progress"} — <a href="${latestRun.html_url}">view run</a>`
  : "⏳ No recent run found";

// ── helpers ───────────────────────────────────────────────────────────────────

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function prRow(pr) {
  const label = pr.draft ? " <em>(draft)</em>" : "";
  return `<li style="margin:4px 0"><a href="${pr.html_url}" style="color:#e5c87a">#${pr.number} — ${pr.title}</a>${label}</li>`;
}

// ── build email ───────────────────────────────────────────────────────────────

const openSection =
  openPRs.length > 0
    ? `<ul style="margin:8px 0;padding-left:20px">${openPRs.map(prRow).join("")}</ul>`
    : `<p style="color:#888;margin:8px 0">No open PRs 🎉</p>`;

const mergedSection =
  recentlyMerged.length > 0
    ? `<ul style="margin:8px 0;padding-left:20px">${recentlyMerged.map(prRow).join("")}</ul>`
    : `<p style="color:#888;margin:8px 0">Nothing merged in the last 7 days.</p>`;

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0a;color:#d4d0c8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">

  <h1 style="font-size:18px;font-weight:600;color:#fff;border-bottom:1px solid #222;padding-bottom:12px;margin-top:0">
    Parchment Roadmap — ${today}
  </h1>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr>
      <td style="padding:6px 12px;background:#111;border-radius:8px;font-size:13px;color:#888">Open PRs</td>
      <td style="padding:6px 12px;background:#111;border-radius:8px;font-size:20px;font-weight:700;color:#fff;text-align:right">${openPRs.length}</td>
    </tr>
    <tr><td colspan="2" style="height:6px"></td></tr>
    <tr>
      <td style="padding:6px 12px;background:#111;border-radius:8px;font-size:13px;color:#888">Merged this week</td>
      <td style="padding:6px 12px;background:#111;border-radius:8px;font-size:20px;font-weight:700;color:#fff;text-align:right">${recentlyMerged.length}</td>
    </tr>
    <tr><td colspan="2" style="height:6px"></td></tr>
    <tr>
      <td style="padding:6px 12px;background:#111;border-radius:8px;font-size:13px;color:#888">CI (main)</td>
      <td style="padding:6px 12px;background:#111;border-radius:8px;font-size:13px;color:#fff;text-align:right">${ciLabel}</td>
    </tr>
  </table>

  <h2 style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px">Open PRs awaiting review</h2>
  ${openSection}

  <h2 style="font-size:14px;font-weight:600;color:#fff;margin-top:24px;margin-bottom:4px">Merged this week</h2>
  ${mergedSection}

  <p style="margin-top:32px;font-size:11px;color:#444;border-top:1px solid #1a1a1a;padding-top:16px">
    Parchment · <a href="https://github.com/${REPO}" style="color:#555">github.com/${REPO}</a>
  </p>
</body>
</html>
`;

// ── send via Resend ───────────────────────────────────────────────────────────

const emailRes = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "Parchment <no-reply@omersiddiqui.com>",
    to: SUMMARY_EMAIL,
    subject: `Parchment Roadmap — ${today}`,
    html,
  }),
});

if (!emailRes.ok) {
  const body = await emailRes.text();
  console.error("Resend API error:", body);
  process.exit(1);
}

const { id } = await emailRes.json();
console.log(`Summary sent. Resend email ID: ${id}`);
console.log(`  Open PRs: ${openPRs.length}`);
console.log(`  Merged this week: ${recentlyMerged.length}`);
