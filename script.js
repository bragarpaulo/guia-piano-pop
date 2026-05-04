/* ============================================================
   BIANCA RIBEIRO — Guia Piano Pop
   Atribuição (UTM + click IDs) + enriquecimento dos CTAs Hotmart
   + Meta Pixel custom_data no clique (InitiateCheckout)
   ============================================================ */
(function () {
  'use strict';

  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const CLICK_ID_KEYS = ['fbclid', 'gclid', 'ttclid', 'msclkid'];
  const HOTMART_PREFIX = 'https://pay.hotmart.com';

  function readCookie(name) {
    try {
      const m = document.cookie.match(
        new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
      );
      return m ? decodeURIComponent(m[1]) : '';
    } catch (_) { return ''; }
  }

  // UTMs: usa as da URL se houver; senão recupera do sessionStorage; senão "organico" (sem mover fbclid pra utm).
  function captureUTMs() {
    const params = new URLSearchParams(window.location.search);
    let hasFresh = false;
    const fresh = {};
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) hasFresh = true;
      fresh[k] = v || 'organico';
    });
    if (hasFresh) {
      try { sessionStorage.setItem('gpp_utms', JSON.stringify(fresh)); } catch (_) {}
      return fresh;
    }
    try {
      const stored = sessionStorage.getItem('gpp_utms');
      if (stored) return JSON.parse(stored);
      sessionStorage.setItem('gpp_utms', JSON.stringify(fresh));
    } catch (_) {}
    return fresh;
  }

  // Click IDs: persiste em sessionStorage (sobrevive a navegação interna #oferta etc.)
  function captureClickIds() {
    const params = new URLSearchParams(window.location.search);
    const out = {};
    CLICK_ID_KEYS.forEach((k) => {
      let v = params.get(k);
      if (!v) {
        try { v = sessionStorage.getItem('gpp_' + k) || ''; } catch (_) { v = ''; }
      }
      if (v) {
        out[k] = v;
        try { sessionStorage.setItem('gpp_' + k, v); } catch (_) {}
      }
    });
    return out;
  }

  function deviceSnapshot() {
    const nav = navigator || {};
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    let tz;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) {}
    return {
      browser_language: nav.language || undefined,
      client_timezone: tz,
      screen_width: (typeof screen !== 'undefined' && screen.width) || undefined,
      screen_height: (typeof screen !== 'undefined' && screen.height) || undefined,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      connection_type: conn.effectiveType || undefined,
      is_touch: ('ontouchstart' in window) ? 1 : 0,
      hardware_concurrency: nav.hardwareConcurrency || undefined,
      device_memory: nav.deviceMemory || undefined,
      platform: nav.platform || undefined,
      referrer: document.referrer || '',
      landing_url: window.location.href,
    };
  }

  const UTMS = captureUTMs();
  const CLICK_IDS = captureClickIds();

  // Expõe pra outros scripts (inline pixel, etc.) lerem
  window.GPP_UTMS = UTMS;
  window.GPP_CLICK_IDS = CLICK_IDS;
  window.GPP_CUSTOM_DATA = function () {
    return Object.assign({}, UTMS, CLICK_IDS, deviceSnapshot(), {
      fbc: readCookie('_fbc') || undefined,
      fbp: readCookie('_fbp') || undefined,
    });
  };

  // Empacota pares [shortKey, value] em "k1=v1|k2=v2" respeitando limite total (Hotmart: 30ch por param).
  // Pula vazios e "organico" pra não gastar caracteres. Trunca valor se passar do orçamento restante.
  function packKVs(pairs, maxLen) {
    let out = '';
    for (const [k, v] of pairs) {
      if (!v || v === 'organico') continue;
      const sep = out.length ? '|' : '';
      const room = maxLen - out.length - sep.length - k.length - 1; // 1 = "="
      if (room <= 0) break;
      const s = String(v);
      out += sep + k + '=' + (s.length > room ? s.slice(0, room) : s);
    }
    return out;
  }

  function enrichHref(a) {
    try {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith(HOTMART_PREFIX)) return;
      const url = new URL(href);

      // 1) UTMs canônicos + click IDs + cookies Meta (Hotmart NÃO preserva no webhook,
      //    mas servem pra qualquer tracker inline e pra Hotmart Cart Pixel)
      Object.entries(UTMS).forEach(([k, v]) => {
        if (!url.searchParams.has(k)) url.searchParams.set(k, v);
      });
      Object.entries(CLICK_IDS).forEach(([k, v]) => {
        if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
      });
      const fbc = readCookie('_fbc');
      const fbp = readCookie('_fbp');
      if (fbc && !url.searchParams.has('_fbc')) url.searchParams.set('_fbc', fbc);
      if (fbp && !url.searchParams.has('_fbp')) url.searchParams.set('_fbp', fbp);

      // 2) src + xcod packed (Hotmart PRESERVA e Stafy webhook decoda):
      //    src  → tracking.source             → s=source|m=medium|c=campaign       (≤30ch)
      //    xcod → tracking.external_reference → n=content|t=term|f=fbclid|g=gclid  (≤30ch)
      //    sck NÃO é usado aqui (reservado pro time comercial).
      const src = packKVs([
        ['s', UTMS.utm_source],
        ['m', UTMS.utm_medium],
        ['c', UTMS.utm_campaign],
      ], 30);
      const xcod = packKVs([
        ['n', UTMS.utm_content],
        ['t', UTMS.utm_term],
        ['f', CLICK_IDS.fbclid],
        ['g', CLICK_IDS.gclid],
      ], 30);
      if (src && !url.searchParams.has('src')) url.searchParams.set('src', src);
      if (xcod && !url.searchParams.has('xcod')) url.searchParams.set('xcod', xcod);

      a.setAttribute('href', url.toString());
    } catch (_) {}
  }

  function enrichAll() {
    document.querySelectorAll('a[href^="' + HOTMART_PREFIX + '"]').forEach(enrichHref);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enrichAll, { once: true });
  } else {
    enrichAll();
  }

  // Garantia: re-enriquece no clique e dispara InitiateCheckout com custom_data
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest && e.target.closest('a[href^="' + HOTMART_PREFIX + '"]');
    if (!a) return;
    enrichHref(a);
    try {
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', Object.assign(
          { content_name: 'guia-piano-pop', content_category: 'piano-pop-ebook' },
          UTMS, CLICK_IDS
        ));
      }
    } catch (_) {}
  }, true);
})();
