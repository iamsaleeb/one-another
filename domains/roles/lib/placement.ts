import "server-only";
import { eventSubject, seriesSubject, type AppAbility } from "./ability";
import { getChurchTargets } from "./scopes";

// Placement (see GLOSSARY.md): where an Event or Series may sit. Moving one
// needs authority to create one at the destination, and the user must still
// be able to edit it once it lands there: otherwise the move would lock them
// out of their own Event or Series. The saves and the edit pages' Church
// dropdowns both ask here, so the dropdown never offers a move the save
// refuses.

export type Placed =
  | { type: "Event"; id: string; churchId: string; seriesId: string | null }
  | { type: "Series"; id: string; churchId: string };

// May `placed`, as it would be after the move, sit there?
export function canPlace(ability: AppAbility, placed: Placed): boolean {
  if (placed.type === "Event") {
    const { id, churchId, seriesId } = placed;
    return (
      ability.can("create", eventSubject({ churchId, seriesId })) &&
      ability.can("update", eventSubject({ id, churchId, seriesId }))
    );
  }
  const { id, churchId } = placed;
  return (
    ability.can("create", seriesSubject({ churchId })) &&
    ability.can("update", seriesSubject({ id, churchId }))
  );
}

interface ChurchOption {
  id: string;
  name: string;
}

// The Church dropdown for `placed`: the Church it is in now, plus every
// Church it may move to. An Event moved to another Church leaves its Series.
export async function placementTargets(
  ability: AppAbility,
  placed: Placed,
  current: ChurchOption | null
): Promise<ChurchOption[]> {
  const candidates = await getChurchTargets(
    placed.type === "Event" ? "create_event" : "create_series",
    ability
  );
  const targets = candidates.filter(
    (c) =>
      c.id === placed.churchId ||
      canPlace(
        ability,
        placed.type === "Event"
          ? { ...placed, churchId: c.id, seriesId: null }
          : { ...placed, churchId: c.id }
      )
  );
  return current && !targets.some((c) => c.id === current.id)
    ? [current, ...targets]
    : targets;
}
