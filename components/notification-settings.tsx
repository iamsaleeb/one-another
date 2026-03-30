"use client";

import { useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { NOTIFICATION_TYPES, type NotificationTypeKey } from "@/lib/notification-types";
import { updateNotificationPreferenceAction, type NotificationPreferenceMap } from "@/lib/actions/notifications";

interface Props {
  preferences: NotificationPreferenceMap;
}

export function NotificationSettings({ preferences }: Props) {
  const [, startTransition] = useTransition();
  const [optimisticPrefs, updateOptimistic] = useOptimistic(
    preferences,
    (state, update: { type: NotificationTypeKey; enabled: boolean; config?: Record<string, unknown> }) => ({
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
      updateOptimistic({ type, enabled, config: currentConfig as Record<string, unknown> | undefined });
      await updateNotificationPreferenceAction(
        type,
        enabled,
        currentConfig as Record<string, unknown> | undefined
      );
    });
  }

  function handleConfigChange(type: NotificationTypeKey, key: string, value: number) {
    startTransition(async () => {
      const newConfig = { ...(optimisticPrefs[type].config as Record<string, unknown>), [key]: value };
      updateOptimistic({ type, enabled: optimisticPrefs[type].enabled, config: newConfig });
      await updateNotificationPreferenceAction(type, optimisticPrefs[type].enabled, newConfig);
    });
  }

  return (
    <div className="space-y-3">
      {(Object.keys(NOTIFICATION_TYPES) as NotificationTypeKey[]).map((key) => {
        const typeDef = NOTIFICATION_TYPES[key];
        const pref = optimisticPrefs[key];
        const typeConfig = (typeDef as { config?: { hoursBeforeEvent: { options: readonly number[]; optionLabels: Record<number, string>; label: string } } }).config;

        return (
          <div key={key} className="rounded-2xl bg-white shadow-card overflow-hidden">
            <div className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{typeDef.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{typeDef.description}</p>
              </div>
              <Switch
                checked={pref.enabled}
                onCheckedChange={(enabled) => handleToggle(key, enabled)}
                className="mt-0.5 shrink-0"
              />
            </div>

            {typeConfig && pref.enabled && (
              <div className="px-4 pb-3 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{typeConfig.hoursBeforeEvent.label}</span>
                  <NativeSelect
                    size="sm"
                    value={(pref.config as { hoursBeforeEvent: number } | undefined)?.hoursBeforeEvent ?? 2}
                    onChange={(e) =>
                      handleConfigChange(key, "hoursBeforeEvent", Number(e.target.value))
                    }
                  >
                    {typeConfig.hoursBeforeEvent.options.map((hours) => (
                      <NativeSelectOption key={hours} value={hours}>
                        {typeConfig.hoursBeforeEvent.optionLabels[hours as keyof typeof typeConfig.hoursBeforeEvent.optionLabels]}
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
