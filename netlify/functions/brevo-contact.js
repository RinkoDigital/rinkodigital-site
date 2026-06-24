exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listIdRaw = process.env.BREVO_LIST_ID;

  if (!apiKey) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Missing BREVO_API_KEY environment variable." }) };
  }

  let data = {};
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid request body." }) };
  }

  if (data["bot-field"]) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  }

  const email = String(data.email || "").trim();
  if (!email || !email.includes("@")) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Valid email is required." }) };
  }

  const attributes = {
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

  const payload = { email, attributes, updateEnabled: true };

  const language = String(data.language || "").trim().toLowerCase();
  let selectedListId = process.env.BREVO_LIST_ID_us;

  if (language === "pt" || language === "pt-br" || language === "portuguese" || language === "português") {
    selectedListId = process.env.BREVO_LIST_ID_pt;
  } else if (language === "es" || language === "spanish" || language === "español") {
    selectedListId = process.env.BREVO_LIST_ID_es;
  } else if (language === "en" || language === "us" || language === "english") {
    selectedListId = process.env.BREVO_LIST_ID_us;
  }

  const listId = Number(selectedListId || listIdRaw);
  if (Number.isInteger(listId) && listId > 0) payload.listIds = [listId];

  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "accept": "application/json", "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const brevoText = await brevoResponse.text();
    if (!brevoResponse.ok) {
      return { statusCode: brevoResponse.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Brevo rejected the contact.", details: brevoText }) };
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  } catch {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Could not send contact to Brevo." }) };
  }
};
