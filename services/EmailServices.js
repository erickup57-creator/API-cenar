const RESEND_API_URL = "https://api.resend.com/emails";

function normalizeEnvValue(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getEmailConfig() {
  const provider = normalizeEnvValue(process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  const apiKey = normalizeEnvValue(process.env.RESEND_API_KEY);
  const from = normalizeEnvValue(process.env.EMAIL_FROM);
  const timeoutMs = Number(normalizeEnvValue(process.env.EMAIL_TIMEOUT_MS) || 15000);

  return { provider, apiKey, from, timeoutMs };
}

function buildRecipients(to) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((item) => normalizeEnvValue(item))
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error("Email recipient is required.");
  }

  return recipients;
}

export async function sendEmail({ to, subject, html }) {
  const { provider, apiKey, from, timeoutMs } = getEmailConfig();

  if (provider !== "resend") {
    throw new Error(`Unsupported email provider "${provider}". Use EMAIL_PROVIDER=resend.`);
  }

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM is required when EMAIL_PROVIDER=resend.");
  }

  if (!normalizeEnvValue(subject)) {
    throw new Error("Email subject is required.");
  }

  const recipients = buildRecipients(to);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data?.message || data?.error || response.statusText;
      throw new Error(`Resend API error (${response.status}): ${detail}`);
    }

    console.log("Email send (Resend):", data?.id || "ok");
    return data;
  } catch (ex) {
    if (ex?.name === "AbortError") {
      throw new Error(`Resend request timeout after ${timeoutMs}ms.`);
    }

    console.error("Error sending email:", ex);
    throw ex;
  } finally {
    clearTimeout(timeoutHandle);
  }
}
