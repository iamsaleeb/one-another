import { can } from "../lib/can";
import { Capabilities } from "../lib/capabilities";
import type { RoleClaims } from "../lib/types";

export const seriesPolicy = {
  canCreate: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.SERIES_CREATE, { scope: "CHURCH", churchId }),
  canUpdate: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.SERIES_UPDATE, { scope: "CHURCH", churchId }),
  canDelete: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.SERIES_DELETE, { scope: "CHURCH", churchId }),
  canAddSession: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.EVENT_CREATE, { scope: "CHURCH", churchId }),
};
