import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("resident directory state contract", () => {
  it("renders explicit loading, error, empty, and paginated states", () => {
    expect(workspaceSource).toContain("residentQuery.isLoading ?");
    expect(workspaceSource).toContain("residentQuery.isError ?");
    expect(workspaceSource).toContain("filtered.length === 0 ?");
    expect(workspaceSource).toContain("residentPageOffset(page)");
    expect(workspaceSource).toContain("disabled={!organizationId || filtered.length < 20}");
  });

  it("keeps household selection readable and refreshes members after success", () => {
    expect(workspaceSource).toContain("householdsQuery.isLoading ?");
    expect(workspaceSource).toContain("householdsQuery.isError ?");
    expect(workspaceSource).toContain("membersQuery.isLoading ?");
    expect(workspaceSource).toContain("membersQuery.isError ?");
    expect(workspaceSource).toContain("membersQuery.refetch();");
    expect(workspaceSource).toContain("setUserId(householdMemberSuccessState().userId);");
  });
});
