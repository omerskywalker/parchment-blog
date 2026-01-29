import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getAuthedUserId(): Promise<string | null> {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}
