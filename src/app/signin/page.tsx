import SignInForm from "./sign-in-form";
import { getOAuthProviderAvailability } from "@/auth";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/dashboard";
  const oauthProviders = getOAuthProviderAvailability();

  return <SignInForm next={next} oauthProviders={oauthProviders} />;
}
