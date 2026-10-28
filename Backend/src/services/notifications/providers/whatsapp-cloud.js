export async function sendWhatsAppTemplate({ recipient, templateName, variables }) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
  if (!phoneId || !accessToken || !apiVersion) throw new Error("WhatsApp provider credentials are incomplete.");
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: recipient, type: "template", template: { name: templateName, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" }, components: [{ type: "body", parameters: variables.map((text) => ({ type: "text", text: String(text) })) }] } }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || `WhatsApp request failed (${response.status}).`);
  return { providerReference: result.messages?.[0]?.id || null };
}
