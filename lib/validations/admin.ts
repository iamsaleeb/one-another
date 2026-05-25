// Re-exported from churches domain. Left here for backward compat until Task 7 migrates admin actions.
export {
  addOrganiserSchema,
  removeOrganiserSchema,
} from "@/domains/churches/validations/churches";
export type {
  AddOrganiserInput,
  RemoveOrganiserInput,
} from "@/domains/churches/validations/churches";
