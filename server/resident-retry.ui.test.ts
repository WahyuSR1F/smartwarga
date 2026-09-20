import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("resident retry contract", () => {
  it("offers retry for resident-directory failures", () => {
    expect(workspaceSource).toContain("residentQuery.refetch()");
    expect(workspaceSource).toContain(">Coba lagi</Button>");
  });

  it("offers retry for household-member failures", () => {
    expect(workspaceSource).toContain("membersQuery.refetch()");
  });
});
