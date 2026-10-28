"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import {
  addOrganiserSchema,
  type AddOrganiserInput,
} from "@/domains/churches/validations/churches";

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

export function AdminChurchCard({ church }: AdminChurchCardProps) {
  const form = useForm<AddOrganiserInput>({
    resolver: zodResolver(addOrganiserSchema),
    defaultValues: { churchId: church.id, email: "" },
  });
  const { isSubmitting } = form.formState;
  const [addSuccess, setAddSuccess] = useState<string>();

  const [removeState, setRemoveState] = useState<AdminActionState>({});
  const [removePending, startRemove] = useTransition();

  const onAdd = form.handleSubmit(async (data) => {
    setAddSuccess(undefined);
    const result = await addOrganiserToChurchAction(data);
    if (result.error) {
      form.setError("email", { message: result.error });
      return;
    }
    form.reset({ churchId: church.id, email: "" });
    setAddSuccess(result.success);
  });

  function handleRemove(targetUserId: string) {
    startRemove(async () => {
      setRemoveState(
        await removeOrganiserFromChurchAction({
          churchId: church.id,
          targetUserId,
        })
      );
    });
  }

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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive size-8 shrink-0"
                    disabled={removePending}
                    onClick={() => handleRemove(organiser.id)}
                    aria-label={`Remove ${organiser.name ?? organiser.email}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
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
      <form onSubmit={onAdd} noValidate className="flex flex-col gap-3">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`email-${church.id}`}>
                Add organiser by email
              </FieldLabel>
              <ButtonGroup className="w-full">
                <Input
                  id={`email-${church.id}`}
                  type="email"
                  placeholder="organiser@example.com"
                  disabled={isSubmitting}
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <Button type="submit" disabled={isSubmitting}>
                  Add
                </Button>
              </ButtonGroup>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        {addSuccess && <p className="text-success text-xs">{addSuccess}</p>}
      </form>
    </Card>
  );
}
