window.BagmanciSiteAssets = Object.create(null);
(async () => {
  const cfg = window.BAGMANCI_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) return;
  const client = typeof getSiteContentClient === 'function' ? getSiteContentClient() : window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    const { data, error } = await client.from('site_assets').select('key,url');
    if (error) return;
    for (const item of data || []) {
      let url;
      try { url = new URL(item.url); } catch { continue; }
      if (url.protocol !== 'https:') continue;
      window.BagmanciSiteAssets[item.key] = url.href;
    }
    for (const mode of ['day','night']) {
      const url = window.BagmanciSiteAssets['background:' + mode];
      if (url) document.body.style.setProperty('--bg-image-' + mode, `url(${JSON.stringify(url)})`);
    }
    const hero = document.querySelector('.hero-banner img');
    if (hero && window.BagmanciSiteAssets['hero:main']) {
      hero.src = window.BagmanciSiteAssets['hero:main'];
      hero.parentElement.style.height = 'auto'; hero.parentElement.style.aspectRatio = '2.4';
      hero.style.objectPosition = 'center';
    }
    if (typeof renderCatalogCovers === 'function') renderCatalogCovers();
  } catch (error) { console.warn('Site görselleri yüklenemedi.', error); }
})();
