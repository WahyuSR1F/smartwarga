export const forumScopeTypes = ["general", "event", "announcement", "campaign"] as const;

export type ForumScopeType = (typeof forumScopeTypes)[number];

export function nextForumScope(scopeType: ForumScopeType): { scopeType: ForumScopeType; scopeId: string } {
  return { scopeType, scopeId: "" };
}

export function normalizeForumScope(scopeType: ForumScopeType, scopeId: string): { scopeType: ForumScopeType; scopeId: string | undefined } {
  return { scopeType, scopeId: scopeType === "general" || !scopeId ? undefined : scopeId };
}

export function buildForumTopicInput(input: {
  organizationId: string;
  title: string;
  scopeType: ForumScopeType;
  scopeId: string;
}) {
  const activeScope = normalizeForumScope(input.scopeType, input.scopeId.trim());
  return {
    organizationId: input.organizationId,
    title: input.title.trim(),
    scopeType: activeScope.scopeType,
    scopeId: activeScope.scopeId,
  };
}
