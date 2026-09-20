const storageBase = () => `${(process.env.SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1`;

function storageHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !key) throw new Error("Supabase Storage is not configured");
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function uploadPrivateObject(input: { bucket: string; path: string; body: Uint8Array; contentType: string }) {
  const response = await fetch(`${storageBase()}/object/${encodeURIComponent(input.bucket)}/${input.path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { ...storageHeaders(), "Content-Type": input.contentType, "x-upsert": "false" },
    body: input.body as BodyInit,
  });
  if (!response.ok) throw new Error(`Supabase upload failed with status ${response.status}`);
  return { bucket: input.bucket, path: input.path };
}

export async function createPrivateSignedUrl(input: { bucket: string; path: string; expiresInSeconds?: number }) {
  const response = await fetch(`${storageBase()}/object/sign/${encodeURIComponent(input.bucket)}/${input.path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { ...storageHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: input.expiresInSeconds ?? 300 }),
  });
  if (!response.ok) throw new Error(`Supabase signed URL failed with status ${response.status}`);
  const payload = await response.json() as { signedURL?: string };
  if (!payload.signedURL) throw new Error("Supabase did not return a signed URL");
  const signed = payload.signedURL.startsWith("http") ? payload.signedURL : `${(process.env.SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1${payload.signedURL}`;
  return signed;
}
