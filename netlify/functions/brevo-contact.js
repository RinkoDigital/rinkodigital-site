exports.handler = async (event) => {
  const jsonHeaders = { "Content-Type": "application/json" };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method not allowed. Use POST." })
    };
  }

  const apiKey = String(process.env.BREVO_API_KEY || "").trim();

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY.");
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Missing BREVO_API_KEY." })
    };
  }

  let data = {};
  try {
    data = JSON.parse(event.body || "{}");
  } catch (error) {
    console.error("Invalid JSON body:", error);
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Invalid JSON body." })
    };
  }

  if (data["bot-field"]) {
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true, spam: true })
    };
  }

  const email = String(data.email || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("Missing or invalid email:", email);
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Valid email is required." })
    };
  }

  const language = String(data.language || "").trim().toLowerCase();

  let selectedListId = process.env.BREVO_LIST_ID_us || process.env.BREVO_LIST_ID || "6";

  if (["pt", "pt-br", "portuguese", "português"].includes(language)) {
    selectedListId = (process.env.BREVO_LIST_ID_pt || "9");
  }

  if (["es", "spanish", "español"].includes(language)) {
    selectedListId = (process.env.BREVO_LIST_ID_es || "12");
  }

  if (["en", "us", "english"].includes(language)) {
    selectedListId = (process.env.BREVO_LIST_ID_us || "6");
  }

  const numericListId = Number(String(selectedListId || "").trim());
  const listIds = Number.isInteger(numericListId) && numericListId > 0 ? [numericListId] : [];

  console.log("Brevo form received:", {
    email,
    language,
    selectedListId,
    listIds
  });

  const allAttributes = {
    FIRSTNAME: String(data.name || "").trim(),
    PHONE: String(data.phone || "").trim(),
    LANGUAGE: String(data.language || "").trim(),
    BUSINESS: String(data.business || "").trim(),
    PREFERRED_CONTACT: String(data.preferred_contact || "").trim(),
    BEST_TIME: String(data.best_time || "").trim(),
    BUDGET: String(data.budget || "").trim(),
    SERVICE: String(data.service || "").trim(),
    MESSAGE: String(data.message || "").trim(),
    SOURCE: "Rinko Digital Website"
  };

  const basicAttributes = {
    FIRSTNAME: String(data.name || "").trim()
  };


  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatRow(label, value) {
    return `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:700;background:#f9fafb;width:190px;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(value || "-")}</td></tr>`;
  }

  async function sendLeadNotification() {
    const notifyTo = String(process.env.BREVO_NOTIFY_TO || process.env.NOTIFY_TO || "contact@rinkodigital.com").trim();
    const senderEmail = String(process.env.BREVO_SENDER_EMAIL || "contact@rinkodigital.com").trim();
    const senderName = String(process.env.BREVO_SENDER_NAME || "Rinko Digital Website").trim();
    const leadName = String(data.name || "New Lead").trim();

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:720px;margin:0 auto;">
        <h2 style="margin:0 0 12px;color:#111827;">New Rinko Digital Lead</h2>
        <p style="margin:0 0 18px;color:#374151;">A new project request was submitted through the website.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          ${formatRow("Name", data.name)}
          ${formatRow("Email", email)}
          ${formatRow("Phone", data.phone)}
          ${formatRow("Language", data.language)}
          ${formatRow("Business / Company", data.business)}
          ${formatRow("Preferred contact", data.preferred_contact)}
          ${formatRow("Best time", data.best_time)}
          ${formatRow("Budget", data.budget)}
          ${formatRow("Service", data.service)}
          ${formatRow("Message", data.message)}
          ${formatRow("Brevo list ID", listIds.join(", "))}
          ${formatRow("Source", "Rinko Digital Website")}
        </table>
        <p style="margin-top:18px;color:#6b7280;font-size:12px;">Reply directly to this email to contact the lead.</p>
      </div>
    `;

    const textContent = [
      "New Rinko Digital Lead",
      "",
      `Name: ${data.name || "-"}`,
      `Email: ${email}`,
      `Phone: ${data.phone || "-"}`,
      `Language: ${data.language || "-"}`,
      `Business / Company: ${data.business || "-"}`,
      `Preferred contact: ${data.preferred_contact || "-"}`,
      `Best time: ${data.best_time || "-"}`,
      `Budget: ${data.budget || "-"}`,
      `Service: ${data.service || "-"}`,
      `Message: ${data.message || "-"}`,
      `Brevo list ID: ${listIds.join(", ")}`,
      "Source: Rinko Digital Website"
    ].join("\n");

    const notificationPayload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: notifyTo, name: "Rinko Digital" }],
      replyTo: { email, name: leadName },
      subject: `New Lead - ${leadName} - Rinko Digital`,
      htmlContent,
      textContent
    };

    console.log("Sending lead notification email to:", notifyTo);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(notificationPayload)
    });

    const text = await response.text();
    console.log("Lead notification response:", response.status, text);

    return {
      ok: response.ok,
      status: response.status,
      text
    };
  }


  async function sendToBrevo(label, payload) {
    console.log("Trying Brevo payload:", label, payload);

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    console.log("Brevo response:", label, response.status, text);

    return {
      ok: response.ok,
      status: response.status,
      text
    };
  }

  const payloads = [];

  payloads.push({
    label: "full",
    body: {
      email,
      attributes: allAttributes,
      updateEnabled: true,
      ...(listIds.length ? { listIds } : {})
    }
  });

  payloads.push({
    label: "basic",
    body: {
      email,
      attributes: basicAttributes,
      updateEnabled: true,
      ...(listIds.length ? { listIds } : {})
    }
  });

  payloads.push({
    label: "email_only",
    body: {
      email,
      updateEnabled: true,
      ...(listIds.length ? { listIds } : {})
    }
  });

  let lastError = null;

  for (const payload of payloads) {
    try {
      const result = await sendToBrevo(payload.label, payload.body);

      if (result.ok) {
        let notification = { ok: false, skipped: false };

        try {
          notification = await sendLeadNotification();
        } catch (error) {
          console.error("Lead notification email failed:", error);
          notification = { ok: false, status: 500, text: error.message };
        }

        return {
          statusCode: 200,
          headers: jsonHeaders,
          body: JSON.stringify({
            ok: true,
            mode: payload.label,
            listIds,
            notification
          })
        };
      }

      lastError = {
        mode: payload.label,
        status: result.status,
        details: result.text
      };
    } catch (error) {
      console.error("Brevo request failed:", payload.label, error);
      lastError = {
        mode: payload.label,
        status: 500,
        details: error.message
      };
    }
  }

  return {
    statusCode: lastError?.status || 500,
    headers: jsonHeaders,
    body: JSON.stringify({
      error: "Brevo rejected all payload attempts.",
      lastError
    })
  };
};
