/* --app-height: csak a főoldal head inline scriptje állítja (hero). */

function initHeaderAndMenu() {
  const header = document.querySelector('.site-header');
  const heroSentinel = document.querySelector('.hero-sentinel');
  const hero = document.querySelector('.hero');
  const heroMedia = document.querySelector('.hero__media');

  if (header?.classList.contains('is-solid')) {
    document.body.classList.add('header-solid');
  }

  /*
   * Makeup-szerű pinned hero: a kép fixed marad, a következő szekció rácsúszik.
   * Solid fejléc + kép elrejtése csak a hero után (mikor már a következő szekció takar).
   */
  if (header && hero && heroMedia) {
    header.classList.remove('is-solid');
    document.body.classList.remove('header-solid', 'past-hero');
    const heroTrust = hero.querySelector('.hero-trust');
    let coverState = false;
    let mediaHidden = null;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const updateHeroPin = () => {
      const pastHero = window.scrollY >= hero.offsetHeight - 2;
      if (mediaHidden !== pastHero) {
        mediaHidden = pastHero;
        heroMedia.classList.toggle('is-hidden', pastHero);
        document.body.classList.toggle('past-hero', pastHero);
      }

      /* Fejléc háttér csak ütközéskor / hero után — ne a reveal-transform miatt betöltéskor */
      let coverHeader = pastHero;
      if (!pastHero && heroTrust) {
        const trustReady = prefersReduced || heroTrust.classList.contains('reveal-in');
        if (trustReady) {
          const gap = 8;
          coverHeader = heroTrust.getBoundingClientRect().top <= header.offsetHeight + gap;
        } else {
          coverHeader = false;
        }
      }

      if (coverHeader === coverState) return;
      coverState = coverHeader;
      header.classList.toggle('is-solid', coverHeader);
      document.body.classList.toggle('header-solid', coverHeader);
    };

    window.addEventListener('scroll', updateHeroPin, { passive: true });
    window.addEventListener('resize', updateHeroPin, { passive: true });
    updateHeroPin();
    /* Reveal után újraértékelés (különben beragadhat a téves solid) */
    window.setTimeout(updateHeroPin, 120);
  } else if (header && heroSentinel && 'IntersectionObserver' in window) {
    header.classList.remove('is-solid');
    document.body.classList.remove('header-solid', 'past-hero');
    let isSolid = false;
    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        const shouldSolid = !entry.isIntersecting;
        if (shouldSolid === isSolid) return;
        isSolid = shouldSolid;
        header.classList.toggle('is-solid', shouldSolid);
        document.body.classList.toggle('header-solid', shouldSolid);
        document.body.classList.toggle('past-hero', shouldSolid);
      },
      { root: null, threshold: 0, rootMargin: '0px' }
    );
    headerObserver.observe(heroSentinel);
  } else if (header) {
    header.classList.add('is-solid');
    document.body.classList.add('header-solid');
  }

  const menuFab = document.querySelector('.menu-fab');
  const menuSheet = document.getElementById('site-menu');
  const menuBackdrop = menuSheet?.querySelector('.menu-sheet__backdrop');
  const menuPanel = menuSheet?.querySelector('.menu-sheet__panel');
  let menuCloseTimer = null;

  const closeMenu = () => {
    if (!menuFab || !menuSheet || menuSheet.hidden) return;
    menuFab.setAttribute('aria-expanded', 'false');
    menuFab.setAttribute('aria-label', 'Menü megnyitása');
    menuSheet.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    if (menuCloseTimer) window.clearTimeout(menuCloseTimer);
    menuCloseTimer = window.setTimeout(() => {
      menuSheet.hidden = true;
      menuFab.focus({ preventScroll: true });
      menuCloseTimer = null;
    }, 320);
  };

  const openMenu = () => {
    if (!menuFab || !menuSheet) return;
    if (menuCloseTimer) {
      window.clearTimeout(menuCloseTimer);
      menuCloseTimer = null;
    }
    menuSheet.hidden = false;
    menuFab.setAttribute('aria-expanded', 'true');
    menuFab.setAttribute('aria-label', 'Menü bezárása');
    document.body.classList.add('menu-open');
    window.requestAnimationFrame(() => {
      menuSheet.classList.add('is-open');
      const firstLink = menuSheet.querySelector('.menu-sheet__dd-toggle, .menu-sheet__nav a');
      firstLink?.focus({ preventScroll: true });
    });
  };

  if (menuFab && menuSheet) {
    menuFab.addEventListener('click', () => {
      const isOpen = menuFab.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeMenu();
      else openMenu();
    });

    menuBackdrop?.addEventListener('click', closeMenu);

    menuSheet.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    menuSheet.querySelectorAll('.menu-sheet__dd-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panelId = btn.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : null;
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (panel) panel.hidden = open;
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuSheet.classList.contains('is-open')) {
        e.preventDefault();
        closeMenu();
      }
    });

    /* Egyszerű fókuszcsapda a panelen */
    menuPanel?.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !menuSheet.classList.contains('is-open')) return;
      const focusables = [
        ...menuPanel.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'),
      ].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
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
  }

  /* Desktop szolgáltatás dropdown — touch: első tap nyit, második megy */
  document.querySelectorAll('.nav-dd').forEach((dd) => {
    const trigger = dd.querySelector('.nav-dd__trigger');
    if (!trigger) return;

    const setOpen = (open) => {
      dd.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    trigger.addEventListener('click', (e) => {
      const touchLike = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      if (!touchLike) return;
      if (!dd.classList.contains('is-open')) {
        e.preventDefault();
        document.querySelectorAll('.nav-dd.is-open').forEach((other) => {
          if (other !== dd) {
            other.classList.remove('is-open');
            other.querySelector('.nav-dd__trigger')?.setAttribute('aria-expanded', 'false');
          }
        });
        setOpen(true);
      }
    });

    document.addEventListener('click', (e) => {
      if (!dd.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });
  });
}

function initCritical() {
  initHeaderAndMenu();
  setupFaqAccordion();
  setupQuoteForms();
  setupContactForms();
  setupSplitSectionReveals();
  initHeroReveals();
  initSubIntroReveals();
  initWhySplitReveal();
  initReveal();
  initSvcHashFocus();
  initQuoteHashNav();
}

function initDeferred() {
  setupSocialProof();
  setupStatCounters();
  setupMapFacades();
}

function scheduleIdle(fn, timeout) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn, { timeout });
    return;
  }
  window.setTimeout(fn, 1);
}

