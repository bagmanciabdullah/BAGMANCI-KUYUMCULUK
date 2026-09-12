const DEFAULT_TO = process.env.NOTIFY_EMAIL_TO || process.env.LOGIN_ALERT_TO || 'bagmanciabdullah93@gmail.com';
const DEFAULT_FROM = process.env.NOTIFY_EMAIL_FROM || process.env.LOGIN_ALERT_FROM || 'Bagmanci Bildirim <onboarding@resend.dev>';
const ALLOWED_HOSTS = ['bagmancikuyumculuk.com.tr', 'www.bagmancikuyumculuk.com.tr', 'localhost', '127.0.0.1'];

function originAllowed(req) {
  const origin = req.headers.origin || '';
  if (!origin) return true;
  try {
    return ALLOWED_HOSTS.includes(new URL(origin).hostname.toLowerCase());
  } catch (error) {
    return false;
  }
}

function clean(value, limit = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function money(value) {
  const number = Number(value) || 0;
  return number.toLocaleString('tr-TR') + ' TL';
}

function shortItems(items) {
  if (!Array.isArray(items) || !items.length) return '-';
  return items.slice(0, 8).map((item, index) => {
    const name = clean(item.ad || item.name || 'Urun', 80);
    const sku = clean(item.sku || item.stock_code || item.kod || item.id || '', 40);
    const price = item.f || item.price ? ` - ${money(item.f || item.price)}` : '';
    return `${index + 1}. ${name}${sku ? ` (${sku})` : ''}${price}`;
  }).join('\n');
}

function buildMessage(type, body = {}) {
  const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  if (type === 'order') {
    const subject = 'Yeni Bagmanci Siparisi';
    const telegramText = [
      'Yeni siparis geldi.',
      `Zaman: ${now}`,
      `Musteri: ${clean(body.customer_name || body.name, 90) || '-'}`,
      `Telefon: ${clean(body.phone, 40) || '-'}`,
      `E-posta: ${clean(body.email, 120) || '-'}`,
      `Konum: ${[clean(body.district, 80), clean(body.city, 80)].filter(Boolean).join(' / ') || '-'}`,
      `Urun adedi: ${Number(body.item_count) || (Array.isArray(body.items) ? body.items.length : 0)}`,
      `Toplam: ${money(body.total)}`,
      'Odeme: Havale / EFT',
      '',
      'Urunler:',
      shortItems(body.items),
      '',
      `Not: ${clean(body.note, 280) || '-'}`,
      '',
      'TC/VKN ve acik adres bildirime eklenmedi; admin panelde gorunur.'
    ].join('\n');
    const emailText = [
      'BAGMANCI KUYUMCULUK & SAAT',
      'SIPARIS / FATURA BILGI FORMU',
      '',
      `Siparis zamani: ${now}`,
      `Odeme yontemi: Havale / EFT`,
      `Toplam tutar: ${money(body.total)}`,
      '',
      'MUSTERI BILGILERI',
      `Ad Soyad: ${clean(body.customer_name || body.name, 140) || '-'}`,
      `Telefon: ${clean(body.phone, 60) || '-'}`,
      `E-posta: ${clean(body.email, 160) || '-'}`,
      '',
      'TESLIMAT BILGILERI',
      `Il / Ilce: ${[clean(body.city, 80), clean(body.district, 80)].filter(Boolean).join(' / ') || '-'}`,
      `Adres: ${clean(body.shipping_address, 900) || '-'}`,
      '',
      'FATURA BILGILERI',
      `Fatura adi/unvani: ${clean(body.invoice_name, 180) || clean(body.customer_name || body.name, 140) || '-'}`,
      `TC Kimlik No / Vergi No: ${clean(body.invoice_identity_no, 40) || '-'}`,
      `Fatura tipi: ${body.corporate_invoice ? 'Kurumsal' : 'Bireysel'}`,
      `Vergi dairesi: ${clean(body.tax_office, 160) || '-'}`,
      `Fatura adresi farkli mi: ${body.invoice_address_different ? 'Evet' : 'Hayir'}`,
      `Fatura adresi: ${clean(body.invoice_address, 900) || clean(body.shipping_address, 900) || '-'}`,
      '',
      'URUNLER',
      shortItems(body.items),
      '',
      `Siparis notu: ${clean(body.note, 900) || '-'}`,
      '',
      'Bu e-posta otomatik olusturuldu. Siparis detaylari admin panelinde de kayitlidir.'
    ].join('\n');
    return { subject, telegramText, emailText };
  }

  const subject = 'Yeni Bagmanci Musteri Sorusu';
  const text = [
    'Yeni musteri sorusu geldi.',
    `Zaman: ${now}`,
    `Musteri: ${clean(body.name, 90) || '-'}`,
    `Telefon: ${clean(body.phone, 40) || '-'}`,
    `E-posta: ${clean(body.email, 120) || '-'}`,
    '',
    `Soru: ${clean(body.question, 700) || '-'}`,
    '',
    'Cevaplamak icin admin panelindeki Sorular ve Duyurular alanini ac.'
  ].join('\n');
  return { subject, telegramText: text, emailText: text };
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing' };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  if (!response.ok) return { sent: false, reason: await response.text().catch(() => 'Telegram failed') };
  return { sent: true };
}

async function sendEmail(subject, text) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY missing' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: DEFAULT_FROM, to: [DEFAULT_TO], subject, text })
  });
  if (!response.ok) return { sent: false, reason: await response.text().catch(() => 'Email failed') };
  return { sent: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  if (!originAllowed(req)) return res.status(403).json({ error: true, message: 'Origin denied' });

  const type = clean(req.body?.type, 20);
  if (!['order', 'question'].includes(type)) return res.status(400).json({ error: true, message: 'Invalid notification type' });

  const { subject, telegramText, emailText } = buildMessage(type, req.body?.payload || {});
  const [telegram, email] = await Promise.allSettled([sendTelegram(telegramText), sendEmail(subject, emailText)]);

  return res.status(200).json({
    ok: true,
    telegram: telegram.status === 'fulfilled' ? telegram.value : { sent: false, reason: telegram.reason?.message || 'Telegram error' },
    email: email.status === 'fulfilled' ? email.value : { sent: false, reason: email.reason?.message || 'Email error' }
  });
}
