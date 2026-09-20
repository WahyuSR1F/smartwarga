import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("event and announcement retry contract", () => {
  it("offers retry for event-list failures", () => {
    expect(workspaceSource).toContain("eventQuery.refetch()");
    expect(workspaceSource).toContain("Agenda belum dapat dimuat.");
  });

  it("offers retry for announcement-list failures", () => {
    expect(workspaceSource).toContain("announcements.refetch()");
    expect(workspaceSource).toContain("Pengumuman belum dapat dimuat.");
  });
});
