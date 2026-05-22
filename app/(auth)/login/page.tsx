import { Suspense } from "react";
import { UnifiedAuthForm } from "@/components/auth/unified-auth-form";

const devMode = process.env.VERCEL_ENV !== "production";

export default function LoginPage() {
  return (
    <Suspense>
      <UnifiedAuthForm className="w-full max-w-sm" devMode={devMode} />
    </Suspense>
  );
}
