import RegisterForm from "./register-form";
import { getOAuthProviderAvailability } from "@/auth";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/dashboard";
  const oauthProviders = getOAuthProviderAvailability();

  return <RegisterForm next={next} oauthProviders={oauthProviders} />;
}
