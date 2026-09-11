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
    if (hero) {
      const original = hero.getAttribute('src');
      const applyHero = () => {
        const mode = document.body.dataset.theme === 'day' ? 'day' : 'night';
        const configured = window.BagmanciSiteAssets['hero:' + mode] || window.BagmanciSiteAssets['hero:main'];
        const url = configured || original;
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
