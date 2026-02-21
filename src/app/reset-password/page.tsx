import ResetPasswordForm from "./reset-password-form";

type Props = {
  searchParams?: Promise<{ token?: string; next?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const token = sp.token ?? "";
  const next = sp.next ?? "/dashboard";

  return <ResetPasswordForm token={token} next={next} />;
}
