(() => {
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Uygulama desteği başlatılamadı.', error));
    });
  }
  let installEvent;
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = 'Uygulamayı Yükle'; button.hidden = true;
  button.style.cssText = 'position:fixed;right:16px;bottom:92px;z-index:90;background:#d4af37;color:#06251d;border:1px solid #947422;border-radius:8px;padding:12px 16px;font:600 14px sans-serif;box-shadow:0 4px 16px #0003;cursor:pointer';
  document.body.append(button);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installEvent = event;
    button.hidden = window.matchMedia('(display-mode: standalone)').matches;
  });
  button.onclick = async () => {
    if (!installEvent) return;
    button.hidden = true;
    try { await installEvent.prompt(); await installEvent.userChoice; }
    finally { installEvent = null; }
  };
  window.addEventListener('appinstalled', () => { button.hidden = true; installEvent = null; });
})();
