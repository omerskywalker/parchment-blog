import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SignInForm from "./sign-in-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/dashboard";

  return <SignInForm next={next} />;
}
