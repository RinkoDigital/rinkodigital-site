exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const apiKey = process.env.BREVO_API_KEY;
    const listEn = Number(process.env.BREVO_LIST_ID_EN || '0');
    const listPt = Number(process.env.BREVO_LIST_ID_PT || '0');
    const listEs = Number(process.env.BREVO_LIST_ID_ES || '0');

    // Email that receives internal notifications when a new website request arrives.
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@rinkodigital.com';
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'contact@rinkodigital.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Rinko Digital';

    if (!apiKey || !listEn || !listPt || !listEs) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Brevo environment variables are missing.' })
      };
    }

    const data = JSON.parse(event.body || '{}');
    const email = String(data.email || '').trim().toLowerCase();
    const name = String(data.name || '').trim();
    const businessName = String(data.business_name || '').trim();
    const websiteType = String(data.website_type || '').trim();
    const message = String(data.message || '').trim();
    const source = String(data.source || 'rinkodigital.com').trim();
    const language = String(data.language || 'en').trim().toLowerCase();

    let selectedList = listEn;
    if (language === 'pt') selectedList = listPt;
    if (language === 'es') selectedList = listEs;

    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'A valid email is required.' })
      };
    }

    const brevoPayload = {
      email,
      updateEnabled: true,
      listIds: [selectedList],
      attributes: {
        FIRSTNAME: name,
        BUSINESS_NAME: businessName,
        WEBSITE_TYPE: websiteType,
        MESSAGE: message,
        SOURCE: source,
        LANGUAGE: language
      }
    };

    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(brevoPayload)
    });

    const brevoText = await brevoResponse.text();

    if (!brevoResponse.ok) {
      return {
        statusCode: brevoResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: brevoText || JSON.stringify({ error: 'Brevo contact request failed.' })
      };
    }

    // Send an internal email notification to Rinko Digital.
    // This is what makes the website form arrive in your inbox.
    let notificationSent = false;
    let notificationError = null;

    try {
      const safe = (value) => String(value || '').replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char]));
      const languageLabel = language === 'pt' ? 'Português' : language === 'es' ? 'Español' : 'English';

      const notificationPayload = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: adminEmail, name: 'Rinko Digital' }],
        replyTo: { email, name: name || email },
        subject: `New Website Request - ${businessName || name || email}`,
        htmlContent: `
          <h2>New Website Request</h2>
          <p><strong>Name:</strong> ${safe(name)}</p>
          <p><strong>Email:</strong> ${safe(email)}</p>
          <p><strong>Preferred Language:</strong> ${safe(languageLabel)}</p>
          <p><strong>Business Name:</strong> ${safe(businessName)}</p>
          <p><strong>Website Type:</strong> ${safe(websiteType)}</p>
          <p><strong>Source:</strong> ${safe(source)}</p>
          <hr>
          <p><strong>Message:</strong></p>
          <p>${safe(message).replace(/\n/g, '<br>')}</p>
        `,
        textContent:
`New Website Request

Name: ${name}
Email: ${email}
Preferred Language: ${languageLabel}
Business Name: ${businessName}
Website Type: ${websiteType}
Source: ${source}

Message:
${message}`
      };

      const notificationResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify(notificationPayload)
      });

      if (notificationResponse.ok) {
        notificationSent = true;
      } else {
        notificationError = await notificationResponse.text();
      }
    } catch (error) {
      notificationError = error.message;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, listId: selectedList, notificationSent, notificationError })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error.', details: error.message })
    };
  }
};
