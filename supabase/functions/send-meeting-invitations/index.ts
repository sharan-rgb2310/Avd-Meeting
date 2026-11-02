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

const EMAIL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatEmailDate = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === "") return "Not specified";
  const dateKey = String(value).slice(0, 10);
  const date = new Date(`${dateKey}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, "0")} ${EMAIL_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const formatInvitationEmailDate = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === "") return "Not specified";
  const dateKey = String(value).slice(0, 10);
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) return String(value);
  return `${day}/${month}/${year}`;
};

const formatEmailTime = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === "") return "Not specified";
  const match = String(value).trim().match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) return String(value);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

const ACTIONS: Record<string, { label: string; color: string; intro: string }> = {
  created: { label: "Meeting invitation", color: "#2563eb", intro: "You have been invited to a meeting." },
  rescheduled: { label: "Meeting rescheduled", color: "#d97706", intro: "This meeting has been rescheduled. Please review the updated details." },
  cancelled: { label: "Meeting cancelled", color: "#dc2626", intro: "This meeting has been cancelled." },
  on_hold: { label: "Meeting on hold", color: "#7c3aed", intro: "This meeting has been put on hold." },
  resumed: { label: "Meeting resumed", color: "#16a34a", intro: "This meeting has resumed." },
  updated: { label: "Meeting updated", color: "#0891b2", intro: "The details of this meeting have been updated." },
  reminder: { label: "Meeting reminder", color: "#2563eb", intro: "Please be reminded of your upcoming meeting. Kindly review the schedule and details below." },
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

const formatEmailField = (key: string, value: unknown, action: string) => {
  if (key === "date") {
    return action === "rescheduled" ? formatEmailDate(value) : formatInvitationEmailDate(value);
  }
  if (key === "startTime" || key === "endTime") return formatEmailTime(value);
  return fmt(value);
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
      const oldValue = changed && showable(previous[key]) ? `<s style="color:#888">${formatEmailField(key, previous[key], action)}</s> &rarr; ` : "";
      return `<tr${changed ? ' style="background:#fef3c7"' : ""}><td style="padding:6px 12px 0;width:180px"><b>${esc(LABELS[key] ?? key)}</b></td><td style="padding:6px 0">${oldValue}${formatEmailField(key, meeting[key], action)}</td></tr>`;
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

const sendBrevoEmail = async (apiKey: string, sender: string, recipients: Array<{ email: string; name?: string }>, subject: string, html: string) => {
  return Promise.all(recipients.map(async (recipient) => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: { name: "AV Dynamics Meeting", email: sender }, to: [{ email: recipient.email }], subject, htmlContent: html }),
    });
    const text = await response.text();
    return { email: recipient.email, ok: response.ok, status: response.status, brevo: text };
  }));
};

const processMeetingReminders = async () => {
  const apiKey = Deno.env.get("BREVO_API_KEY")!;
  const sender = Deno.env.get("BREVO_SENDER_EMAIL")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();
  const earliest = now + (7 * 60 + 30) * 60 * 1000;
  const latest = now + (8 * 60 + 30) * 60 * 1000;
  const { data: meetings, error } = await admin
    .from("meetings")
    .select("id,title,date,start_time,end_time,type,location,link,company_name,status,meeting_participants(user_id)")
    .in("status", ["Scheduled", "Rescheduled"])
    .gte("date", new Date(earliest).toISOString().slice(0, 10))
    .lte("date", new Date(latest).toISOString().slice(0, 10));
  if (error) throw error;

  let sent = 0;
  for (const meeting of meetings ?? []) {
    if (!meeting.start_time) continue;
    const scheduledTime = new Date(`${meeting.date}T${meeting.start_time.slice(0, 5)}:00+05:30`).getTime();
    if (scheduledTime < earliest || scheduledTime > latest) continue;

    const participantIds = (meeting.meeting_participants ?? []).map((participant: any) => participant.user_id);
    if (participantIds.length === 0) continue;
    const { data: profiles, error: profilesError } = await admin.from("profiles").select("id,name,email,status").in("id", participantIds);
    if (profilesError) throw profilesError;
    const recipients = (profiles ?? [])
      .filter((profile: any) => profile.status === "Activated" && /^\S+@\S+\.\S+$/.test(profile.email ?? ""))
      .map((profile: any) => ({ email: profile.email.trim(), name: profile.name }));
    if (recipients.length === 0) continue;

    const scheduledAt = new Date(scheduledTime).toISOString();
    const { error: claimError } = await admin.from("meeting_reminders").insert({ meeting_id: meeting.id, scheduled_at: scheduledAt });
    if (claimError?.code === "23505") continue;
    if (claimError) throw claimError;

    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><div style="background:#2563eb;color:#fff;padding:16px 20px"><h2 style="margin:0">Meeting reminder</h2></div><div style="padding:20px"><h3>${esc(meeting.title)}</h3><p>This meeting is scheduled in 8 hours.</p><table><tr><td style="padding:6px 12px 6px 0"><b>Date</b></td><td>${formatInvitationEmailDate(meeting.date)}</td></tr><tr><td><b>Time</b></td><td>${formatEmailTime(meeting.start_time)}</td></tr><tr><td><b>Meeting type</b></td><td>${esc(meeting.type || "Not specified")}</td></tr><tr><td><b>Location</b></td><td>${esc(meeting.location || meeting.link || "Not specified")}</td></tr><tr><td><b>Company</b></td><td>${esc(meeting.company_name || "Not specified")}</td></tr></table></div></div>`;
    const results = await sendBrevoEmail(apiKey, sender, recipients, `Meeting reminder: ${meeting.title}`, html);
    if (results.every((result) => !result.ok)) {
      await admin.from("meeting_reminders").delete().eq("meeting_id", meeting.id).eq("scheduled_at", scheduledAt);
      continue;
    }
    sent += 1;
  }
  return sent;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload: any = await request.json().catch(() => ({}));
    if (payload.processReminders === true) {
      const sent = await processMeetingReminders();
      return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { meeting, recipients, action = "created", previous = null, note, createdByName, updatedByName } = payload;
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
