import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RegisterForm from "./register-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/dashboard";

  return <RegisterForm next={next} />;
}
