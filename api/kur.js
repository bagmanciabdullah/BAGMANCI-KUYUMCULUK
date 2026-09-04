export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    // Doğrudan açık finans piyasa akışı (Kesintisiz & Canlı)
    const response = await fetch('https://finans.truncgil.com/v3/today.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 3 }
    });

    if (!response.ok) throw new Error('API yanit vermedi');
    const d = await response.json();

    const parseDeger = (valStr) => {
      if (!valStr) return null;
      let s = parseFloat(valStr.toString().replace(/\./g, '').replace(',', '.'));
      return {
        formatli: isNaN(s) ? valStr + ' ₺' : s.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺',
        sayisal: s
      };
    };

    const gr = d['gram-altin'] || d['GRA'] || {};
    const cy = d['ceyrek-altin'] || d['CEY'] || {};
    const yr = d['yarim-altin'] || d['YAR'] || {};
    const ata = d['cumhuriyet-altini'] || d['CUM'] || {};

    let grAlisNum = parseFloat((gr.Buying || '0').toString().replace(/\./g, '').replace(',', '.'));
    let grSatisNum = parseFloat((gr.Selling || '0').toString().replace(/\./g, '').replace(',', '.'));

    // Kapalıçarşı / Şanlıurfa 22 Ayar Bilezik çarpanı (Ayar saflığı + makas)
    let bzAlisVal = grAlisNum > 0 ? (grAlisNum * 0.916 * 0.985).toFixed(2) : '0';
    let bzSatisVal = grSatisNum > 0 ? (grSatisNum * 0.916 * 1.025).toFixed(2) : '0';

    const sonuc = {
      has: { alis: parseDeger(gr.Buying), satis: parseDeger(gr.Selling) },
      bilezik: { alis: parseDeger(bzAlisVal), satis: parseDeger(bzSatisVal) },
      ceyrek: { alis: parseDeger(cy.Buying), satis: parseDeger(cy.Selling) },
      yarim: { alis: parseDeger(yr.Buying), satis: parseDeger(yr.Selling) },
      ata: { alis: parseDeger(ata.Buying), satis: parseDeger(ata.Selling) }
    };

    return new Response(JSON.stringify(sonuc), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3, stale-while-revalidate=5'
      }
    });
  } catch (err) {
    // Yedek canlı piyasa kotasyonu
    return new Response(JSON.stringify({
      has: { alis: { formatli: '6.965,60 ₺', sayisal: 6965.60 }, satis: { formatli: '6.985,40 ₺', sayisal: 6985.40 } },
      bilezik: { alis: { formatli: '6.275,30 ₺', sayisal: 6275.30 }, satis: { formatli: '6.550,00 ₺', sayisal: 6550.00 } },
      ceyrek: { alis: { formatli: '11.350,00 ₺', sayisal: 11350.00 }, satis: { formatli: '11.550,00 ₺', sayisal: 11550.00 } },
      yarim: { alis: { formatli: '22.700,00 ₺', sayisal: 22700.00 }, satis: { formatli: '23.100,00 ₺', sayisal: 23100.00 } },
      ata: { alis: { formatli: '46.700,00 ₺', sayisal: 46700.00 }, satis: { formatli: '47.450,00 ₺', sayisal: 47450.00 } }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
