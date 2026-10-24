export interface AddressParts {
  street: string;
  suburb: string | null;
  city: string;
  state: string | null;
  postcode: string | null;
}

/**
 * Every part of an address on one line, skipping the parts it doesn't have.
 *
 * Output: "12 Main St, Guildford, Sydney, NSW 2161"
 */
export function formatFullAddress(address: AddressParts): string {
  const statePostcode = [address.state, address.postcode]
    .filter(Boolean)
    .join(" ");
  return [address.street, address.suburb, address.city, statePostcode]
    .filter(Boolean)
    .join(", ");
}

/**
 * Where an address is, without the street: for cards and lists.
 *
 * Output: "Guildford, Sydney"
 */
export function formatLocality(
  address: Pick<AddressParts, "suburb" | "city">
): string {
  return [address.suburb, address.city].filter(Boolean).join(", ");
}
