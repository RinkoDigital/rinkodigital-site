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
    selectedListId = process.env.BREVO_LIST_ID_pt || selectedListId;
  }

  if (["es", "spanish", "español"].includes(language)) {
    selectedListId = process.env.BREVO_LIST_ID_es || selectedListId;
  }

  if (["en", "us", "english"].includes(language)) {
    selectedListId = process.env.BREVO_LIST_ID_us || selectedListId;
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
        return {
          statusCode: 200,
          headers: jsonHeaders,
          body: JSON.stringify({
            ok: true,
            mode: payload.label,
            listIds
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
