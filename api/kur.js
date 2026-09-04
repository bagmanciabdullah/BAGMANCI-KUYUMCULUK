export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');

  try {
    // ŞUKOB'un doğrudan fiyat tablosunu barındıran mobil sayfasını çekiyoruz
    const response = await fetch('https://www.sukobfiyat.com/mobil.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).json({ error: 'Veri alinamadi' });
  }
}
