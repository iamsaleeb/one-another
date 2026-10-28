"use client";

import { Card } from "@/components/ui/card";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
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
    <Card className="gap-5 p-5">
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
          <ItemGroup className="gap-2">
            {church.organisers.map((organiser) => (
              <Item key={organiser.id} role="listitem" className="gap-2 p-0">
                <ItemContent className="min-w-0 gap-0">
                  <ItemTitle className="w-full truncate">
                    {organiser.name ?? organiser.email}
                  </ItemTitle>
                  {organiser.name && (
                    <ItemDescription className="truncate text-xs">
                      {organiser.email}
                    </ItemDescription>
                  )}
                </ItemContent>
                <ItemActions>
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
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
        {removeState.error && (
          <p className="text-destructive text-xs">{removeState.error}</p>
        )}
        {removeState.success && (
          <p className="text-success text-xs">{removeState.success}</p>
        )}
      </div>

      {/* Add organiser form */}
      <form action={addAction} className="flex flex-col gap-3">
        <input type="hidden" name="churchId" value={church.id} />
        <Field data-invalid={!!addState.error}>
          <FieldLabel htmlFor={`email-${church.id}`}>
            Add organiser by email
          </FieldLabel>
          <ButtonGroup className="w-full">
            <Input
              id={`email-${church.id}`}
              name="email"
              type="email"
              placeholder="organiser@example.com"
              disabled={addPending}
              aria-invalid={!!addState.error}
              required
            />
            <Button type="submit" disabled={addPending}>
              Add
            </Button>
          </ButtonGroup>
          {addState.error && <FieldError>{addState.error}</FieldError>}
        </Field>
        {addState.success && (
          <p className="text-success text-xs">{addState.success}</p>
        )}
      </form>
    </Card>
  );
}
