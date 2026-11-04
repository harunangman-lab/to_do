// Vercel runs this handler on the server. Only browser-safe Supabase settings
// are returned; service-role keys and database credentials must never be sent.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  let validPublicKey = false;
  if (supabaseKey?.startsWith('sb_publishable_')) validPublicKey = true;
  else if (supabaseKey) {
    try {
      const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64url').toString('utf8'));
      validPublicKey = payload.role === 'anon';
    } catch { /* Reject unknown or privileged key formats. */ }
  }
  let validUrl = false;
  try { validUrl = new URL(supabaseUrl).protocol === 'https:'; } catch { /* Missing configuration. */ }
  if (!validUrl || !validPublicKey) {
    return res.status(503).json({ error: 'Authentication is not configured' });
  }
  return res.status(200).json({ supabaseUrl, supabaseKey });
};
