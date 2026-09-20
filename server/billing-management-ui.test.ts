import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("billing management UI contract", () => {
  it("passes a distinct billing-manager permission into the billing view", () => {
    expect(workspaceSource).toContain("canManageBilling={[\"platform_admin\", \"organization_admin\", \"rw_admin\", \"treasurer\"].includes(membershipRole ?? \"\")}");
    expect(workspaceSource).toContain("function BillingView({ organizationId, canReviewPayments = false, canManageBilling = false }");
  });

  it("renders a truthful empty state when no billing categories exist", () => {
    expect(workspaceSource).toContain("visibleInvoices.length ? visibleInvoices.map");
    expect(workspaceSource).toContain("Belum ada kategori tagihan di wilayah ini.");
  });

  it("gates category, period, and invoice administration controls", () => {
    expect(workspaceSource).toContain("canManageBilling && <Button");
    expect(workspaceSource).toContain("canManageBilling && showCategoryForm");
    expect(workspaceSource).toContain("canManageBilling && <div className=\"mx-5 mb-3 grid gap-2 rounded-2xl border border-[#dce8df]");
    expect(workspaceSource).toContain("canManageBilling && <div className=\"mx-5 mb-3 grid gap-2 rounded-2xl border border-[#dce8df] bg-white");
  });
});
