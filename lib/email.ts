type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "InvoiceFlow Pro <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY missing in .env");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  const data = await res.json().catch(() => null);

  console.log("RESEND_RESPONSE:", data);

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Resend email failed");
  }

  return data;
}