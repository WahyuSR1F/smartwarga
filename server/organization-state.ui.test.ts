import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");

describe("organization shell state contract", () => {
  it("shows a non-sensitive error banner when membership loading fails", () => {
    expect(layoutSource).toContain("isError: membershipsError");
    expect(layoutSource).toContain('role="alert"');
    expect(layoutSource).toContain("Wilayah aktif belum dapat dimuat");
  });
});
