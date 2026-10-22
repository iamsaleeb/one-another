import "server-only";
import { buildAbility, type AppAbility } from "./ability";

// Unrestricted Ability for trusted callers with no session (cron, workers,
// seed). Never derive this from a request. Imports are restricted by ESLint.
export function systemAbility(): AppAbility {
  return buildAbility({
    isPlatformAdmin: true,
    church: [],
    series: [],
    event: [],
  });
}
