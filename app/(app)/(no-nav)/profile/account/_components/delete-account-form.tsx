"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/lib/actions/auth";

const CONFIRM_PHRASE = "delete my account";

export function DeleteAccountForm() {
  const [confirmValue, setConfirmValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmValue.toLowerCase() === CONFIRM_PHRASE;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfirmed || isPending) return;
    startTransition(async () => {
      await deleteAccountAction();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white shadow-card p-4 flex flex-col gap-4">
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
      <Button
        type="submit"
        variant="destructive"
        className="w-full"
        disabled={!isConfirmed || isPending}
      >
        {isPending ? "Deleting…" : "Delete My Account"}
      </Button>
    </form>
  );
}
