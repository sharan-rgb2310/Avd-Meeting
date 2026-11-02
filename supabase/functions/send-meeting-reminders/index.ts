import { createClient } from "@supabase/supabase-js";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void; };

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const emailDate = (value: unknown) => { const dateKey = String(value ?? "").slice(0, 10); const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!match) return String(value); const [, year, month, day] = match; const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))); return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day) ? `${day}/${month}/${year}` : String(value); };
const emailTime = (value: unknown) => { const match = String(value ?? "").match(/^([01]\d|2[0-3]):([0-5]\d)/); if (!match) return String(value); const hours = Number(match[1]); return `${hours % 12 || 12}:${String(Number(match[2])).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`; };

Deno.serve(async (_request) => {
  try {
    const apiKey = Deno.env.get("BREVO_API_KEY"); const sender = Deno.env.get("BREVO_SENDER_EMAIL");
    if (!apiKey || !sender) throw new Error("Email configuration is missing.");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = Date.now(); const earliest = now + 4.5 * 60 * 60 * 1000; const latest = now + 5.5 * 60 * 60 * 1000;
    const { data: meetings, error } = await admin.from("meetings").select("id,title,date,start_time,type,location,company_name,status,meeting_participants(user_id)").in("status", ["Scheduled", "Rescheduled"]).gte("date", new Date(earliest).toISOString().slice(0, 10)).lte("date", new Date(latest).toISOString().slice(0, 10));
    if (error) throw error;
    let sent = 0;
    for (const meeting of meetings ?? []) {
      if (!meeting.start_time) continue;
      const scheduled = new Date(`${meeting.date}T${meeting.start_time.slice(0, 5)}:00+05:30`).getTime();
      if (scheduled < earliest || scheduled > latest) continue;
      const ids = (meeting.meeting_participants ?? []).map((participant: any) => participant.user_id); if (!ids.length) continue;
      const { data: profiles, error: profilesError } = await admin.from("profiles").select("id,name,email,status").in("id", ids); if (profilesError) throw profilesError;
      const recipients = (profiles ?? []).filter((profile: any) => profile.status === "Activated" && /^\S+@\S+\.\S+$/.test(profile.email ?? "")); if (!recipients.length) continue;
      const scheduledAt = new Date(scheduled).toISOString();
      const { error: claimError } = await admin.from("meeting_reminders").insert({ meeting_id: meeting.id, scheduled_at: scheduledAt });
      if (claimError?.code === "23505") continue; if (claimError) throw claimError;
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px"><div style="background:#2563eb;color:#fff;padding:16px 20px"><h2 style="margin:0">Meeting reminder</h2></div><div style="padding:20px"><h3>${esc(meeting.title)}</h3><p>Please be reminded of your upcoming meeting. Kindly review the schedule and details below.</p><p><b>Date:</b> ${emailDate(meeting.date)}<br><b>Time:</b> ${emailTime(meeting.start_time)}<br><b>Meeting type:</b> ${esc(meeting.type || "Not specified")}<br><b>Location:</b> ${esc(meeting.location || "Not specified")}<br><b>Company:</b> ${esc(meeting.company_name || "Not specified")}</p></div></div>`;
      const results = await Promise.all(recipients.map(async (recipient: any) => { const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ sender: { name: "AV Dynamics Meeting", email: sender }, to: [{ email: recipient.email }], subject: `Meeting reminder: ${meeting.title}`, htmlContent: html }) }); return response.ok; }));
      if (results.every((ok) => !ok)) await admin.from("meeting_reminders").delete().eq("meeting_id", meeting.id).eq("scheduled_at", scheduledAt); else sent += 1;
    }
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { "Content-Type": "application/json" } });
  } catch (error) { console.error(error); const detail = error && typeof error === "object" ? JSON.stringify(error) : String(error); return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", detail }), { status: 500, headers: { "Content-Type": "application/json" } }); }
});
