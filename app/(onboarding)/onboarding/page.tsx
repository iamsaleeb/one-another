import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.onboardingCompleted) {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;
  return <OnboardingWizard callbackUrl={callbackUrl} />;
}
