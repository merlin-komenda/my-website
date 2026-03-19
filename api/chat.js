const requestCounts = {};

function getRateLimitKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 20;

  if (!requestCounts[ip]) {
    requestCounts[ip] = { count: 1, resetAt: now + windowMs };
    return false;
  }

  if (now > requestCounts[ip].resetAt) {
    requestCounts[ip] = { count: 1, resetAt: now + windowMs };
    return false;
  }

  if (requestCounts[ip].count >= limit) {
    return true;
  }

  requestCounts[ip].count++;
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getRateLimitKey(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

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
}
