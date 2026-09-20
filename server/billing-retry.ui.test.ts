import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/WorkspacePage.tsx", import.meta.url), "utf8");

describe("billing retry contract", () => {
  it("offers retry for resident payment-history failures", () => {
    expect(workspaceSource).toContain("myPaymentHistory.refetch()");
    expect(workspaceSource).toContain("Riwayat belum dapat dimuat.");
  });

  it("offers retry for reviewer pending-payment failures", () => {
    expect(workspaceSource).toContain("pendingPayments.refetch()");
    expect(workspaceSource).toContain("Pembayaran belum dapat dimuat.");
  });
});
