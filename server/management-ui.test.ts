import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("management UI role contracts", () => {
  it("passes manager permission into event and announcement views", () => {
    expect(workspaceSource).toContain("<EventsView organizationId={organizationId} canManageEvents={canManageHouseholdMembers(membershipRole)} />");
    expect(workspaceSource).toContain("<AnnouncementsView organizationId={organizationId} canManageAnnouncements={canManageHouseholdMembers(membershipRole)} />");
  });

  it("gates event creation and announcement drafting on manager permission", () => {
    expect(workspaceSource).toContain("{canManageEvents && <Button");
    expect(workspaceSource).toContain("{canManageEvents && <div className=\"mx-5 mb-3 grid");
    expect(workspaceSource).toContain("{canManageEvents && showForm &&");
    expect(workspaceSource).toContain("{canManageAnnouncements && <Card");
    expect(workspaceSource).toContain("canManageAnnouncements && item.status === \"draft\"");
  });
});
