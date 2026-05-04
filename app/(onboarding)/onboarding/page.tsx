import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.onboardingCompleted) {
    redirect("/");
  }

  return (
    <OnboardingForm />
  );
}
