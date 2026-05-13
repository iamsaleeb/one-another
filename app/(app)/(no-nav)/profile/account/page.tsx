import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { DeleteAccountForm } from "./_components/delete-account-form";

export const metadata: Metadata = {
  title: "Delete Account — One Another",
};

export default function DeleteAccountPage() {
  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
            <TriangleAlert
              className="text-destructive h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">Delete Account</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Consequence list */}
        <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-2 rounded-2xl border p-4">
          <p className="text-destructive text-sm font-semibold">
            What will be deleted:
          </p>
          <ul className="flex flex-col gap-1.5">
            {[
              "Event registrations",
              "Church and series follows",
              "Notification preferences",
              "Your profile and account",
            ].map((item) => (
              <li
                key={item}
                className="text-muted-foreground flex items-start gap-2 text-sm"
              >
                <span className="text-destructive mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-1 text-xs">
            Events and series you created will remain but will no longer be
            linked to you.
          </p>
        </div>

        {/* Inline confirmation form */}
        <DeleteAccountForm />
      </div>
    </div>
  );
}
