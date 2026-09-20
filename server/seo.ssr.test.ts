import { afterEach, describe, expect, it } from "vitest";
import { composeSsrHtml, renderServerSeoHead } from "./_core/seo";

describe("server-rendered SEO", () => {
  afterEach(() => {
    delete process.env.CANONICAL_ORIGIN;
    delete process.env.SITE_NAME;
  });

  it("renders absolute route metadata and structured data when an origin is configured", () => {
    process.env.CANONICAL_ORIGIN = "https://warga.example.test/";
    process.env.SITE_NAME = "Warga Example";
    const head = renderServerSeoHead("/acara/kerja-bakti?utm_source=test");

    expect(head).toContain("<title>Kerja Bakti · Agenda Warga · Smart Warga</title>");
    expect(head).toContain('href="https://warga.example.test/acara/kerja-bakti"');
    expect(head).toContain('property="og:url" content="https://warga.example.test/acara/kerja-bakti"');
    expect(head).toContain('data-smart-warga-jsonld');
    expect(head).toContain('"@type":"Article"');
  });

  it("composes rendered markup and serialized hydration state into the template", () => {
    process.env.CANONICAL_ORIGIN = "https://warga.example.test";
    const html = composeSsrHtml("<head><!--app-head--></head><body><div id=\"root\"><!--app-html--></div></body>", "/", { html: "<main>Warga</main>", dehydratedState: { queries: [] } });

    expect(html).toContain("<main>Warga</main>");
    expect(html).toContain("window.__RQ_STATE__");
    expect(html).toContain("<title>Smart Warga · Ruang Bersama</title>");
  });
});
