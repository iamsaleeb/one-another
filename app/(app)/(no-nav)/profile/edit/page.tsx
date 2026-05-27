import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/auth";
import { getProfileUser } from "@/domains/profile/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { EditProfileForm } from "./_components/edit-profile-form";
import type { OnboardingInput } from "@/domains/profile/validations/onboarding";

export const metadata: Metadata = {
  title: "Edit Profile — One Another",
};

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = session.user;
  const dbUser = await getProfileUser(user.id);

  const defaultValues: OnboardingInput = {
    name: user.name ?? "",
    image: user.image ?? undefined,
    phone: dbUser?.phone ?? "",
    dateOfBirth: dbUser?.dateOfBirth
      ? format(dbUser.dateOfBirth, "yyyy-MM-dd")
      : undefined,
  };

  return (
    <div className="bg-background">
      <PageHeader title="Edit Profile" />
      <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
        <EditProfileForm defaultValues={defaultValues} />
      </div>
    </div>
  );
}
