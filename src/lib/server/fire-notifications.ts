import { prisma } from "@/lib/db";
import { getResend, appUrl, fromEmail } from "@/lib/email/resend";

export const FIRE_MILESTONES = [5, 25, 100] as const;
export type FireMilestone = (typeof FIRE_MILESTONES)[number];

/**
 * Returns the highest milestone reached by fireCount that hasn't been notified yet,
 * or null if none.
 */
export function pendingMilestone(
  fireCount: number,
  alreadySent: number[],
): FireMilestone | null {
  // Check milestones from highest to lowest — send only the highest newly crossed one
  const sorted = [...FIRE_MILESTONES].sort((a, b) => b - a);
  for (const m of sorted) {
    if (fireCount >= m && !alreadySent.includes(m)) {
      return m;
    }
  }
  return null;
}

/**
 * Checks if a fire milestone has been reached and, if so, sends a notification email
 * to the post author. Idempotent — uses FireNotification table to prevent duplicate sends.
 *
 * Called best-effort: errors are caught and logged, never thrown.
 */
export async function maybeNotifyFireMilestone(
  postId: string,
  fireCount: number,
): Promise<void> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        slug: true,
        author: { select: { email: true, name: true } },
        fireNotifications: { select: { milestone: true } },
      },
    });

    if (!post?.author?.email) return;

    const alreadySent = post.fireNotifications.map((n) => n.milestone);
    const milestone = pendingMilestone(fireCount, alreadySent);
    if (!milestone) return;

    // Record the notification first (upsert avoids race-condition duplicates)
    await prisma.fireNotification.create({
      data: { postId, milestone },
    });

    const resend = getResend();
    if (!resend) {
      console.warn(
        `[fire-notifications] RESEND_API_KEY missing. Would have notified ${post.author.email} for ${milestone} fires on "${post.title}"`,
      );
      return;
    }

    const postUrl = `${appUrl()}/posts/${post.slug}`;
    const authorDisplay = post.author.name ?? post.author.email;

    await resend.emails.send({
      from: fromEmail(),
      to: post.author.email,
      subject: `🔥 Your post "${post.title}" just hit ${milestone} fires!`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
          <p style="font-size:24px;margin:0 0 8px">🔥 ${milestone} fires</p>
          <p style="font-size:16px;color:#555;margin:0 0 24px">Hey ${authorDisplay},</p>
          <p style="font-size:16px;margin:0 0 24px">
            Your post <strong>"${post.title}"</strong> just reached
            <strong>${milestone} fire reactions</strong>. People are loving it!
          </p>
          <a href="${postUrl}"
             style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">
            View post →
          </a>
          <p style="font-size:12px;color:#999;margin:32px 0 0">
            You're receiving this because you published on
            <a href="${appUrl()}" style="color:#999">Parchment</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[fire-notifications] Failed to send milestone email:", err);
  }
}
