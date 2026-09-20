import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("campaign and forum retry contract", () => {
  it("offers retry for campaign-list failures", () => {
    expect(workspaceSource).toContain("campaignQuery.refetch()");
    expect(workspaceSource).toContain("Kampanye belum dapat dimuat.");
  });

  it("offers retry for forum-topic failures", () => {
    expect(workspaceSource).toContain("topicQuery.refetch()");
    expect(workspaceSource).toContain("Diskusi belum dapat dimuat.");
  });
});
