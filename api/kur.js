export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const sources = [
    'https://anlikaltinfiyatlari.com/altin/sanliurfa',
    'https://altinasistani.com/sanliurfa-altin-fiyatlari',
    'https://www.sukobfiyat.com/'
  ];

  for (const url of sources) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (response.ok) {
        const text = await response.text();
        return res.status(200).send(text);
      }
    } catch (e) {
      continue;
    }
  }

  return res.status(500).json({ error: 'Veri alinamadi' });
}
