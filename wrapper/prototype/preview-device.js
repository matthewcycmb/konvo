// iPhone 16e screen: 1170 × 2532 pixels, represented at 390 × 844.
// Scale the entire standalone desktop preview uniformly; never stretch its screen.
(() => {
  if (window.top !== window.self) return;
  const phone = document.querySelector('.phone');
  if (!phone) return;
  const toolbar = document.querySelector('.preview-toolbar, .preview-label');
  const touchDevice = matchMedia('(pointer: coarse)');
  function fitDevice() {
    if (touchDevice.matches) {
      for (const property of ['width', 'height', 'min-height', 'zoom']) phone.style.removeProperty(property);
      return;
    }
    phone.style.width = '390px';
    phone.style.height = '844px';
    phone.style.minHeight = '844px';
    phone.style.zoom = '1';
    const top = phone.getBoundingClientRect().top;
    const scale = Math.max(.1, Math.min(1, (innerHeight - top - 32) / 844, (innerWidth - 40) / 390));
    phone.style.zoom = String(scale);
    phone.dataset.previewDevice = 'iPhone 16e';
    phone.title = 'iPhone 16e · 390 × 844 screen · scaled uniformly to fit';
    if (toolbar) toolbar.title = phone.title;
  }
  fitDevice();
  addEventListener('resize', fitDevice);
  touchDevice.addEventListener('change', fitDevice);
})();
