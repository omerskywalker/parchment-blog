import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import VerifyEmailBanner from "@/app/components/VerifyEmailBanner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session?.user) {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";

    const nextUrl = h.get("next-url") ?? "/dashboard";
    const next = encodeURIComponent(nextUrl);

    redirect(`${proto}://${host}/signin?next=${next}`);
  }

  // Non-blocking: check if email is verified (credentials users only)
  const email = session.user.email;
  let showVerifyBanner = false;

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true, passwordHash: true },
    });
    // Only nudge credentials users; OAuth users are pre-verified
    showVerifyBanner = Boolean(user?.passwordHash && !user.emailVerified);
  }

  return (
    <>
      {showVerifyBanner && <VerifyEmailBanner />}
      {children}
    </>
  );
}
