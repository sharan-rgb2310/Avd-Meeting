import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const encodeBase64Url = (value: string) =>
  btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const getGoogleAccessToken = async () => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "",
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error(`Google token request failed: ${await response.text()}`);
  const payload = await response.json();
  return payload.access_token as string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { meeting, recipients } = await request.json();
    const sender = Deno.env.get("GOOGLE_SENDER_EMAIL");
    if (!sender) throw new Error("GOOGLE_SENDER_EMAIL is not configured.");
    if (!meeting?.title || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("A meeting title and at least one recipient are required.");
    }

    const subject = `Meeting invitation: ${meeting.title}`;
    const body = [
      `You are invited to ${meeting.title}.`,
      `Date: ${meeting.date || "To be confirmed"}`,
      `Time: ${meeting.startTime || "To be confirmed"}`,
      `Type: ${meeting.type || "Virtual"}`,
      meeting.agenda ? `\nAgenda:\n${meeting.agenda}` : "",
    ].filter(Boolean).join("\n");
    const rawMessage = [
      `From: ${sender}`,
      `To: ${recipients.join(", ")}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
    ].join("\r\n");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getGoogleAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
    });

    if (!response.ok) throw new Error(`Gmail send failed: ${await response.text()}`);
    return new Response(JSON.stringify({ ok: true, message: await response.json() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});