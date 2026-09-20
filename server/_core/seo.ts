const SITE_NAME = "Smart Warga";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function titleCaseSlug(slug: string) {
  return slug.split("-").filter(Boolean).map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ") || "Ruang Warga";
}

export function renderServerSeoHead(requestUrl: string) {
  const pathname = new URL(requestUrl, "http://localhost").pathname;
  const parts = pathname.split("/").filter(Boolean);
  const segment = parts[0];
  const slug = titleCaseSlug(parts[1] ?? "kampung-melati");
  const content = segment === "acara"
    ? { title: `${slug} · Agenda Warga · ${SITE_NAME}`, description: `Informasi agenda warga ${slug}, termasuk waktu, lokasi, dan partisipasi komunitas.` }
    : segment === "donasi"
      ? { title: `${slug} · Kampanye Sosial · ${SITE_NAME}`, description: `Informasi kampanye sosial ${slug} dan pembaruan akuntabilitas dana warga.` }
      : segment === "wilayah"
        ? { title: `${slug} · Profil Wilayah · ${SITE_NAME}`, description: `Profil publik wilayah ${slug}, agenda, layanan, dan informasi komunitas.` }
        : { title: `${SITE_NAME} · Ruang Bersama`, description: "Platform administrasi dan komunikasi komunitas RT/RW yang terarah." };
  const canonical = requestUrl.split("?")[0] || "/";
  const origin = (process.env.CANONICAL_ORIGIN ?? "").replace(/\/$/, "");
  const absoluteCanonical = escapeHtml(`${origin}${canonical}`);
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@type": segment && segment !== "wilayah" ? "Article" : "WebPage", name: content.title, description: content.description, url: `${origin}${canonical}`, isPartOf: { "@type": "WebSite", name: process.env.SITE_NAME ?? SITE_NAME, url: origin || canonical } }).replace(/</g, "\\u003c");
  return `<title>${escapeHtml(content.title)}</title><meta name="description" content="${escapeHtml(content.description)}" /><link rel="canonical" href="${absoluteCanonical}" /><meta property="og:title" content="${escapeHtml(content.title)}" /><meta property="og:description" content="${escapeHtml(content.description)}" /><meta property="og:type" content="${segment === "wilayah" || !segment ? "website" : "article"}" /><meta property="og:url" content="${absoluteCanonical}" /><meta property="og:site_name" content="${escapeHtml(process.env.SITE_NAME ?? SITE_NAME)}" /><meta name="twitter:card" content="summary" /><script type="application/ld+json" data-smart-warga-jsonld>${jsonLd}</script>`;
}

export function injectServerSeo(template: string, requestUrl: string) {
  return template.replace("<!--app-head-->", renderServerSeoHead(requestUrl));
}

export function composeSsrHtml(template: string, requestUrl: string, rendered: { html: string; dehydratedState: unknown }) {
  const serializedState = JSON.stringify(rendered.dehydratedState).replace(/</g, "\\u003c");
  return template
    .replace("<!--app-head-->", renderServerSeoHead(requestUrl))
    .replace("<!--app-html-->", rendered.html)
    .replace("</body>", `<script>window.__RQ_STATE__=${JSON.stringify(serializedState)};</script></body>`);
}
