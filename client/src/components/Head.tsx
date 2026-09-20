import { useEffect } from "react";

type HeadProps = { title: string; description: string; canonicalPath: string; type?: "website" | "article" };

export default function Head({ title, description, canonicalPath, type = "website" }: HeadProps) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, attribute: "name" | "property", content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attribute, selector.match(/['\"]([^'\"]+)['\"]/)?.[1] ?? ""); document.head.appendChild(tag); }
      tag.content = content;
    };
    setMeta('meta[name="description"]', "name", description);
    setMeta('meta[property="og:title"]', "property", title);
    setMeta('meta[property="og:description"]', "property", description);
    setMeta('meta[property="og:type"]', "property", type);
    setMeta('meta[property="og:site_name"]', "property", "Smart Warga");
    setMeta('meta[name="twitter:card"]', "name", "summary");
    setMeta('meta[name="twitter:title"]', "name", title);
    setMeta('meta[name="twitter:description"]', "name", description);
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.head.appendChild(document.createElement("link"));
    canonical.rel = "canonical";
    canonical.href = new URL(canonicalPath, window.location.origin).toString();
    setMeta('meta[property="og:url"]', "property", canonical.href);
    const existingJsonLd = document.head.querySelector<HTMLScriptElement>('script[data-smart-warga-jsonld]');
    const jsonLd = existingJsonLd ?? document.head.appendChild(document.createElement("script"));
    jsonLd.type = "application/ld+json";
    jsonLd.dataset.smartWargaJsonld = "true";
    jsonLd.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": type === "article" ? "Article" : "WebPage", name: title, description, url: canonical.href });
  }, [title, description, canonicalPath, type]);
  return null;
}
