import ForgotPasswordForm from "./forgot-password-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/dashboard";
  return <ForgotPasswordForm next={next} />;
}
