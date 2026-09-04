export const config = {
  runtime: 'edge', // Vercel Edge: Türkiye'ye en yakın sunucudan ışık hızında yanıt verir
};

export default async function handler(req) {
  try {
    const response = await fetch('https://sukobfiyat.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      // ŞUKOB'a saniyede 100 kere vurup IP ban yemeyelim, 3 saniyede bir tazelesin
      next: { revalidate: 3 }
    });

    const html = await response.text();

    // Sayıyı cımbızla çeken mini yardımcı
    const temizle = (str) => {
      if (!str) return null;
      let m = str.match(/\d+([.,]\d{3})*([.,]\d{1,2})?/);
      if (!m) return null;
      let s = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
      return {
        formatli: isNaN(s) ? m[0] : s.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺',
        sayisal: s
      };
    };

    // HTML içindeki satırları arka planda Regex ile milisaniyede tara
    let sonuc = {};
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;

    while ((match = trRegex.exec(html)) !== null) {
      const rowContent = match[1];
      const cells = [...rowContent.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1].replace(/<[^>]*>/g, '').trim());

      if (cells.length >= 3) {
        const ad = cells[0].toUpperCase();
        const alis = temizle(cells[1]);
        const satis = temizle(cells[2]);

        if ((ad.includes('HAS') || ad.includes('GRAM')) && !sonuc.has) {
          sonuc.has = { alis, satis };
        } else if (ad.includes('22') && !sonuc.bilezik) {
          sonuc.bilezik = { alis, satis };
        } else if (ad.includes('ÇEYREK') && !sonuc.ceyrek) {
          sonuc.ceyrek = { alis, satis };
        } else if (ad.includes('YARIM') && !sonuc.yarim) {
          sonuc.yarim = { alis, satis };
        } else if ((ad.includes('ATA') || ad.includes('ZİYNET')) && !sonuc.ata) {
          sonuc.ata = { alis, satis };
        }
      }
    }

    return new Response(JSON.stringify(sonuc), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // Tarayıcı ve Vercel için 3 saniyelik ultra hızlı önbellek başlığı
        'Cache-Control': 's-maxage=3, stale-while-revalidate=5'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
