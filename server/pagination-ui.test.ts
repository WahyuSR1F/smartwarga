import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("event and announcement pagination contracts", () => {
  it("uses bounded limit and page-derived offsets in the workspace", () => {
    expect(workspaceSource).toContain("trpc.events.list.useQuery({ organizationId: organizationId ?? \"pending\", limit: 20, offset: page * 20 }");
    expect(workspaceSource).toContain("trpc.announcements.list.useQuery({ organizationId: organizationId ?? \"pending\", limit: 20, offset: page * 20 }");
    expect(workspaceSource).toContain("disabled={!organizationId || visibleEvents.length < 20}");
    expect(workspaceSource).toContain("disabled={!organizationId || items.length < 20}");
  });

  it("bounds list inputs on the server", () => {
    expect(routerSource).toContain("events: router({");
    expect(routerSource).toContain("announcements: router({");
    expect(routerSource.match(/list: protectedProcedure\.input\(organizationIdInput\.extend\(\{ limit: z\.number\(\)\.int\(\)\.min\(1\)\.max\(100\)\.default\(20\), offset: z\.number\(\)\.int\(\)\.min\(0\)\.default\(0\) \}\)\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
