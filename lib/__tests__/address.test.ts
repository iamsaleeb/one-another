import { formatFullAddress, formatLocality } from "@/lib/address";

const full = {
  street: "12 Main St",
  suburb: "Guildford",
  city: "Sydney",
  state: "NSW",
  postcode: "2161",
};

describe("formatFullAddress", () => {
  it("joins every part with the state and postcode together", () => {
    expect(formatFullAddress(full)).toBe(
      "12 Main St, Guildford, Sydney, NSW 2161"
    );
  });

  it("skips the parts an address doesn't have", () => {
    expect(
      formatFullAddress({ ...full, suburb: null, state: null, postcode: null })
    ).toBe("12 Main St, Sydney");
    expect(formatFullAddress({ ...full, state: null })).toBe(
      "12 Main St, Guildford, Sydney, 2161"
    );
  });
});

describe("formatLocality", () => {
  it("shows the suburb and city", () => {
    expect(formatLocality(full)).toBe("Guildford, Sydney");
  });

  it("shows only the city when there is no suburb", () => {
    expect(formatLocality({ suburb: null, city: "Sydney" })).toBe("Sydney");
  });
});
