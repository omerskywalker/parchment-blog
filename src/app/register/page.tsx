import RegisterForm from "./register-form";

type Props = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const next = sp.next ?? "/dashboard";

  return <RegisterForm next={next} />;
}
