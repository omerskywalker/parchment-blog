import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  const user = session?.user;

  if (!user?.email) return null;
  return user;
}
