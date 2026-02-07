import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    // preserves intended destination (path + query)
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";

    const nextUrl = h.get("next-url") ?? "/dashboard";
    const next = encodeURIComponent(nextUrl);

    redirect(`${proto}://${host}/signin?next=${next}`);
  }

  return <>{children}</>;
}
