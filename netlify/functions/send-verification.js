import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'chrisfordgutierrez23@gmail.com';
const ALERT_FROM = process.env.ALERT_FROM || 'TradeGuard Alerts <onboarding@resend.dev>';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { username, idType, address, fbLink1, fbLink2, uploadedFiles } = payload;

  if (!username) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Username is required' }) };
  }

  const files = Array.isArray(uploadedFiles) ? uploadedFiles : [];
  const fileCount = files.length;
  const safeFiles = files.map((f, i) => ({
    name: f?.name && f.name !== 'image.png' ? f.name : `upload_${i + 1}`,
    type: f?.type || 'unknown'
  }));

  const text =
    `New verification submission from "${username}".\n\n` +
    `ID Type: ${idType || 'N/A'}\n` +
    `Address: ${address || 'N/A'}\n` +
    `Relative FB Link 1: ${fbLink1 || 'N/A'}\n` +
    `Relative FB Link 2: ${fbLink2 || 'N/A'}\n` +
    `Uploaded files (${fileCount}): ${safeFiles.map((f) => f.name).join(', ') || 'none'}\n\n` +
    `Note: uploaded images are NOT attached or forwarded to any external model or AI service. ` +
    `They are stored for manual admin review only.\n` +
    `Review and approve this user in the admin panel.`;

  if (resend) {
    try {
      await resend.emails.send({
        from: ALERT_FROM,
        to: ALERT_EMAIL,
        subject: `New Verification - ${username}`,
        text
      });
    } catch (e) {
      console.error('Verification email failed:', e);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Verification submitted', id: Date.now() })
  };
};
