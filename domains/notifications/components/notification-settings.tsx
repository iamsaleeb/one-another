"use client";

import { useOptimistic, useTransition } from "react";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  NOTIFICATION_TYPES,
  type NotificationTypeKey,
} from "@/domains/notifications/types";
import {
  updateNotificationPreferenceAction,
  type NotificationPreferenceMap,
} from "../actions/notifications";

interface Props {
  preferences: NotificationPreferenceMap;
}

export function NotificationSettings({ preferences }: Props) {
  const [, startTransition] = useTransition();
  const [optimisticPrefs, updateOptimistic] = useOptimistic(
    preferences,
    (
      state,
      update: {
        type: NotificationTypeKey;
        enabled: boolean;
        config?: Record<string, unknown>;
      }
    ) => ({
      ...state,
      [update.type]: {
        ...state[update.type],
        enabled: update.enabled,
        ...(update.config !== undefined ? { config: update.config } : {}),
      },
    })
  );

  function handleToggle(type: NotificationTypeKey, enabled: boolean) {
    startTransition(async () => {
      const currentConfig = optimisticPrefs[type].config;
      updateOptimistic({
        type,
        enabled,
        config: currentConfig as Record<string, unknown> | undefined,
      });
      await updateNotificationPreferenceAction(
        type,
        enabled,
        currentConfig as Record<string, unknown> | undefined
      );
    });
  }

  function handleConfigChange(
    type: NotificationTypeKey,
    key: string,
    value: number
  ) {
    startTransition(async () => {
      const newConfig = {
        ...(optimisticPrefs[type].config as Record<string, unknown>),
        [key]: value,
      };
      updateOptimistic({
        type,
        enabled: optimisticPrefs[type].enabled,
        config: newConfig,
      });
      await updateNotificationPreferenceAction(
        type,
        optimisticPrefs[type].enabled,
        newConfig
      );
    });
  }

  return (
    <div className="space-y-3">
      {(Object.keys(NOTIFICATION_TYPES) as NotificationTypeKey[]).map((key) => {
        const typeDef = NOTIFICATION_TYPES[key];
        const pref = optimisticPrefs[key];
        const typeConfig = (
          typeDef as {
            config?: {
              hoursBeforeEvent: {
                options: readonly number[];
                optionLabels: Record<number, string>;
                label: string;
              };
            };
          }
        ).config;

        return (
          <Card key={key} className="gap-0 overflow-hidden py-0">
            <Field orientation="horizontal" className="items-start px-4 py-3">
              <FieldContent className="gap-0.5">
                <FieldLabel htmlFor={`notify-${key}`}>
                  {typeDef.label}
                </FieldLabel>
                <FieldDescription className="text-xs leading-snug">
                  {typeDef.description}
                </FieldDescription>
              </FieldContent>
              <Switch
                id={`notify-${key}`}
                checked={pref.enabled}
                onCheckedChange={(enabled) => handleToggle(key, enabled)}
                className="mt-0.5"
              />
            </Field>

            {typeConfig && pref.enabled && (
              <>
                <Separator />
                <Field
                  orientation="horizontal"
                  className="justify-between px-4 py-3"
                >
                  <FieldLabel
                    htmlFor={`notify-${key}-hours`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    {typeConfig.hoursBeforeEvent.label}
                  </FieldLabel>
                  <NativeSelect
                    id={`notify-${key}-hours`}
                    size="sm"
                    value={
                      (pref.config as { hoursBeforeEvent: number } | undefined)
                        ?.hoursBeforeEvent ?? 2
                    }
                    onChange={(e) =>
                      handleConfigChange(
                        key,
                        "hoursBeforeEvent",
                        Number(e.target.value)
                      )
                    }
                  >
                    {typeConfig.hoursBeforeEvent.options.map((hours) => (
                      <NativeSelectOption key={hours} value={hours}>
                        {
                          typeConfig.hoursBeforeEvent.optionLabels[
                            hours as keyof typeof typeConfig.hoursBeforeEvent.optionLabels
                          ]
                        }
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