document.addEventListener('DOMContentLoaded', () => {
  initCritical();
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  scheduleIdle(initDeferred, isMobile ? 1800 : 600);
});

/* Csak kattintásra — görgetéskor a Google Maps szétveri a mobil PageSpeed TBT-t */
function setupMapFacades() {
  document.querySelectorAll('[data-map-facade]').forEach((host) => {
    const src = host.getAttribute('data-map-src');
    const btn = host.querySelector('[data-map-load]');
    if (!src || !btn || host.querySelector('iframe')) return;

    btn.addEventListener(
      'click',
      () => {
        if (host.querySelector('iframe')) return;
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.title = host.getAttribute('data-map-title') || 'Térkép';
        iframe.width = '600';
        iframe.height = '450';
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        iframe.allowFullscreen = true;
        host.appendChild(iframe);
        host.classList.add('is-loaded');
      },
      { once: true }
    );
  });
}

function setupSocialProof() {
  const root = document.querySelector('[data-social-proof]');
  if (!root) return;

  const track = root.querySelector('.social-proof__track');
  const slides = track ? [...track.querySelectorAll('.social-proof__slide')] : [];
  if (!slides.length || !track) return;

  const section = root.closest('.social-proof');
  if (slides.length < 2) {
    section?.classList.add('social-proof--single');
    return;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intervalMs = 6000;
  let current = 0;
  let timer = null;
  let visible = false;
  let focused = false;
  const dotsHost = root.closest('.social-proof')?.querySelector('.social-proof__dots');
  let dots = [];

  const setActiveDot = () => {
    if (!dotsHost || !dots.length) return;
    dots.forEach((btn, i) => {
      const isActive = i === current;
      btn.classList.toggle('social-proof__dot--active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
  };

  const goTo = (index) => {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translate3d(-${current * 100}%, 0, 0)`;
    setActiveDot();
  };

  const stopAutoplay = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  /* Csak akkor pörög, ha a szekció látszik és nincs benne fókusz */
  const syncAutoplay = () => {
    if (prefersReduced || !visible || focused || document.hidden) {
      stopAutoplay();
      return;
    }
    if (timer) return;
    timer = window.setInterval(() => goTo(current + 1), intervalMs);
  };

  const manualGo = (index) => {
    goTo(index);
    stopAutoplay();
    syncAutoplay();
  };

  if (dotsHost) {
    dotsHost.innerHTML = '';
    slides.forEach((_, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'social-proof__dot';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', `Vélemény ${idx + 1} / ${slides.length}`);
      btn.addEventListener('click', () => manualGo(idx));
      dotsHost.appendChild(btn);
      dots.push(btn);
    });
  }

  root.querySelector('.social-proof__nav--prev')?.addEventListener('click', () => manualGo(current - 1));
  root.querySelector('.social-proof__nav--next')?.addEventListener('click', () => manualGo(current + 1));

  root.addEventListener('focusin', () => {
    focused = true;
    syncAutoplay();
  });
  root.addEventListener('focusout', (e) => {
    if (root.contains(e.relatedTarget)) return;
    focused = false;
    syncAutoplay();
  });

  document.addEventListener('visibilitychange', syncAutoplay);

  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      syncAutoplay();
    },
    { threshold: 0.35 }
  ).observe(root);

  goTo(0);
  syncAutoplay();
}

function setupStatCounters() {
  const sections = [...document.querySelectorAll('.stats-row')];
  if (!sections.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const formatCount = (value, decimals) => {
    if (decimals > 0) {
      return value.toFixed(decimals).replace('.', ',');
    }
    return Math.round(value).toString();
  };

  sections.forEach((section) => {
    const counters = [...section.querySelectorAll('[data-count-target]')];
    if (!counters.length) return;

    const trigger = section.querySelector('.stats-row__grid') || section;

    const resetCounters = () => {
      counters.forEach((el) => {
        const suffix = el.dataset.countSuffix || '';
        el.textContent = `0${suffix}`;
      });
    };

    resetCounters();

    const animateCounter = (el) => {
      const target = parseFloat(el.dataset.countTarget);
      const suffix = el.dataset.countSuffix || '';
      const decimals = parseInt(el.dataset.countDecimals || '0', 10);

      if (prefersReduced || Number.isNaN(target)) {
        el.textContent = `${formatCount(target, decimals)}${suffix}`;
        return;
      }

      const duration = 1400;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        el.textContent = `${formatCount(target * eased, decimals)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    let played = false;

    const runCounters = () => {
      if (played) return;
      played = true;
      resetCounters();
      counters.forEach((el, index) => {
        window.setTimeout(() => animateCounter(el), index * 100);
      });
      observer.disconnect();
      window.removeEventListener('scroll', onScrollCheck);
    };

    /* Indul, ha a sor már ténylegesen látótérben van (kb. a képernyő alsó harmada fölött) */
    const isInStartZone = () => {
      const rect = trigger.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < vh * 0.62 && rect.bottom > vh * 0.05;
    };

    const onScrollCheck = () => {
      if (isInStartZone()) runCounters();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (played || !entry.isIntersecting) return;
        if (!isInStartZone()) return;
        runCounters();
      },
      { threshold: [0, 0.2, 0.5], rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(trigger);

    /* Biztonsági háló: ha az observer kimaradna, görgetésre ellenőrzünk */
    window.addEventListener('scroll', onScrollCheck, { passive: true });
    if (isInStartZone()) runCounters();
  });
}

/* Ürlap végpont — Google Apps Script webapp URL (doPost).
   Példa: 'https://script.google.com/macros/s/…/exec'
   Üresen: mailto fallback + visszajelzés. */
/* Ugyanaz a Webapp URL mindkettőhöz (Apps Script deploy …/exec). Üresen: mailto. */
const QUOTE_FORM_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyachlB1D8ALMP85R5QbmDcai8pmpo7xNumsvPqu8yS5zAXVB1GveLcgbR4xQzbGGMa/exec';
const CONTACT_FORM_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyachlB1D8ALMP85R5QbmDcai8pmpo7xNumsvPqu8yS5zAXVB1GveLcgbR4xQzbGGMa/exec';
/* Mailto fallback + hibák — Tiszta Házak Gmail */
const FORM_MAIL = 'tisztahazakbp@gmail.com';

function getFormStatusEl(form) {
  let el = form.querySelector('[data-form-status]');
  if (el) return el;
  el = document.createElement('p');
  el.className = 'quote-form__status';
  el.setAttribute('data-form-status');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.insertAdjacentElement('afterend', el);
  else form.appendChild(el);
  return el;
}

function setFormStatus(form, type, message) {
  const el = getFormStatusEl(form);
  el.className = `quote-form__status quote-form__status--${type}`;
  el.textContent = message;
}

function setFormBusy(form, busy) {
  const btn = form.querySelector('[type="submit"]');
  if (!btn) return;
  btn.disabled = busy;
  btn.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function formDataToObject(data) {
  const obj = {};
  data.forEach((value, key) => {
    obj[key] = String(value);
  });
  return obj;
}

/**
 * Google Apps Script: text/plain JSON elkerüli a CORS preflightet.
 * Formspree / más JSON API: application/json Accept.
 */
async function postFormEndpoint(endpoint, data) {
  const isGoogleScript = /script\.google\.com/i.test(endpoint);

  if (isGoogleScript) {
    /* no-cors: a választ nem olvassuk, de a doPost lefut, ha a deploy „Anyone” */
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(formDataToObject(data)),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    return { ok: true, opaque: true };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: data,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

function openMailtoFallback({ subject, body }) {
  const href = `mailto:${FORM_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

function setupQuoteForms() {
  document.querySelectorAll('[data-quote-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      /* Honeypot: robot kitölti → csendes kilépés, sikeresnek tűnik */
      if (String(data.get('_trap') || '').trim()) {
        form.reset();
        setFormStatus(form, 'success', 'Köszönjük! Ajánlatkérését megkaptuk — 24 órán belül jelentkezünk.');
        return;
      }
      const name = String(data.get('name') || '');
      const email = String(data.get('email') || '');
      const phone = String(data.get('phone') || '');
      const service = String(data.get('service') || '');
      const message = String(data.get('message') || '');
      const subject = `Árajánlatkérés — ${service}`;
      const body =
        `Név: ${name}\nE-mail: ${email}\nTelefon: ${phone}\nSzolgáltatás: ${service}\n\nMegjegyzés:\n${message || '—'}`;

      setFormBusy(form, true);
      setFormStatus(form, 'pending', 'Küldés folyamatban…');

      if (QUOTE_FORM_ENDPOINT) {
        try {
          await postFormEndpoint(QUOTE_FORM_ENDPOINT, data);
          form.reset();
          setFormStatus(
            form,
            'success',
            'Köszönjük! Ajánlatkérését elküldtük — 24 órán belül jelentkezünk.'
          );
        } catch (_) {
          setFormStatus(
            form,
            'error',
            `A küldés nem sikerült. Írjon nekünk: ${FORM_MAIL}, vagy próbálja újra.`
          );
        } finally {
          setFormBusy(form, false);
        }
        return;
      }

      /* Nincs endpoint: mailto + világos tájékoztatás */
      openMailtoFallback({ subject, body });
      setFormStatus(
        form,
        'info',
        `Ha megnyílt a levelezője, küldje el az üzenetet. Ha nem: írjon ide — ${FORM_MAIL}`
      );
      setFormBusy(form, false);
    });
  });
}

function setupContactForms() {
  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      if (String(data.get('_trap') || '').trim()) {
        form.reset();
        setFormStatus(form, 'success', 'Köszönjük! Üzenetét megkaptuk — hamarosan válaszolunk.');
        return;
      }
      const name = String(data.get('name') || '');
      const email = String(data.get('email') || '');
      const phone = String(data.get('phone') || '');
      const message = String(data.get('message') || '');
      const subject = `Kapcsolatfelvétel — ${name}`;
      const body =
        `Név: ${name}\nE-mail: ${email}\nTelefon: ${phone || '—'}\n\nÜzenet:\n${message}`;

      setFormBusy(form, true);
      setFormStatus(form, 'pending', 'Küldés folyamatban…');

      if (CONTACT_FORM_ENDPOINT) {
        try {
          await postFormEndpoint(CONTACT_FORM_ENDPOINT, data);
          form.reset();
          setFormStatus(
            form,
            'success',
            'Köszönjük! Üzenetét elküldtük — hamarosan válaszolunk.'
          );
        } catch (_) {
          setFormStatus(
            form,
            'error',
            `A küldés nem sikerült. Írjon nekünk: ${FORM_MAIL}, vagy hívjon minket.`
          );
        } finally {
          setFormBusy(form, false);
        }
        return;
      }

      openMailtoFallback({ subject, body });
      setFormStatus(
        form,
        'info',
        `Ha megnyílt a levelezője, küldje el az üzenetet. Ha nem: ${FORM_MAIL}`
      );
      setFormBusy(form, false);
    });
  });
}

function playReveal(el) {
  if (!el || el.classList.contains('reveal-in')) return;
  const delay = parseInt(el.dataset.revealDelay || '0', 10);
  if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
  else el.style.removeProperty('--reveal-delay');
  /* Dupla rAF: legyen idő a opacity:0 kezdőállapotra, különben nincs átmenet */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('reveal-in'));
  });
}

function initHeroReveals() {
  /* Hero tartalom CSS-ben azonnal látható — csak jelöljük késznek a header pinhez */
  document.querySelectorAll('.hero [data-reveal]').forEach((el) => {
    el.classList.add('reveal-in');
  });
}

/* Aloldal / first-fold: saját 240ms lépésritmus */
function initSubIntroReveals() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const aboveFold = document.querySelectorAll(
    [
      '.sub-intro [data-reveal]',
      '.svc-toc[data-reveal]',
      '.svc-cards__head [data-reveal]',
      '.price-sheets__head [data-reveal]',
      '.price-sheets .svc-toc[data-reveal]',
      '.contact-flow__intro [data-reveal]',
      '.page-hero [data-reveal]',
    ].join(', ')
  );
  aboveFold.forEach((el) => {
    if (prefersReduced) {
      el.classList.add('reveal-in');
      return;
    }
    playReveal(el);
  });
}

/** Régi 200-as késleltetés → saját 240ms skála (a 240-as értékeket nem bántja) */
function toSiteDelay(ms) {
  const n = parseInt(ms, 10) || 0;
  if (n <= 0) return '0';
  if (n % 240 === 0) return String(n);
  const step = Math.max(1, Math.round(n / 200));
  return String(step * 240);
}

function setupSplitSectionReveals() {
  /* Saját ritmus: 240 / 480 / 720 ms */
  const stagger = (selector, type, start = 240, step = 240, force = false) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      if (el.closest('.hero')) return;
      if (el.hasAttribute('data-reveal-axis')) return;
      if (!force && el.hasAttribute('data-reveal')) return;
      el.setAttribute('data-reveal', type);
      el.dataset.revealDelay = String(start + i * step);
    });
  };

  /* Hero irányok (up / left / down) INTENTEK — soha ne flatteneld fade-re */
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.closest('.hero') || el.hasAttribute('data-reveal-axis')) return;
    if (el.classList.contains('intro-band__cta')) return;
    el.setAttribute('data-reveal', 'fade');
  });

  stagger('.faq-list .faq-item', 'fade', 0, 60, true);
  stagger('.contact-block__list .contact-block__item', 'fade', 240, 240, true);
  stagger('.why-split__feature', 'fade', 480, 120, true);
  stagger('.quote-form__checks li', 'fade', 240, 240, true);
  stagger('.service-detail-card', 'fade', 240, 240, true);
  stagger('.about-pillars__item', 'fade', 240, 240, true);
  stagger('.testimonial', 'fade', 240, 240, true);
  stagger('.page-hero__inner > *', 'fade', 240, 240, true);
  stagger('.detail-cta', 'fade', 240, 240, true);
  stagger('.cta', 'fade', 240, 240, true);
  stagger('.sub-cta__inner', 'fade', 240, 240, true);
  stagger('.intro-pills .btn', 'fade', 960, 240, true);
  stagger('.services-more__actions .btn', 'fade', 720, 240, true);

  /* Szolgáltatás-kártyák: egy egység, 3 oszlop = 240/480/720 */
  document.querySelectorAll('.svc-cards__grid .svc-card').forEach((card, i) => {
    card.querySelectorAll('[data-reveal]').forEach((child) => {
      child.removeAttribute('data-reveal');
      child.removeAttribute('data-reveal-delay');
      child.style.removeProperty('--reveal-delay');
      child.classList.remove('reveal-in');
    });
    card.setAttribute('data-reveal', 'fade');
    card.dataset.revealDelay = String(240 + (i % 3) * 240);
  });

  document.querySelectorAll('#services .service-feature').forEach((card, i) => {
    card.setAttribute('data-reveal', 'fade');
    card.dataset.revealDelay = String(240 + (i % 3) * 240);
  });

  document.querySelectorAll('.prices-page .svc-block').forEach((block) => {
    const copy = block.querySelector('.svc-block__copy');
    const prices = block.querySelector('.svc-block__prices');
    if (copy) {
      copy.setAttribute('data-reveal', 'fade');
      copy.dataset.revealDelay = '240';
    }
    if (prices) {
      prices.setAttribute('data-reveal', 'fade');
      prices.dataset.revealDelay = '480';
    }
  });

  const fadePair = (leftSel, rightSel) => {
    const left = document.querySelector(leftSel);
    const right = document.querySelector(rightSel);
    if (!left || !right) return;
    [left, right].forEach((el, i) => {
      el.setAttribute('data-reveal', 'fade');
      el.removeAttribute('data-reveal-axis');
      el.dataset.revealDelay = String(240 + i * 240);
      el.querySelectorAll('[data-reveal]').forEach((child) => {
        if (child === el) return;
        if (child.matches('.faq-item, .contact-block__item, li')) return;
        child.removeAttribute('data-reveal');
        child.removeAttribute('data-reveal-delay');
        child.removeAttribute('data-reveal-axis');
        child.style.removeProperty('--reveal-delay');
        child.classList.remove('reveal-in');
      });
    });
  };

  fadePair('.content-page__body', '.content-page__figure');
  fadePair('.contact-block__map', '.contact-block__info');
  fadePair('.faq-split__figure', '.faq-split__card');

  /* HTML-ben maradt 200-as skála → saját 240-as */
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (!el.dataset.revealDelay) return;
    el.dataset.revealDelay = toSiteDelay(el.dataset.revealDelay);
  });
}

/* Why-split: fotó + panel fade együtt; utána szöveg — csak ha tényleg a viewportban van */
function initWhySplitReveal() {
  const roots = [...document.querySelectorAll('[data-why-split]')];
  if (!roots.length) return;

  /* Indítás: az elem teteje a viewport alsó ~22%-án belülre ért */
  const playOpts = { threshold: 0.18, rootMargin: '0px 0px -22% 0px' };
  const playOptsMobile = { threshold: 0.2, rootMargin: '0px 0px -18% 0px' };

  roots.forEach((root) => {
    const media = root.querySelector('[data-why-reveal="from-left"]');
    const panel = root.querySelector('[data-why-reveal="from-right"]');
    const parts = [...root.querySelectorAll('[data-why-reveal]')];
    const lines = [...root.querySelectorAll('[data-reveal]')];
    const features = [...root.querySelectorAll('.why-split__feature')];
    const textLines = lines.filter((el) => !features.includes(el));
    if (!parts.length) return;

    const showSides = (els) => {
      els.forEach((el) => el.classList.add('is-in'));
    };

    const showLines = () => {
      lines.forEach(playReveal);
    };

    const showAll = () => {
      showSides(parts);
      showLines();
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showAll();
      return;
    }

    if (!('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    const observeOnce = (target, onShow, options) => {
      if (!target) {
        onShow();
        return;
      }
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        /* Extra őr: ne induljon, ha még a képernyő alja alatt van */
        if (entry.boundingClientRect.top > window.innerHeight * 0.88) return;
        onShow();
        io.disconnect();
      }, options);
      io.observe(target);
    };

    if (!window.matchMedia('(max-width:900px)').matches) {
      observeOnce(root, showAll, playOpts);
      return;
    }

    observeOnce(media, () => showSides([media]), playOptsMobile);
    observeOnce(panel, () => {
      showSides([panel]);
      if (features.length) textLines.forEach(playReveal);
      else showLines();
    }, playOptsMobile);

    if (!features.length) return;

    /*
     * Mobilon a panel jóval hosszabb a képernyőnél, ezért a pontokat nem
     * lehet a panellel együtt indítani: mire a felhasználó leér, már régen
     * lefutottak. Minden pont akkor jelenik meg, amikor a képernyőre ér.
     */
    const featureObserver = new IntersectionObserver((entries) => {
      let batch = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.boundingClientRect.top > window.innerHeight * 0.88) return;
        entry.target.dataset.revealDelay = String(batch * 120);
        batch += 1;
        playReveal(entry.target);
        featureObserver.unobserve(entry.target);
      });
    }, playOptsMobile);

    features.forEach((el) => featureObserver.observe(el));
  });
}

function setupFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const summary = item.querySelector('summary');
    if (!summary) return;

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      const willOpen = !item.open;
      const list = item.closest('.faq-list');

      if (list && willOpen) {
        list.querySelectorAll('.faq-item[open]').forEach((openItem) => {
          if (openItem !== item) openItem.open = false;
        });
      }

      item.open = willOpen;
    });
  });
}

function revealElement(el) {
  playReveal(el);
}

/** Csak ha az elem már érdemben a képernyőn van (ne a viewport alatt „előre”) */
function isReadyToReveal(el) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh * 0.72 && rect.bottom > vh * 0.18;
}

/**
 * Intro CTA: asztalin jól csúszik; mobilnál a szöveg IO-ja túl korai,
 * a saját -24%-os küszöb pedig túl késői / beragadhat.
 * Középút: saját, lazább observer + rövid késleltetés + failsafe.
 */
function initIntroBandCtaReveal(prefersReduced) {
  const cta = document.querySelector('.intro-band__cta');
  if (!cta) return;

  if (prefersReduced) {
    cta.classList.add('reveal-in');
    return;
  }

  if (!('IntersectionObserver' in window)) {
    playReveal(cta);
    return;
  }

  let done = false;
  const finish = () => {
    if (done || cta.classList.contains('reveal-in')) return;
    done = true;
    playReveal(cta);
    observer.unobserve(cta);
    bandObserver.unobserve(band);
  };

  const band = cta.closest('.intro-band') || cta;
  let bandVisibleSince = 0;
  let failsafeTimer = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        /* Lazább, mint a globális 0.88 — mobilnál a gomb gyakran lentebb ül */
        if (entry.boundingClientRect.top > window.innerHeight * 0.94) return;
        finish();
      });
    },
    { threshold: [0, 0.1, 0.25], rootMargin: '0px 0px -10% 0px' }
  );

  const bandObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          bandVisibleSince = 0;
          window.clearTimeout(failsafeTimer);
          failsafeTimer = 0;
          return;
        }
        if (!bandVisibleSince) bandVisibleSince = Date.now();
        /* Ha a szekció már ~1.4s-e látszik, a gomb ne maradjon rejtve */
        window.clearTimeout(failsafeTimer);
        failsafeTimer = window.setTimeout(() => {
          if (!cta.classList.contains('reveal-in')) finish();
        }, 1400);
      });
    },
    { threshold: [0.35, 0.5], rootMargin: '0px 0px -6% 0px' }
  );

  const ctaRect = cta.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  if (ctaRect.top < vh * 0.9 && ctaRect.bottom > vh * 0.12) {
    finish();
    return;
  }

  observer.observe(cta);
  bandObserver.observe(band);
}

function initReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skipClosest = (el) =>
    el.closest('.hero') ||
    el.closest('[data-why-split]') ||
    el.closest('.sub-intro') ||
    el.closest('.svc-toc') ||
    el.closest('.svc-cards__head') ||
    el.closest('.price-sheets__head') ||
    el.closest('.price-sheets .svc-toc') ||
    el.closest('.contact-flow__intro') ||
    el.closest('.page-hero');

  const scrollReveals = [...document.querySelectorAll('[data-reveal]')].filter(
    (el) => !skipClosest(el) && !el.classList.contains('intro-band__cta')
  );

  initIntroBandCtaReveal(prefersReduced);

  if (!scrollReveals.length) return;

  if (prefersReduced) {
    scrollReveals.forEach((el) => el.classList.add('reveal-in'));
    return;
  }

  if (!('IntersectionObserver' in window)) {
    scrollReveals.forEach(revealElement);
    return;
  }

  /*
   * rootMargin alsó -24%: ne induljon, amíg az elem csak „belóg” alulról.
   * Így görgetés közben még látszik a fade, mire középre ér.
   */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.boundingClientRect.top > window.innerHeight * 0.88) return;
        revealElement(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: [0, 0.15, 0.25], rootMargin: '0px 0px -24% 0px' }
  );

  scrollReveals.forEach((el) => {
    if (isReadyToReveal(el)) {
      revealElement(el);
      return;
    }
    observer.observe(el);
  });

  /* Csak beragadt, LÁTHATÓ elemek — ne játszd le előre az egész oldalt */
  window.setTimeout(() => {
    scrollReveals.forEach((el) => {
      if (!el.classList.contains('reveal-in') && isReadyToReveal(el)) {
        revealElement(el);
      }
    });
  }, 12000);
}

/** Szolgáltatás #hash: halk, ideiglenes jelzés — kattintással / idővel elengedhető */
function initSvcHashFocus() {
  const grid = document.querySelector('.svc-cards__grid');
  if (!grid) return;

  let clearTimer = 0;
  let focused = null;

  const getHashCard = () => {
    const id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return null;
    const el = document.getElementById(id);
    return el && el.classList.contains('svc-card') ? el : null;
  };

  const clearFocus = (stripHash) => {
    window.clearTimeout(clearTimer);
    clearTimer = 0;
    grid.querySelectorAll('.svc-card--focus').forEach((el) => el.classList.remove('svc-card--focus'));
    focused = null;
    if (!stripHash || !location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (el && el.classList.contains('svc-card')) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  };

  const focusCard = (smooth) => {
    const card = getHashCard();
    if (!card) return;

    grid.querySelectorAll('.svc-card--focus').forEach((el) => {
      if (el !== card) el.classList.remove('svc-card--focus');
    });

    if (card.hasAttribute('data-reveal') && !card.classList.contains('reveal-in')) {
      card.style.setProperty('--reveal-delay', '0ms');
      card.classList.add('reveal-in');
    }

    card.classList.remove('svc-card--focus');
    void card.offsetWidth;
    card.classList.add('svc-card--focus');
    focused = card;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({
      behavior: reduceMotion || !smooth ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => clearFocus(true), 4500);
  };

  /* Másik kártyára / üres területre kattintva elengedjük a kiemelést */
  grid.addEventListener('click', (e) => {
    if (!focused) return;
    const card = e.target.closest('.svc-card');
    if (card && card === focused) return;
    clearFocus(true);
  });

  if (getHashCard()) {
    window.setTimeout(() => focusCard(false), 100);
  }

  window.addEventListener('hashchange', () => {
    if (getHashCard()) focusCard(true);
    else clearFocus(false);
  });
}

/**
 * #quote ugrás: a content-visibility:auto a közbenső szekciókat ~480px-re becsüli,
 * ezért a böngésző native hash-scrollje a FAQ-nál áll meg. Előbb kinyitjuk a layoutot,
 * megjelenítjük a form szekciót, majd pontosan a fejléc alá görgetünk.
 */
function initQuoteHashNav() {
  const section = document.getElementById('quote');
  if (!section) return;

  const headerOffset = () => {
    const header = document.querySelector('.site-header');
    return (header?.offsetHeight || 72) + 12;
  };

  const unlockSectionHeights = () => {
    document.querySelectorAll('main > section:not(.hero)').forEach((el) => {
      el.style.contentVisibility = 'visible';
    });
  };

  const revealQuote = () => {
    section.querySelectorAll('[data-reveal]').forEach((el) => {
      el.style.setProperty('--reveal-delay', '0ms');
      el.classList.add('reveal-in');
    });
  };

  const scrollToQuote = (behavior) => {
    unlockSectionHeights();
    revealQuote();

    const run = () => {
      const top = Math.max(
        0,
        section.getBoundingClientRect().top + window.scrollY - headerOffset()
      );
      window.scrollTo({ top, behavior });
    };

    requestAnimationFrame(() => requestAnimationFrame(run));
  };

  const isSamePageQuoteLink = (anchor) => {
    const href = anchor.getAttribute('href');
    if (!href) return false;
    if (href === '#quote') return true;
    if (!href.includes('#quote')) return false;
    try {
      const url = new URL(href, location.href);
      return url.hash === '#quote' && url.pathname === location.pathname;
    } catch {
      return false;
    }
  };

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href="#quote"], a[href*="#quote"]');
    if (!anchor || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isSamePageQuoteLink(anchor)) return;

    e.preventDefault();
    if (location.hash !== '#quote') {
      history.pushState(null, '', '#quote');
    }
    scrollToQuote('smooth');
  });

  if (location.hash === '#quote') {
    scrollToQuote('auto');
    window.setTimeout(() => scrollToQuote('auto'), 120);
  }

  window.addEventListener('hashchange', () => {
    if (location.hash === '#quote') scrollToQuote('smooth');
  });
}
