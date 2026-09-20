import { describe, expect, it } from "vitest";
import { canManageHouseholdMembers } from "../client/src/lib/household-access";

describe("canManageHouseholdMembers", () => {
  it("allows only organization managers to mutate household membership", () => {
    expect(canManageHouseholdMembers("platform_admin")).toBe(true);
    expect(canManageHouseholdMembers("organization_admin")).toBe(true);
    expect(canManageHouseholdMembers("rw_admin")).toBe(true);
    expect(canManageHouseholdMembers("rt_admin")).toBe(true);
  });

  it("keeps treasurers, residents, and missing roles read-only", () => {
    expect(canManageHouseholdMembers("treasurer")).toBe(false);
    expect(canManageHouseholdMembers("resident")).toBe(false);
    expect(canManageHouseholdMembers(undefined)).toBe(false);
    expect(canManageHouseholdMembers(null)).toBe(false);
  });
});
