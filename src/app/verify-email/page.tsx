import Link from "next/link";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const error = sp.error;

  return (
    <main className="grid min-h-[calc(100vh-60px)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-[rgb(var(--card-foreground))] shadow-sm">
        {error === "invalid" || error === "expired" ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              {error === "expired" ? "Link expired" : "Invalid link"}
            </h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              {error === "expired"
                ? "This verification link has expired. Please request a new one from your dashboard."
                : "This verification link is invalid. It may have already been used."}
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-block rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
              >
                Go to dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              We sent a verification link to your email address. Click the link to verify your
              account. The link is valid for 24 hours.
            </p>
            <p className="mt-4 text-sm text-[rgb(var(--muted))]">
              Didn&apos;t get it?{" "}
              <Link
                href="/dashboard"
                className="font-medium text-[rgb(var(--card-foreground))] underline underline-offset-4 hover:opacity-90"
              >
                Resend from your dashboard.
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
