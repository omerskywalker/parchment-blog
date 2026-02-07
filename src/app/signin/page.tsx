import SignInForm from "./sign-in-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/dashboard";

  return <SignInForm next={next} />;
}
