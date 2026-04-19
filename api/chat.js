const requestCounts = {};

function getRateLimitKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 20;
  if (!requestCounts[ip]) { requestCounts[ip] = { count: 1, resetAt: now + windowMs }; return false; }
  if (now > requestCounts[ip].resetAt) { requestCounts[ip] = { count: 1, resetAt: now + windowMs }; return false; }
  if (requestCounts[ip].count >= limit) return true;
  requestCounts[ip].count++;
  return false;
}

async function writeToNotion(databaseId, properties) {
  await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties
    })
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getRateLimitKey(req);
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  // Lead capture endpoint
  if (req.body.action === 'capture_lead') {
    const { email, visitorType, source, message } = req.body;
    try {
      await writeToNotion('c53f587fe3e34f269b5508687d9ffd06', {
        'Name': { title: [{ text: { content: email } }] },
        'Email': { email },
        'Visitor Type': { select: { name: visitorType || 'Other' } },
        'Source': { select: { name: source || 'General contact' } },
        'Message': { rich_text: [{ text: { content: message || '' } }] }
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Capture failed' });
    }
  }

  // Handoff request endpoint
  if (req.body.action === 'handoff_request') {
    const { question, visitorType, contactEmail } = req.body;
    try {
      await writeToNotion('42c5d1586a58400397b18300fbd48289', {
        'Question': { title: [{ text: { content: question } }] },
        'Visitor Type': { select: { name: visitorType || 'Other' } },
        'Contact Email': { email: contactEmail || '' },
        'Status': { select: { name: 'Needs reply' } }
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Handoff failed' });
    }
  }

  // Standard chat proxy
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Proxy error' });
  }
};
