import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));

const display = (value: unknown, fallback = "Not specified") => {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  return esc(String(value));
};

const formatEmailDate = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === "") return "Not specified";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const formatEmailTime = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === "") return "Not specified";
  const match = String(value).trim().match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) return String(value);
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
};

const ACTIONS: Record<string, { label: string; color: string; intro: string }> = {
  created: { label: "Meeting invitation", color: "#2563eb", intro: "You have been invited to a meeting." },
  rescheduled: { label: "Meeting rescheduled", color: "#d97706", intro: "This meeting has been rescheduled. Please review the updated details." },
  cancelled: { label: "Meeting cancelled", color: "#dc2626", intro: "This meeting has been cancelled." },
  on_hold: { label: "Meeting on hold", color: "#7c3aed", intro: "This meeting has been put on hold." },
  resumed: { label: "Meeting resumed", color: "#16a34a", intro: "This meeting has resumed." },
  updated: { label: "Meeting updated", color: "#0891b2", intro: "The details of this meeting have been updated." },
};

const INTERNAL_FIELDS = new Set([
  "workspaceOwnerId", "workspaceShared", "sharedOwnerId",
  "id", "title", "ref", "created_at", "updated_at", "createdAt", "updatedAt",
  "createdBy", "created_by", "user_id", "userId", "attendees", "participants", "recipients",
  "companyId", "responsibleId", "notes", "decisions", "actionItemsText", "remarks", "rescheduleReason",
]);

const LABELS: Record<string, string> = {
  date: "Date", startTime: "Time", endTime: "End time", type: "Type",
  location: "Location", link: "Meeting link", agenda: "Agenda",
  description: "Description", organizer: "Organizer", status: "Status", companyName: "Company name",
};

const fmt = (value: unknown) => {
  const text = esc(value);
  return /^https?:\/\//.test(String(value)) ? `<a href="${text}">${text}</a>` : text.replace(/\n/g, "<br>");
};

const showable = (value: unknown) => value !== null && value !== undefined && value !== "" && typeof value !== "object";

const lookupCreatorName = async (userId: string) => {
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await admin.auth.admin.getUserById(userId);
    const metadata: any = data?.user?.user_metadata ?? {};
    return metadata.full_name || metadata.name || metadata.display_name || data?.user?.email || "";
  } catch {
    return "";
  }
};

const detailRow = (label: string, value: unknown, highlight = false) => `
<tr${highlight ? ' style="background:#fef3c7"' : ""}>
  <td style="padding:6px 12px 6px 0;width:180px;vertical-align:top"><b>${esc(label)}</b></td>
  <td style="padding:6px 0">${display(value)}</td>
</tr>`;

const buildRescheduledEmail = (meeting: any, previous: any, updatedBy: string) => {
  const previousStatus = previous?.status || meeting.status || "Scheduled";
  const currentStatus = meeting.status || "Rescheduled";
  const rows = [
    detailRow("Meeting title", meeting.title),
    detailRow("Previous date", formatEmailDate(previous?.date), previous?.date !== meeting.date),
    detailRow("Updated date", formatEmailDate(meeting.date), previous?.date !== meeting.date),
    detailRow("Time", formatEmailTime(meeting.startTime), previous?.startTime !== meeting.startTime),
    detailRow("Meeting type", meeting.type),
    detailRow("Location", meeting.location || meeting.link),
    detailRow("Company name", meeting.companyName),
    detailRow("Status change", `${previousStatus} → ${currentStatus}`, previousStatus !== currentStatus),
    detailRow("Updated by", updatedBy || "Not specified"),
  ].join("");

  return rows;
};

