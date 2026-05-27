"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addOrganiserToChurchAction,
  removeOrganiserFromChurchAction,
  type AdminActionState,
} from "@/domains/admin/actions/admin";

interface Organiser {
  id: string;
  name: string | null;
  email: string;
}

interface AdminChurchCardProps {
  church: {
    id: string;
    name: string;
    organisers: Organiser[];
  };
}

const initialState: AdminActionState = {};

export function AdminChurchCard({ church }: AdminChurchCardProps) {
  const [addState, addAction, addPending] = useActionState(
    addOrganiserToChurchAction,
    initialState
  );

  const [removeState, removeAction, removePending] = useActionState(
    removeOrganiserFromChurchAction,
    initialState
  );

  return (
    <div className="shadow-card flex flex-col gap-5 rounded-2xl bg-white p-5">
      <h2 className="text-base font-semibold">{church.name}</h2>

      {/* Organisers list */}
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
          Organisers
        </p>
        {church.organisers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No organisers assigned yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {church.organisers.map((organiser) => (
              <li
                key={organiser.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {organiser.name ?? organiser.email}
                  </span>
                  {organiser.name && (
                    <span className="text-muted-foreground truncate text-xs">
                      {organiser.email}
                    </span>
                  )}
                </div>
                <form action={removeAction}>
                  <input type="hidden" name="churchId" value={church.id} />
                  <input
                    type="hidden"
                    name="targetUserId"
                    value={organiser.id}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive size-8 shrink-0"
                    disabled={removePending}
                    aria-label={`Remove ${organiser.name ?? organiser.email}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {removeState.error && (
          <p className="text-destructive text-xs">{removeState.error}</p>
        )}
        {removeState.success && (
          <p className="text-xs text-green-600">{removeState.success}</p>
        )}
      </div>

      {/* Add organiser form */}
      <form action={addAction} className="flex flex-col gap-3">
        <input type="hidden" name="churchId" value={church.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`email-${church.id}`}>Add organiser by email</Label>
          <div className="flex gap-2">
            <Input
              id={`email-${church.id}`}
              name="email"
              type="email"
              placeholder="organiser@example.com"
              disabled={addPending}
              required
            />
            <Button type="submit" disabled={addPending} className="shrink-0">
              Add
            </Button>
          </div>
        </div>
        {addState.error && (
          <p className="text-destructive text-xs">{addState.error}</p>
        )}
        {addState.success && (
          <p className="text-xs text-green-600">{addState.success}</p>
        )}
      </form>
    </div>
  );
}
