type TemplateParameter = { type: "text"; text: string };

export async function sendWhatsAppTemplate(input: { to: string; templateName: string; languageCode?: string; parameters?: TemplateParameter[] }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) throw new Error("WhatsApp Cloud API is not configured");
  if (!/^\d{8,15}$/.test(input.to)) throw new Error("Recipient phone number must use international digits without +");
  if (!/^[a-z0-9_]+$/i.test(input.templateName)) throw new Error("Invalid WhatsApp template name");

  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? "id" },
        ...(input.parameters?.length ? { components: [{ type: "body", parameters: input.parameters }] } : {}),
      },
    }),
  });

  const payload = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `WhatsApp API failed with status ${response.status}`);
  return { providerMessageId: payload.messages?.[0]?.id ?? null };
}
