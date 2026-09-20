import { describe, expect, it } from "vitest";
import { organizationPath, selectActiveMembership } from "../client/src/lib/active-membership";

const memberships = [
  { organization: { id: "rw-04", name: "RW 04" }, membership: { role: "resident" } },
  { organization: { id: "rw-07", name: "RW 07" }, membership: { role: "rw_admin" } },
];

describe("active organization selection", () => {
  it("honors a requested organization that belongs to the user", () => {
    expect(selectActiveMembership(memberships, "rw-07")?.organization.id).toBe("rw-07");
  });

  it("falls back safely when the requested organization is absent", () => {
    expect(selectActiveMembership(memberships, "outsider")?.organization.id).toBe("rw-04");
    expect(selectActiveMembership(undefined)?.organization.id).toBeUndefined();
  });

  it("preserves the current page while encoding the selected organization", () => {
    expect(organizationPath("/app/warga", "rw 07")).toBe("/app/warga?organization=rw%2007");
  });
});
