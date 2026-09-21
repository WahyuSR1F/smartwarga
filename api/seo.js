// api-src/seo.ts
import fs from "node:fs";
import path from "node:path";

// server/_core/seo.ts
var SITE_NAME = "Smart Warga";
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function titleCaseSlug(slug) {
  return slug.split("-").filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") || "Ruang Warga";
}
function renderServerSeoHead(requestUrl) {
  const pathname = new URL(requestUrl, "http://localhost").pathname;
  const parts = pathname.split("/").filter(Boolean);
  const segment = parts[0];
  const slug = titleCaseSlug(parts[1] ?? "kampung-melati");
  const content = segment === "acara" ? { title: `${slug} \xB7 Agenda Warga \xB7 ${SITE_NAME}`, description: `Informasi agenda warga ${slug}, termasuk waktu, lokasi, dan partisipasi komunitas.` } : segment === "donasi" ? { title: `${slug} \xB7 Kampanye Sosial \xB7 ${SITE_NAME}`, description: `Informasi kampanye sosial ${slug} dan pembaruan akuntabilitas dana warga.` } : segment === "wilayah" ? { title: `${slug} \xB7 Profil Wilayah \xB7 ${SITE_NAME}`, description: `Profil publik wilayah ${slug}, agenda, layanan, dan informasi komunitas.` } : { title: `${SITE_NAME} \xB7 Ruang Bersama`, description: "Platform administrasi dan komunikasi komunitas RT/RW yang terarah." };
  const canonical = requestUrl.split("?")[0] || "/";
  const origin = (process.env.CANONICAL_ORIGIN ?? "").replace(/\/$/, "");
  const absoluteCanonical = escapeHtml(`${origin}${canonical}`);
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@type": segment && segment !== "wilayah" ? "Article" : "WebPage", name: content.title, description: content.description, url: `${origin}${canonical}`, isPartOf: { "@type": "WebSite", name: process.env.SITE_NAME ?? SITE_NAME, url: origin || canonical } }).replace(/</g, "\\u003c");
  return `<title>${escapeHtml(content.title)}</title><meta name="description" content="${escapeHtml(content.description)}" /><link rel="canonical" href="${absoluteCanonical}" /><meta property="og:title" content="${escapeHtml(content.title)}" /><meta property="og:description" content="${escapeHtml(content.description)}" /><meta property="og:type" content="${segment === "wilayah" || !segment ? "website" : "article"}" /><meta property="og:url" content="${absoluteCanonical}" /><meta property="og:site_name" content="${escapeHtml(process.env.SITE_NAME ?? SITE_NAME)}" /><meta name="twitter:card" content="summary" /><script type="application/ld+json" data-smart-warga-jsonld>${jsonLd}</script>`;
}
function injectServerSeo(template, requestUrl) {
  return template.replace("<!--app-head-->", renderServerSeoHead(requestUrl));
}

// api-src/seo.ts
var cachedTemplate = null;
function readShellTemplate() {
  if (!cachedTemplate) {
    const candidates = [
      path.join(__dirname, "shell.html"),
      path.join(process.cwd(), "api", "shell.html"),
      path.join(process.cwd(), "dist", "public", "index.html")
    ];
    for (const candidate of candidates) {
      try {
        cachedTemplate = fs.readFileSync(candidate, "utf8");
        break;
      } catch {
      }
    }
    if (!cachedTemplate) throw new Error("index.html shell not found");
  }
  return cachedTemplate;
}
async function handler(req, res) {
  const requestUrl = `https://${req.headers.host}${req.url}`;
  try {
    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(injectServerSeo(readShellTemplate(), requestUrl));
  } catch {
    res.status(500).send("Shell template unavailable");
  }
}
export {
  handler as default
};
