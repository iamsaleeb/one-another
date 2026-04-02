"use client";

import { useState, useTransition } from "react";
import { TriangleAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/lib/actions/auth";

const CONFIRM_PHRASE = "delete my account";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmValue.toLowerCase() === CONFIRM_PHRASE;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmValue("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfirmed || isPending) return;
    startTransition(async () => {
      await deleteAccountAction();
    });
  }

  return (
    <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-destructive/20">
        <TriangleAlert className="w-3.5 h-3.5 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Danger Zone</span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Permanently delete your account and all associated data, including event registrations,
          church follows, and notification preferences. This action cannot be undone.
        </p>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                This will permanently delete your account and all your data — event registrations,
                church and series follows, notification preferences, and your profile. Events and
                series you created will remain but will no longer be linked to you.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-delete" className="text-sm text-muted-foreground">
                  Type{" "}
                  <span className="font-semibold text-foreground">{CONFIRM_PHRASE}</span>{" "}
                  to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmValue}
                  onChange={(e) => setConfirmValue(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isPending}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={!isConfirmed || isPending}
                >
                  {isPending ? "Deleting…" : "Delete My Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
