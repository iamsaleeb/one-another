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
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
            <TriangleAlert className="w-6 h-6 text-destructive" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">Delete Account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Consequence list */}
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-destructive">What will be deleted:</p>
          <ul className="flex flex-col gap-1.5">
            {[
              "Event registrations",
              "Church and series follows",
              "Notification preferences",
              "Your profile and account",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-destructive mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-1">
            Events and series you created will remain but will no longer be linked to you.
          </p>
        </div>

        {/* Inline confirmation form */}
        <DeleteAccountForm />
      </div>
    </div>
  );
}
