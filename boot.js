/* Entry gate — the visitor is immersed inside the ASCII sea at close-up.
   Clicking the Enter button dispatches a single continuous zoom-out that
   reveals the full wave, then the archive. Replay with ?entry=1, bypass
   with ?entry=0. The choreography lives in V13 of style.css. */
(() => {
  const entrance = document.getElementById('entrance');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Register the cache-clearing service worker as early as possible so it
  // can intercept the next navigation. A fresh SW activates on the next
  // page load and wipes every cache, so the user always sees the latest
  // deployment even if the browser had an old version cached.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  const finish = () => {
    entrance?.remove();
    // Strip every entrance-related class the gate may have set. Current
    // choreography uses 'entrance-immersed' + 'entrance-releasing'; the
    // legacy 'archive-releasing' class is intentionally not added anymore.
    document.body.classList.remove(
      'intro-open', 'entrance-immersed', 'entrance-releasing'
    );
    document.body.classList.add('archive-entered');
    window.archiveEntered = true;
    window.dispatchEvent(new Event('archive:entered'));
  };

  const force = new URLSearchParams(location.search).get('entry');
  if (!entrance || force === '0') {
    finish();
    return;
  }

  const button = document.getElementById('enter');
  const status = document.getElementById('entry-status-text');
  const loadBar = document.getElementById('entry-load-fill');
  const loadTrack = loadBar?.parentElement;
  let entered = false;

  // Hold the Enter button while the loading bar runs. The bar is a 2-second
  // visual indicator — it does NOT track real asset readiness (artwork /
  // fonts / OpenCC can finish earlier or later and we don't want to gate
  // the visitor on any single resource). After 2 seconds the button
  // becomes clickable regardless of asset state; the hard fallback below
  // is kept as a safety net.
  if (button) {
    button.setAttribute('disabled', '');
    button.style.opacity = '.4';
    button.style.pointerEvents = 'none';
  }
  if (status) status.textContent = 'LOADING · INITIALISING ARCHIVE';
  // Smooth but non-linear bar — each tick picks a random chunk of the
  // remaining distance AND a random transition duration (60–320ms), so
  // the bar accelerates and decelerates organically instead of marching
  // at one constant speed. The CSS transition smooths every jump so the
  // motion stays continuous, not stepped.
  loadTrack?.classList.add('is-loading');
  loadBar?.style.setProperty('transition', 'none');
  let pct = 0;
  const tick = () => {
    if (pct >= 100) {
      loadBar.style.transition = 'none';
      loadBar.style.width = '100%';
      finishLoading();
      return;
    }
    const remaining = 100 - pct;
    // Each step eats 6–22% of what's left — earlier jumps are big, later
    // jumps taper off so the bar settles naturally.
    const stepSize = Math.max(2, remaining * (0.06 + Math.random() * 0.16));
    // Vary the transition duration per tick so speed is never linear.
    const duration = 60 + Math.random() * 260;  // 60–320ms
    pct = Math.min(100, pct + stepSize);
    loadBar.style.transition = `width ${duration.toFixed(0)}ms ease-out`;
    loadBar.style.width = `${pct}%`;
    setTimeout(tick, duration);
  };
  setTimeout(tick, 100);  // start after first paint so width:0 is registered

  const finishLoading = () => {
    if (!button) return;
    loadTrack?.classList.add('is-complete');
    button.removeAttribute('disabled');
    button.style.opacity = '';
    button.style.pointerEvents = '';
    if (status) status.textContent = 'STANDBY · PRESS ENTER';
    // Let the user register the completed bar, then fade it out.
    setTimeout(() => loadTrack?.classList.remove('is-loading'), 600);
  };
  // The Enter button is gated on the bar reaching 100% — the tick() loop
  // above calls finishLoading() the moment pct hits 100. There is no
  // separate timer that can enable the button before the bar finishes,
  // so the button only ever lights up after the bar is fully drawn.

  // Hard fallback: never leave the button stuck on LOADING for more than
  // 6 seconds, even if some asset silently fails to load.
  const fallback = new Promise(resolve => setTimeout(resolve, 6000));
  fallback.then(() => {
    // If the 2s timer already fired this is a no-op.
    if (button?.hasAttribute('disabled')) finishLoading();
  });

  // Page-load: drop straight into the immersed close-up so the visitor
  // sees the sea already zoomed in. The CSS rule on body.intro-open.
  // entrance-immersed holds #ocean at scale 2.6 + blur 3.5px without
  // animating; the click dispatches the zoom-out transition.
  document.body.classList.add('entrance-immersed');

  // The single 3-second zoom-out after the click. Reduced-motion skips.
  const ZOOM_MS = reduce ? 0 : 3000;

  const begin = () => {
    if (entered || button?.hasAttribute('disabled')) return;
    entered = true;
    try { localStorage.removeItem('yinzhu-archive-entry'); } catch (_) {}
    // Force the page behind the entrance to home before the zoom-out, so the
    // gate always peels back onto scene 0. Without this, a reload at
    // #/contact, #/about, or any /works/:id would flash a non-home scene
    // after the entrance dissolves, because app.js already rendered that
    // route while the gate was on top.
    if (location.hash && location.hash !== '#/') location.hash = '#/';
    button?.setAttribute('disabled', '');
    if (status) status.textContent = 'LINK ESTABLISHED — ENTERING ARCHIVE';
    // Hand the camera over to CSS: swap to the releasing class which runs
    // the zoom-out, then finish() removes the entrance cleanly afterwards.
    document.body.classList.remove('entrance-immersed');
    document.body.classList.add('entrance-releasing');
    window.dispatchEvent(new Event('archive:release'));
    setTimeout(finish, ZOOM_MS);
  };

  button?.addEventListener('click', begin);
  window.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.altKey) begin();
  });
  // Keep keyboard users one Enter-key press away from the archive.
  setTimeout(() => button?.focus({ preventScroll: true }), 0);
})();