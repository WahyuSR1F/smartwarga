import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("household membership UI contract", () => {
  it("keeps the household selector outside the manager-only mutation block", () => {
    const selectorStart = workspaceSource.indexOf('<select value={householdId}');
    const managerGateStart = workspaceSource.indexOf("{canManageMembers && <>");
    const memberListStart = workspaceSource.indexOf("{householdId && <div");

    expect(selectorStart).toBeGreaterThan(-1);
    expect(managerGateStart).toBeGreaterThan(-1);
    expect(memberListStart).toBeGreaterThan(-1);
    expect(selectorStart).toBeLessThan(managerGateStart);
    expect(managerGateStart).toBeLessThan(memberListStart);
  });

  it("gates the add-member action on the shared manager permission", () => {
    expect(workspaceSource).toContain("{canManageMembers && <Button");
    expect(workspaceSource).toContain("canManageMembers={canManageHouseholdMembers(membershipRole)}");
  });
});