const buildEmail = (action: string, meeting: any, recipients: any[], previous: any, note: string | undefined, creatorName: string, updatedByName = "") => {
  const cfg = ACTIONS[action];
  let rows: string;

  if (action === "rescheduled") {
    rows = buildRescheduledEmail(meeting, previous, updatedByName || creatorName);
  } else {
    const keys = Object.keys(meeting)
      .filter((key) => !INTERNAL_FIELDS.has(key) && showable(meeting[key]))
      .sort((a, b) => {
        const orderA = Object.keys(LABELS).indexOf(a);
        const orderB = Object.keys(LABELS).indexOf(b);
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
      });

    rows = keys.map((key) => {
      const changed = previous && String(previous[key] ?? "") !== String(meeting[key] ?? "");
      const oldValue = changed && showable(previous[key]) ? `<s style="color:#888">${fmt(previous[key])}</s> &rarr; ` : "";
      return `<tr${changed ? ' style="background:#fef3c7"' : ""}><td style="padding:6px 12px 6px 0;width:180px"><b>${esc(LABELS[key] ?? key)}</b></td><td style="padding:6px 0">${oldValue}${fmt(meeting[key])}</td></tr>`;
    }).join("");

    if (creatorName) rows += detailRow(action === "created" ? "Created by" : "Updated by", creatorName);
  }

  const people = recipients
    .map((recipient: any) => typeof recipient === "string"
      ? { email: recipient, name: "" }
      : { email: recipient?.email, name: recipient?.name || "" })
    .filter((person: { email?: unknown }) => typeof person.email === "string" && person.email.trim());
  const peopleList = people.map((person) => `<li>${esc(person.name || person.email)}</li>`).join("");
  const subject = `${cfg.label}: ${meeting.title}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:${cfg.color};color:#fff;padding:16px 20px"><h2 style="margin:0">${esc(cfg.label)}</h2></div>
      <div style="padding:20px">
        <h3 style="margin-top:0">${esc(meeting.title)}</h3>
        <p>${esc(cfg.intro)}</p>
        ${note ? `<p style="background:#f3f4f6;padding:10px;border-radius:6px"><b>Note:</b> ${esc(note).replace(/\n/g, "<br>")}</p>` : ""}
        <table style="border-collapse:collapse;width:100%">${rows}</table>
        <h4>Participants (${people.length})</h4><ul>${peopleList}</ul>
      </div>
    </div>`;
  return { subject, html };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { meeting, recipients, action = "created", previous = null, note, createdByName, updatedByName } = await request.json();
    const apiKey = Deno.env.get("BREVO_API_KEY");
    const sender = Deno.env.get("BREVO_SENDER_EMAIL");
    if (!apiKey) throw new Error("BREVO_API_KEY is not configured.");
    if (!sender) throw new Error("BREVO_SENDER_EMAIL is not configured.");
    if (!ACTIONS[action]) throw new Error(`Unknown action: ${action}`);
    if (!meeting?.title || !Array.isArray(recipients) || recipients.length === 0) throw new Error("A meeting title and at least one recipient are required.");

    const validRecipients = recipients
      .map((recipient: any) => typeof recipient === "string"
        ? { email: recipient, name: "" }
        : { email: recipient?.email, name: recipient?.name || "" })
      .filter((recipient: { email?: unknown }) => typeof recipient.email === "string" && recipient.email.trim());
    if (validRecipients.length === 0) throw new Error("At least one valid recipient email is required.");

    const creatorId = meeting.createdBy ?? meeting.created_by;
    const creatorName = createdByName || (creatorId ? await lookupCreatorName(String(creatorId)) : "");
    const { subject, html } = buildEmail(action, meeting, validRecipients, previous, note, creatorName, updatedByName);
    const results = await Promise.all(validRecipients.map(async (recipient: any) => {
      const email = recipient.email.trim();
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ sender: { name: "AV Dynamics Meeting", email: sender }, to: [{ email }], subject, htmlContent: html }),
      });
      const text = await response.text();
      return { email, ok: response.ok, status: response.status, brevo: text };
    }));
    if (results.every((result) => !result.ok)) throw new Error(`All emails failed: ${JSON.stringify(results)}`);
    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
