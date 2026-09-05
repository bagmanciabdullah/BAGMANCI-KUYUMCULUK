const ALERT_TO = process.env.LOGIN_ALERT_TO || 'bagmanciabdullah93@gmail.com';
const ALERT_FROM = process.env.LOGIN_ALERT_FROM || 'Bagmanci Guvenlik <onboarding@resend.dev>';
const ALLOWED_HOSTS = ['bagmancikuyumculuk.com.tr', 'www.bagmancikuyumculuk.com.tr', 'localhost', '127.0.0.1'];

function decodeHeader(value) {
  if (!value) return '';
  try { return decodeURIComponent(String(value)); } catch (error) { return String(value); }
}

function requestContext(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
    city: decodeHeader(req.headers['x-vercel-ip-city']),
    country: decodeHeader(req.headers['x-vercel-ip-country']),
    user_agent: req.headers['user-agent'] || ''
  };
}

function originAllowed(req) {
  const origin = req.headers.origin || '';
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return ALLOWED_HOSTS.includes(host);
  } catch (error) {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  if (!originAllowed(req)) return res.status(403).json({ error: true, message: 'Origin denied' });

  const context = { ...req.body, ...requestContext(req) };
  const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ sent: false, reason: 'RESEND_API_KEY missing', context });
  }

  const text = [
    'Bagmanci admin paneline giris yapildi.',
    `Zaman: ${now}`,
    `E-posta: ${context.email || '-'}`,
    `Cihaz: ${context.device || '-'}`,
    `Tarayici: ${context.browser || '-'}`,
    `Sistem: ${context.os || '-'}`,
    `Konum: ${[context.city, context.country].filter(Boolean).join(' / ') || '-'}`,
    `IP: ${context.ip || '-'}`,
    '',
    'Bu giris size ait degilse admin panelinden tum cihazlardan cikis yapip sifrenizi degistirin.'
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: [ALERT_TO],
      subject: 'Bagmanci Admin Girisi Yapildi',
      text
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Mail gonderilemedi');
    return res.status(200).json({ sent: false, reason: message, context });
  }

  return res.status(200).json({ sent: true, context });
}