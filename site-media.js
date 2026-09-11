window.BagmanciSiteAssets = Object.create(null);
window.BagmanciSiteAssetFallbacks = Object.create(null);
(async () => {
  const cfg = window.BAGMANCI_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) return;
  const client = typeof getSiteContentClient === 'function' ? getSiteContentClient() : window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    const { data, error } = await client.from('site_assets').select('key,url,original_url');
    if (error) return;
    for (const item of data || []) {
      let url;
      try { url = new URL(item.url); } catch { continue; }
      if (url.protocol !== 'https:') continue;
      window.BagmanciSiteAssets[item.key] = url.href;
      if (item.original_url && item.original_url !== item.url) {
        try {
          const original = new URL(item.original_url);
          if (original.protocol === 'https:') window.BagmanciSiteAssetFallbacks[item.key] = original.href;
        } catch {}
      }
    }
    for (const mode of ['day','night']) {
      const key = 'background:' + mode;
      const url = window.BagmanciSiteAssets[key];
      const fallback = window.BagmanciSiteAssetFallbacks[key];
      if (url) {
        const value = fallback ? `url(${JSON.stringify(url)}), url(${JSON.stringify(fallback)})` : `url(${JSON.stringify(url)})`;
        document.body.style.setProperty('--bg-image-' + mode, value);
      }
    }
    const hero = document.querySelector('.hero-banner img');
    if (hero) {
      const original = hero.getAttribute('src');
      const applyHero = () => {
        const mode = document.body.dataset.theme === 'day' ? 'day' : 'night';
        const key = window.BagmanciSiteAssets['hero:' + mode] ? 'hero:' + mode : 'hero:main';
        const configured = window.BagmanciSiteAssets[key];
        const fallback = window.BagmanciSiteAssetFallbacks[key] || original;
        const url = configured || original;
        hero.onerror = () => {
          if (hero.getAttribute('src') !== fallback) hero.src = fallback;
        };
        if (hero.getAttribute('src') !== url) hero.src = url;
        hero.parentElement.style.height = configured ? 'auto' : '';
        hero.parentElement.style.aspectRatio = configured ? '2.4' : '';
        hero.style.objectPosition = configured ? 'center' : '';
      };
      applyHero();
      new MutationObserver(applyHero).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }
    if (typeof renderCatalogCovers === 'function') renderCatalogCovers();
  } catch (error) { console.warn('Site görselleri yüklenemedi.', error); }
})();
