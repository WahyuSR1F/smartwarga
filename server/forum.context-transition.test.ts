import { describe, expect, it } from "vitest";
import { buildForumTopicInput, nextForumScope } from "../client/src/lib/forum-context";

describe("forum context scope transitions", () => {
  it("clears a stale context ID when switching scope", () => {
    expect(nextForumScope("campaign")).toEqual({ scopeType: "campaign", scopeId: "" });
    expect(nextForumScope("event")).toEqual({ scopeType: "event", scopeId: "" });
  });

  it("builds the exact create-topic payload from the active scope", () => {
    expect(buildForumTopicInput({ organizationId: "org-1", title: "  Kabar warga  ", scopeType: "general", scopeId: "campaign-1" })).toEqual({ organizationId: "org-1", title: "Kabar warga", scopeType: "general", scopeId: undefined });
    expect(buildForumTopicInput({ organizationId: "org-1", title: "  Rapat  ", scopeType: "event", scopeId: "event-1" })).toEqual({ organizationId: "org-1", title: "Rapat", scopeType: "event", scopeId: "event-1" });
  });
});
