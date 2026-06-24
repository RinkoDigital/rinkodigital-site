exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing BREVO_API_KEY environment variable." })
    };
  }

  let data = {};
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid request body." })
    };
  }

  if (data["bot-field"]) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  }

  const email = String(data.email || "").trim();

  if (!email || !email.includes("@")) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Valid email is required." })
    };
  }

  const language = String(data.language || "").trim().toLowerCase();

  let selectedListId = process.env.BREVO_LIST_ID_us || process.env.BREVO_LIST_ID;

  if (language === "pt" || language === "pt-br" || language === "portuguese" || language === "português") {
    selectedListId = process.env.BREVO_LIST_ID_pt || selectedListId;
  } else if (language === "es" || language === "spanish" || language === "español") {
    selectedListId = process.env.BREVO_LIST_ID_es || selectedListId;
  } else if (language === "en" || language === "us" || language === "english") {
    selectedListId = process.env.BREVO_LIST_ID_us || selectedListId;
  }

  const listId = Number(selectedListId);

  const listIds = Number.isInteger(listId) && listId > 0 ? [listId] : [];

  const fullAttributes = {
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

  const minimalAttributes = {
    FIRSTNAME: String(data.name || "").trim()
  };

  async function sendToBrevo(payload) {
    return fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  const fullPayload = {
    email,
    attributes: fullAttributes,
    updateEnabled: true
  };

  if (listIds.length) {
    fullPayload.listIds = listIds;
  }

  try {
    let response = await sendToBrevo(fullPayload);
    let responseText = await response.text();

    if (response.ok) {
      console.log("Brevo contact sent with full attributes:", email);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, mode: "full" })
      };
    }

    console.error("Brevo full payload failed:", response.status, responseText);

    const minimalPayload = {
      email,
      attributes: minimalAttributes,
      updateEnabled: true
    };

    if (listIds.length) {
      minimalPayload.listIds = listIds;
    }

    response = await sendToBrevo(minimalPayload);
    responseText = await response.text();

    if (response.ok) {
      console.log("Brevo contact sent with minimal attributes:", email);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, mode: "minimal" })
      };
    }

    console.error("Brevo minimal payload failed:", response.status, responseText);

    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Brevo rejected the contact.",
        details: responseText
      })
    };
  } catch (error) {
    console.error("Brevo function error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not send contact to Brevo.",
        details: error.message
      })
    };
  }
};
