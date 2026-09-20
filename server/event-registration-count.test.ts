import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("event registration count contract", () => {
  it("excludes cancelled registrations from attendee aggregates", () => {
    expect(routerSource).toContain("eq(eventRegistrations.status, \"registered\")");
    expect(routerSource).toContain("count(eventRegistrations.userId)");
  });
});
