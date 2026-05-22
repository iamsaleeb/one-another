import { UnifiedAuthForm } from "@/components/auth/unified-auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    intent?: string;
    label?: string;
    callbackUrl?: string;
  }>;
}) {
  const { intent, label, callbackUrl } = await searchParams;
  return (
    <UnifiedAuthForm
      className="w-full max-w-sm"
      devMode={process.env.VERCEL_ENV !== "production"}
      intent={intent}
      label={label}
      callbackUrl={callbackUrl}
    />
  );
}
