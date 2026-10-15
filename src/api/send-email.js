export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, name, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Your Shop", email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: to, name: name || to }],
        subject,
        htmlContent: `<p>${message}</p>`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }
    return res.status(200).json({ success: true, id: data.messageId });
  } catch (err) {
    return res.status(500).json({ error: "Failed to send email" });
  }
}