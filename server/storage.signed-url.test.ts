import { afterEach, describe, expect, it, vi } from "vitest";
import { createPrivateSignedUrl } from "./supabaseStorage";

describe("private storage signed URLs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("requests a five-minute signed URL and normalizes the relative response", async () => {
    process.env.SUPABASE_URL = "https://storage.example.test/";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ signedURL: "/object/sign/payment-proof/households/proof 1.png?token=abc" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const url = await createPrivateSignedUrl({ bucket: "payment-proof", path: "households/proof 1.png", expiresInSeconds: 300 });

    expect(url).toBe("https://storage.example.test/storage/v1/object/sign/payment-proof/households/proof 1.png?token=abc");
    expect(fetchMock).toHaveBeenCalledWith("https://storage.example.test/storage/v1/object/sign/payment-proof/households/proof%201.png", expect.objectContaining({ method: "POST", body: JSON.stringify({ expiresIn: 300 }) }));
  });

  it("rejects a provider response without a signed URL", async () => {
    process.env.SUPABASE_URL = "https://storage.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));

    await expect(createPrivateSignedUrl({ bucket: "payment-proof", path: "proof.png", expiresInSeconds: 120 })).rejects.toThrow("did not return a signed URL");
  });
});
