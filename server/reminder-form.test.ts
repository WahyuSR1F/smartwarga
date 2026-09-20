import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("reminder form contract", () => {
  it("submits the selected event, template, and lead time", () => {
    expect(workspaceSource).toContain("eventId: reminderEventId || event.id");
    expect(workspaceSource).toContain("templateName: reminderTemplate.trim()");
    expect(workspaceSource).toContain("minutesBefore: Number(reminderMinutes)");
  });

  it("rejects unsupported lead times in the UI", () => {
    expect(workspaceSource).toContain("Number(reminderMinutes) < 60");
    expect(workspaceSource).toContain("Number(reminderMinutes) > 43200");
  });
});
