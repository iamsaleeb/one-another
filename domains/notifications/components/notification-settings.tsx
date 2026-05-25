"use client";

import { useOptimistic, useTransition } from "react";
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
          <div
            key={key}
            className="shadow-card overflow-hidden rounded-2xl bg-white"
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug font-medium">
                  {typeDef.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                  {typeDef.description}
                </p>
              </div>
              <Switch
                checked={pref.enabled}
                onCheckedChange={(enabled) => handleToggle(key, enabled)}
                className="mt-0.5 shrink-0"
              />
            </div>

            {typeConfig && pref.enabled && (
              <div className="border-border border-t px-4 pt-3 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-xs">
                    {typeConfig.hoursBeforeEvent.label}
                  </span>
                  <NativeSelect
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
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
