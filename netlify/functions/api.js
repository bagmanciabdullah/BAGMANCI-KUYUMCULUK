const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
  const url = 'https://www.sukobfiyat.com/mobil.html#';

  // Sadece bu domainden gelen isteklere izin ver (Güvenlik)
  const headers = {
    'Access-Control-Allow-Origin': '*', // Netlify üzerinde kendi domainine kısıtlayabilirsin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTION',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const prices = [];

    // ŞUKOB Mobil ekranındaki tablo yapısını analiz edip veri çekme
    $('table tr').each((i, el) => {
      if (i === 0) return; // Başlık satırını atla

      const label = $(el).find('td').eq(0).text().trim();
      const alis = $(el).find('td').eq(1).text().trim().replace(' TL', '');
      const satis = $(el).find('td').eq(2).text().trim().replace(' TL', '');

      if (label && alis && satis) {
        // İsimleri Bağmancı marka diline göre sadeleştir
        let name = label;
        if (label.includes('HAS ALTIN')) name = 'Has Altın (Gr)';
        if (label.includes('22 AYAR')) name = '22 Ayar Bilezik';
        if (label.includes('ÇEYREK')) name = 'Yeni Çeyrek';
        if (label.includes('YARIM')) name = 'Yeni Yarım';
        if (label.includes('ATA')) name = 'Ata Lira (Ziynet)';

        prices.push({ name, alis, satis });
      }
    });

    // Dolar ve Euro kurunu da ekleyelim (Eğer ŞUKOB tablosunda varsa)
    const dolarAlis = $('#dolarAlis').text().trim(); // ŞUKOB koduna göre ID'leri bulmalıyız
    const dolarSatis = $('#dolarSatis').text().trim();
    if(dolarAlis && dolarSatis) {
        prices.push({name: 'Dolar / TL', alis: dolarAlis, satis: dolarSatis});
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(prices)
    };

  } catch (error) {
    console.error('Veri çekme hatası:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Fiyatlar şu an çekilemiyor, lütfen dükkanla iletişime geçin.' })
    };
  }
};
