/* Süti (cookie) UI — késleltetve töltődik, nem a critical main.js része. */
(function () {
  'use strict';

  const COOKIE_CONSENT_NAME = 'cookie_consent';
  const COOKIE_CONSENT_DAYS = 365;
  const COOKIE_CONSENT_VERSION = 1;
  const GOOGLE_ADS_ID = '';

  function getGoogleAdsId() {
    const fromDom = document.documentElement.getAttribute('data-google-ads-id') || '';
    return (fromDom || GOOGLE_ADS_ID || '').trim();
  }

  function defaultConsent() {
    return {
      necessary: true,
      functional: false,
      marketing: false,
      v: COOKIE_CONSENT_VERSION,
    };
  }

  function readConsentCookie() {
    const match = document.cookie.match(/(?:^|;\s*)cookie_consent=([^;]*)/);
    if (!match) return null;
    try {
      const data = JSON.parse(decodeURIComponent(match[1]));
      if (!data || typeof data !== 'object') return null;
      return {
        necessary: true,
        functional: !!data.functional,
        marketing: !!data.marketing,
        v: Number(data.v) || 1,
      };
    } catch {
      return null;
    }
  }

  function writeConsentCookie(consent) {
    const payload = encodeURIComponent(
      JSON.stringify({
        necessary: true,
        functional: !!consent.functional,
        marketing: !!consent.marketing,
        v: COOKIE_CONSENT_VERSION,
      })
    );
    const maxAge = COOKIE_CONSENT_DAYS * 24 * 60 * 60;
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE_CONSENT_NAME + '=' + payload + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + secure;
  }

  function getConsent() {
    return readConsentCookie();
  }

  function hasFunctionalConsent() {
    return !!getConsent()?.functional;
  }

  function clearMarketingCookies() {
    const names = ['_gcl_au', '_gcl_aw', '_gcl_dc', '_gcl_gb', '_gac_gb'];
    const host = location.hostname.replace(/^www\./, '');
    const domains = ['', location.hostname, '.' + host];
    names.forEach((name) => {
      domains.forEach((domain) => {
        const domainPart = domain ? '; Domain=' + domain : '';
        document.cookie = name + '=; Path=/' + domainPart + '; Max-Age=0; SameSite=Lax';
      });
    });
  }

  function loadGoogleAds(adsId) {
    if (!adsId || window.__thAdsLoaded) return;
    window.__thAdsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };
    window.gtag('js', new Date());
    window.gtag('config', adsId);
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(adsId);
    script.dataset.thAds = '1';
    document.head.appendChild(script);
  }

  function unloadGoogleAds() {
    document.querySelectorAll('script[data-th-ads], script[src*="googletagmanager.com/gtag"]').forEach((el) => {
      el.remove();
    });
    clearMarketingCookies();
    window.__thAdsLoaded = false;
  }

  function unloadMaps() {
    document.querySelectorAll('[data-map-facade]').forEach((host) => {
      const iframe = host.querySelector('iframe');
      if (iframe) iframe.remove();
      host.classList.remove('is-loaded');
      const btn = host.querySelector('[data-map-load]');
      if (btn) btn.hidden = false;
    });
  }

  function applyConsent(consent) {
    document.documentElement.classList.toggle('cookie-functional', !!consent.functional);
    document.documentElement.classList.toggle('cookie-marketing', !!consent.marketing);

    if (consent.marketing) {
      const adsId = getGoogleAdsId();
      if (adsId) loadGoogleAds(adsId);
    } else {
      unloadGoogleAds();
    }

    if (!consent.functional) unloadMaps();

    document.dispatchEvent(
      new CustomEvent('cookieconsent:change', {
        detail: { ...consent },
      })
    );
  }

  function saveConsent(partial) {
    const consent = {
      ...defaultConsent(),
      ...partial,
      necessary: true,
      v: COOKIE_CONSENT_VERSION,
    };
    writeConsentCookie(consent);
    applyConsent(consent);
    return consent;
  }

  let cookieUi = null;
  let cookiePendingMap = null;
  let cookieLastFocus = null;

  function buildCookieUi() {
    if (cookieUi) return cookieUi;

    const root = document.createElement('div');
    root.className = 'cookie-root';
    root.dataset.cookieRoot = '';
    root.innerHTML =
      '<div class="cookie-banner" data-cookie-banner hidden role="dialog" aria-modal="false" aria-labelledby="cookie-banner-title" aria-describedby="cookie-banner-desc">' +
      '<div class="cookie-banner__inner">' +
      '<p class="cookie-banner__text" id="cookie-banner-desc">' +
      '<span id="cookie-banner-title" class="cookie-banner__title">Sütik.</span> ' +
      'A működéshez szükségesek; a térképhez és a hirdetésekhez hozzájárulás kell. ' +
      '<a href="cookie.html">Részletek</a></p>' +
      '<div class="cookie-banner__actions">' +
      '<button type="button" class="cookie-link" data-cookie-reject>Csak szükséges</button>' +
      '<button type="button" class="cookie-link" data-cookie-customize>Beállítások</button>' +
      '<button type="button" class="cookie-accept" data-cookie-accept-all>Elfogadom</button>' +
      '</div></div></div>' +
      '<div class="cookie-modal" data-cookie-modal hidden>' +
      '<button type="button" class="cookie-modal__backdrop" data-cookie-close tabindex="-1" aria-label="Bezárás"></button>' +
      '<div class="cookie-modal__panel" role="dialog" aria-modal="true" aria-labelledby="cookie-modal-title">' +
      '<div class="cookie-modal__head">' +
      '<h2 class="cookie-modal__title" id="cookie-modal-title">Sütibeállítások</h2>' +
      '<button type="button" class="cookie-modal__x" data-cookie-close aria-label="Bezárás"><span aria-hidden="true">×</span></button>' +
      '</div>' +
      '<p class="cookie-modal__lead">Válassza ki, mely kategóriákat engedélyezi. A szükséges sütik a weboldal működéséhez kellenek, ezeket nem lehet kikapcsolni.</p>' +
      '<div class="cookie-cats">' +
      '<div class="cookie-cat"><div class="cookie-cat__row"><div>' +
      '<p class="cookie-cat__name">Szükséges</p>' +
      '<p class="cookie-cat__desc">Biztonság, navigáció, űrlapok, döntés megjegyzése.</p>' +
      '</div><label class="cookie-switch cookie-switch--locked">' +
      '<input type="checkbox" checked disabled aria-label="Szükséges sütik — mindig aktív">' +
      '<span class="cookie-switch__ui" aria-hidden="true"></span></label></div></div>' +
      '<div class="cookie-cat" data-cookie-cat="functional"><div class="cookie-cat__row"><div>' +
      '<p class="cookie-cat__name">Funkcionális — Google Maps</p>' +
      '<p class="cookie-cat__desc">Interaktív térkép megjelenítése a székhelyhez.</p>' +
      '</div><label class="cookie-switch">' +
      '<input type="checkbox" data-cookie-toggle="functional" aria-label="Funkcionális sütik — Google Maps">' +
      '<span class="cookie-switch__ui" aria-hidden="true"></span></label></div></div>' +
      '<div class="cookie-cat" data-cookie-cat="marketing"><div class="cookie-cat__row"><div>' +
      '<p class="cookie-cat__name">Marketing — Google Ads</p>' +
      '<p class="cookie-cat__desc">Konverziómérés, remarketing, hirdetés-hatékonyság.</p>' +
      '</div><label class="cookie-switch">' +
      '<input type="checkbox" data-cookie-toggle="marketing" aria-label="Marketing sütik — Google Ads">' +
      '<span class="cookie-switch__ui" aria-hidden="true"></span></label></div></div>' +
      '</div>' +
      '<p class="cookie-modal__more"><a href="cookie.html">Süti (cookie) tájékoztató</a></p>' +
      '<div class="cookie-modal__actions">' +
      '<button type="button" class="cookie-link" data-cookie-reject>Csak szükséges</button>' +
      '<button type="button" class="cookie-link" data-cookie-save>Mentés</button>' +
      '<button type="button" class="cookie-accept" data-cookie-accept-all>Összes elfogadása</button>' +
      '</div></div></div>';

    document.body.appendChild(root);

    const banner = root.querySelector('[data-cookie-banner]');
    const modal = root.querySelector('[data-cookie-modal]');
    const functionalToggle = root.querySelector('[data-cookie-toggle="functional"]');
    const marketingToggle = root.querySelector('[data-cookie-toggle="marketing"]');

    const hideBanner = () => {
      banner.hidden = true;
      document.body.classList.remove('cookie-banner-open');
    };

    const showBanner = () => {
      banner.hidden = false;
      document.body.classList.add('cookie-banner-open');
    };

    const syncToggles = (consent) => {
      functionalToggle.checked = !!consent?.functional;
      marketingToggle.checked = !!consent?.marketing;
    };

    const closeModal = () => {
      modal.hidden = true;
      document.body.classList.remove('cookie-modal-open');
      root.querySelectorAll('.cookie-cat.is-highlight').forEach((el) => el.classList.remove('is-highlight'));
      if (cookieLastFocus && typeof cookieLastFocus.focus === 'function') cookieLastFocus.focus();
      cookieLastFocus = null;
    };

    const openModal = (opts = {}) => {
      cookieLastFocus = document.activeElement;
      syncToggles(getConsent() || defaultConsent());
      root.querySelectorAll('.cookie-cat.is-highlight').forEach((el) => el.classList.remove('is-highlight'));
      if (opts.highlight) {
        root.querySelector('[data-cookie-cat="' + opts.highlight + '"]')?.classList.add('is-highlight');
      }
      if (opts.pendingMap) {
        cookiePendingMap = opts.pendingMap;
        opts.pendingMap.setAttribute('data-map-pending', '1');
      }
      modal.hidden = false;
      document.body.classList.add('cookie-modal-open');
      hideBanner();
      window.setTimeout(() => {
        (opts.highlight === 'functional'
          ? functionalToggle
          : root.querySelector('[data-cookie-close].cookie-modal__x')
        )?.focus();
      }, 30);
    };

    const finish = (consent) => {
      if (cookiePendingMap) {
        if (consent.functional) cookiePendingMap.setAttribute('data-map-pending', '1');
        else cookiePendingMap.removeAttribute('data-map-pending');
        cookiePendingMap = null;
      }
      saveConsent(consent);
      hideBanner();
      closeModal();
    };

    root.addEventListener('click', (e) => {
      const t = e.target.closest(
        '[data-cookie-accept-all], [data-cookie-reject], [data-cookie-customize], [data-cookie-save], [data-cookie-close]'
      );
      if (!t) return;
      if (t.hasAttribute('data-cookie-accept-all')) {
        finish({ functional: true, marketing: true });
        return;
      }
      if (t.hasAttribute('data-cookie-reject')) {
        finish({ functional: false, marketing: false });
        return;
      }
      if (t.hasAttribute('data-cookie-customize')) {
        openModal();
        return;
      }
      if (t.hasAttribute('data-cookie-save')) {
        finish({
          functional: functionalToggle.checked,
          marketing: marketingToggle.checked,
        });
        return;
      }
      if (t.hasAttribute('data-cookie-close')) {
        closeModal();
        if (!getConsent()) showBanner();
      }
    });

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        if (!getConsent()) showBanner();
        return;
      }
      if (e.key !== 'Tab' || modal.hidden) return;
      const focusables = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')].filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    cookieUi = { root, banner, modal, showBanner, hideBanner, openModal, closeModal, syncToggles };
    return cookieUi;
  }

  function openCookieSettings(opts = {}) {
    buildCookieUi().openModal(opts);
  }

  window.THCookie = {
    getConsent,
    hasFunctionalConsent,
    applyConsent,
    openSettings: openCookieSettings,
    showBanner: function () {
      buildCookieUi().showBanner();
    },
  };
})();
