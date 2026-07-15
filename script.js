// Mark JS available for progressive enhancement
document.documentElement.classList.add('js-ready');

// Mobile menu
function setHamburgerExpanded(open) {
  const burger = document.querySelector('.hamburger');
  if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function openMobile() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  menu.classList.add('open');
  menu.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setHamburgerExpanded(true);
  const closeBtn = menu.querySelector('.close-btn');
  if (closeBtn) closeBtn.focus();
}

// Fecha ao clicar no fundo (fora do sheet)
document.addEventListener('click', (e) => {
  const menu = document.getElementById('mobileMenu');
  if (!menu || !menu.classList.contains('open')) return;
  if (e.target === menu) closeMobile();
}, true);

function closeMobile() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  const wasOpen = menu.classList.contains('open');
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  setHamburgerExpanded(false);
  const burger = document.querySelector('.hamburger[aria-controls=mobileMenu]');
  if (wasOpen && burger) burger.focus();
}

function handleMobileMenuKeydown(event) {
  if (event.key === 'Escape') {
    closeMobile();
    return;
  }
  if (event.key !== 'Tab') return;

  const menu = document.getElementById('mobileMenu');
  if (!menu || !menu.classList.contains('open')) return;

  const focusables = Array.from(menu.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), '
    + 'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => {
    if (element.hidden || element.getAttribute?.('aria-hidden') === 'true') return false;
    return typeof element.getClientRects !== 'function' || element.getClientRects().length > 0;
  });
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
}

// Navbar scroll
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// Theme: default light always. Dark only if user explicitly chose it.
const THEME_KEY = 'dpylar-theme';
const root = document.documentElement;

function applyTheme(theme, persist) {
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
    theme = 'light';
  }
  if (persist) localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark', true);
}

// Theme: follow OS preference until the user explicitly toggles.
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved, false);
    return;
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  applyTheme(mq.matches ? 'dark' : 'light', false);
  const onChange = (e) => {
    if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light', false);
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
})();

// Scroll reveal — progressive: content visible without JS
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }
  const targets = document.querySelectorAll(
    '.reveal, .srv-card, .perk, .loc-card, .info-item, .team-card, .review-card, .trust-item, .proof-card'
  );
  if (!targets.length || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }
  targets.forEach(el => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
  targets.forEach(el => obs.observe(el));
})();

// Contador animado (trust strip)
(function () {
  const els = document.querySelectorAll('[data-counter]');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const target = parseInt(el.dataset.target, 10) || 0;
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dur = 900;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
})();

// ══ EQUIPE — carrossel no lugar do retrato (sempre começa com Rosina) ══
const TEAM = [
  {
    // img = corte limpo no carrossel | full = arte completa com balão de texto
    img: 'assets/team-rosina.jpg',
    full: 'assets/img2.jpg',
    name: 'Rosina Helena',
    role: 'Fundadora · Depilação & Design de Sobrancelhas',
    tag: 'Fundadora',
    founder: true,
    desc: 'Profissional da beleza há mais de 10 anos, especialista em depilação e design de sobrancelhas. Fundou a D\'Pylar em 2016 com uma missão clara: oferecer atendimento humanizado, com excelência e cuidado em cada detalhe.'
  },
  {
    img: 'assets/team-luana.jpg',
    full: 'assets/img3.jpg',
    name: 'Luana Silva',
    role: 'Depilação & Sobrancelhas',
    tag: 'Especialista',
    desc: 'Mais de 10 anos de experiência, com trabalho baseado em técnica, cuidado e respeito — sempre priorizando conforto e resultado.'
  },
  {
    img: 'assets/team-ednalva.jpg',
    full: 'assets/img1.jpg',
    name: 'Ednalva Santos',
    role: 'Esteticista',
    tag: 'Esteticista',
    desc: 'Atua na área da beleza com dedicação ao cuidado da pele, bem-estar e autoestima, com tratamentos personalizados.'
  },
  {
    img: 'assets/team-jheniffer.jpg',
    full: 'assets/img9.jpg',
    name: 'Jheniffer Silva',
    role: 'Sobrancelhas & Brow Lamination',
    tag: 'Especialista',
    desc: 'Foco em valorizar o olhar respeitando a identidade de cada cliente, com resultados naturais e harmoniosos.'
  },
  {
    img: 'assets/team-bruna.jpg',
    full: 'assets/img6.jpg',
    name: 'Bruna Célia',
    role: 'Depilação',
    tag: 'Especialista',
    desc: 'Trabalho pautado em técnica, higiene, conforto e atendimento humanizado, respeitando a individualidade de cada pessoa.'
  },
  {
    img: 'assets/team-rayssa.jpg',
    full: 'assets/img7.jpg',
    name: 'Rayssa dos Santos',
    role: 'Cílios & Sobrancelhas',
    tag: 'Especialista',
    desc: 'Compromisso em realçar a beleza natural de cada cliente com técnica, cuidado e excelência no atendimento.'
  },
  {
    img: 'assets/team-renata.jpg',
    full: 'assets/img8.jpg',
    name: 'Renata',
    role: 'Recepcionista',
    tag: 'Atendimento',
    desc: 'Responsável pelo acolhimento e atendimento de cada cliente com simpatia, organização e profissionalismo.'
  },
  {
    img: 'assets/team-jaciana.jpg',
    full: 'assets/img10.jpg',
    name: 'Jaciana',
    role: 'Recepcionista',
    tag: 'Atendimento',
    desc: 'Recebe cada cliente com carinho, atenção e respeito, para uma experiência mais leve e especial desde o primeiro contato.'
  }
];

const WA_BASE = 'https://wa.me/5583986697088?text=';

const featured = document.getElementById('teamFeatured');
if (featured) {
  // Sempre começa com Rosina (índice 0 do array TEAM)
  let idx = 0;
  const roster = TEAM;
  const n = roster.length;
  const main = document.getElementById('tfMain');
  const img = document.getElementById('tfImg');
  const tag = document.getElementById('tfTag');
  const name = document.getElementById('tfName');
  const role = document.getElementById('tfRole');
  const desc = document.getElementById('tfDesc');
  const cta = document.getElementById('tfCta');
  const badge = document.getElementById('tfBadge');
  const dots = document.getElementById('tfDots');
  const prevBtn = document.getElementById('tfPrev');
  const nextBtn = document.getElementById('tfNext');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (dots) {
    dots.innerHTML = '';
  }
  const dotEls = roster.map((p, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'tf-dot';
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', 'Ver ' + p.name);
    d.addEventListener('click', () => go(i));
    if (dots) dots.appendChild(d);
    return d;
  });

  // Lightbox elements (antes de fill/go)
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxPanel = document.getElementById('lightboxPanel');
  const lbTag = document.getElementById('lightboxTag');
  const lbName = document.getElementById('lightboxName');
  const lbRole = document.getElementById('lightboxRole');
  const lbDesc = document.getElementById('lightboxDesc');
  const lbCta = document.getElementById('lightboxCta');
  const photoBtn = document.getElementById('tfPhotoBtn') || document.querySelector('.tf-photo');
  const info = document.getElementById('tfInfo');

  function applyPersonToLightbox(p, animate) {
    if (!lightboxImg) return;
    const write = () => {
      // full = arte com balão de texto; fallback para o retrato limpo
      lightboxImg.src = p.full || p.img;
      lightboxImg.alt = p.name;
      if (lbTag) lbTag.textContent = p.tag || '';
      if (lbName) lbName.textContent = p.name || '';
      if (lbRole) lbRole.textContent = p.role || '';
      if (lbDesc) lbDesc.textContent = p.desc || '';
      if (lbCta) {
        lbCta.href = WA_BASE + encodeURIComponent('Olá! Quero agendar com ' + p.name);
        lbCta.textContent = 'Agendar com ' + (p.name.split(' ')[0] || p.name);
        lbCta.style.display = '';
      }
    };
    if (animate && lightboxPanel && !reduceMotion) {
      lightboxPanel.classList.remove('is-entering');
      lightboxPanel.classList.add('is-swapping');
      setTimeout(() => {
        write();
        requestAnimationFrame(() => {
          lightboxPanel.classList.remove('is-swapping');
          lightboxPanel.classList.add('is-entering');
        });
      }, 180);
    } else {
      write();
      if (lightboxPanel) {
        lightboxPanel.classList.remove('is-swapping');
        lightboxPanel.classList.add('is-entering');
      }
    }
  }

  const SLIDE_MS = 420;
  const TEXT_MS = 220;
  let animating = false;
  let pending = null; // { i, dir }
  const imgNext = document.getElementById('tfImgNext');
  let activeImg = img;
  let idleImg = imgNext;

  function applyMeta(p) {
    if (tag) tag.textContent = p.tag;
    if (name) name.textContent = p.name;
    if (role) role.textContent = p.role;
    if (desc) desc.textContent = p.desc;
    if (cta) {
      cta.href = WA_BASE + encodeURIComponent('Olá! Quero agendar com ' + p.name);
      cta.textContent = 'Agendar com ' + p.name.split(' ')[0];
    }
    if (badge) {
      if (p.founder) badge.removeAttribute('hidden');
      else badge.setAttribute('hidden', '');
    }
    if (lightbox && lightbox.classList.contains('open')) {
      applyPersonToLightbox(p, true);
    }
    dotEls.forEach((d, i) => {
      const on = i === idx;
      d.classList.toggle('active', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function fill() {
    const p = roster[idx];
    if (activeImg) {
      activeImg.src = p.img;
      activeImg.alt = p.name;
      activeImg.className = 'team-portrait is-active';
    }
    if (idleImg) {
      idleImg.removeAttribute('alt');
      idleImg.setAttribute('aria-hidden', 'true');
      idleImg.className = 'team-portrait';
    }
    applyMeta(p);
  }

  function whenImageReady(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve();
        return;
      }
      const pre = new Image();
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      pre.onload = done;
      pre.onerror = done;
      pre.src = src;
      if (pre.complete) done();
    });
  }

  function clearSlideClasses(el) {
    if (!el) return;
    el.classList.remove(
      'is-active',
      'is-exit-next',
      'is-exit-prev',
      'is-enter-next',
      'is-enter-prev',
      'is-in'
    );
  }

  function finishSlide() {
    animating = false;
    if (pending) {
      const job = pending;
      pending = null;
      go(job.i, job.dir);
    }
  }

  function slideTo(nextIdx, dir) {
    const p = roster[nextIdx];
    if (!activeImg || !idleImg || reduceMotion) {
      idx = nextIdx;
      fill();
      finishSlide();
      return;
    }

    animating = true;
    idx = nextIdx;

    if (info) info.classList.add('is-swapping');
    window.setTimeout(() => {
      applyMeta(p);
      if (info) info.classList.remove('is-swapping');
    }, TEXT_MS);

    whenImageReady(p.img).then(() => {
      // Camada de entrada posicionada fora da tela (sem transition)
      clearSlideClasses(idleImg);
      idleImg.src = p.img;
      idleImg.alt = p.name;
      idleImg.removeAttribute('aria-hidden');
      idleImg.classList.add(dir > 0 ? 'is-enter-next' : 'is-enter-prev');
      void idleImg.offsetWidth;

      // Atual sai e a nova entra no mesmo gesto
      activeImg.classList.remove('is-active');
      activeImg.classList.add(dir > 0 ? 'is-exit-next' : 'is-exit-prev');
      activeImg.setAttribute('aria-hidden', 'true');
      activeImg.removeAttribute('alt');
      idleImg.classList.add('is-in');

      window.setTimeout(() => {
        clearSlideClasses(activeImg);
        clearSlideClasses(idleImg);
        idleImg.classList.add('is-active');
        const tmp = activeImg;
        activeImg = idleImg;
        idleImg = tmp;
        finishSlide();
      }, SLIDE_MS);
    });
  }

  function resolveDir(from, to, forcedDir) {
    if (forcedDir === 1 || forcedDir === -1) return forcedDir;
    // menor caminho no loop do carrossel
    const forward = (to - from + n) % n;
    const backward = (from - to + n) % n;
    return forward <= backward ? 1 : -1;
  }

  function go(i, forcedDir) {
    const next = ((i % n) + n) % n;
    if (next === idx && !animating) return;

    const dir = resolveDir(idx, next, forcedDir);

    if (reduceMotion || !main || !imgNext) {
      idx = next;
      pending = null;
      animating = false;
      fill();
      return;
    }

    if (animating) {
      pending = { i: next, dir };
      return;
    }

    slideTo(next, dir);
  }

  // Pré-carrega retratos para o deslize não “travar”
  roster.forEach((p) => {
    if (!p.img) return;
    const pre = new Image();
    pre.src = p.img;
  });

  if (prevBtn) prevBtn.addEventListener('click', () => go(idx - 1, -1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(idx + 1, 1));

  let touchX = 0;
  const stage = featured.querySelector('.tf-photo-row') || featured;
  stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) go(idx + (diff > 0 ? 1 : -1), diff > 0 ? 1 : -1);
  }, { passive: true });

  fill();

  if (lightbox && lightboxImg && photoBtn) {
    let lastFocus = null;
    const open = () => {
      lastFocus = document.activeElement;
      const p = roster[idx];
      // arte completa com balão (full), para o painel não abrir vazio
      lightboxImg.src = p.full || p.img;
      lightboxImg.alt = p.name;
      if (lbTag) lbTag.textContent = p.tag || '';
      if (lbName) lbName.textContent = p.name || '';
      if (lbRole) lbRole.textContent = p.role || '';
      if (lbDesc) lbDesc.textContent = p.desc || '';
      if (lbCta) {
        lbCta.href = WA_BASE + encodeURIComponent('Olá! Quero agendar com ' + p.name);
        lbCta.textContent = 'Agendar com ' + (p.name.split(' ')[0] || p.name);
      }
      lightbox.removeAttribute('hidden');
      lightbox.hidden = false;
      if (lightboxPanel) {
        lightboxPanel.classList.remove('is-swapping');
        lightboxPanel.classList.add('is-entering');
      }
      requestAnimationFrame(() => {
        lightbox.classList.add('open');
      });
      document.body.classList.add('lightbox-open');
      const cb = document.getElementById('lightboxClose');
      if (cb) cb.focus();
    };
    const close = () => {
      lightbox.classList.remove('open');
      if (lightboxPanel) lightboxPanel.classList.remove('is-entering', 'is-swapping');
      lightbox.hidden = true;
      lightbox.setAttribute('hidden', '');
      document.body.classList.remove('lightbox-open');
      lightboxImg.src = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    photoBtn.addEventListener('click', open);
    const cb = document.getElementById('lightboxClose');
    const lp = document.getElementById('lightboxPrev');
    const ln = document.getElementById('lightboxNext');
    if (cb) cb.addEventListener('click', close);
    if (lp) lp.addEventListener('click', () => go(idx - 1));
    if (ln) ln.addEventListener('click', () => go(idx + 1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
    });
  }
}

// Lazy-load map when near viewport (or when local tab opens)
(function () {
  const mapEl = document.getElementById('dpylar-map');
  if (!mapEl) return;

  let mapInstance = null;

  window.initDpylarMap = function () {
    if (mapEl.dataset.ready) {
      if (mapInstance) setTimeout(() => mapInstance.invalidateSize(), 80);
      return;
    }
    if (typeof L === 'undefined') return;
    mapEl.dataset.ready = '1';
    const lat = -7.2382758, lng = -35.9235227;
    mapInstance = L.map(mapEl, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false
    }).setView([lat, lng], 16);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 19 }).addTo(mapInstance);
    const icon = L.icon({
      iconUrl: 'assets/icon-loc.png',
      iconSize: [40, 36],
      iconAnchor: [20, 32],
      className: 'icone-mapa-limpo'
    });
    const marker = L.marker([lat, lng], { icon: icon }).addTo(mapInstance);
    marker.on('click', function () {
      const endereco = "D'Pylar, Av. Plínio Lemos, 195 - Malvinas, Campina Grande - PB";
      window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(endereco), '_blank');
    });
    mapInstance.on('focus', function () { mapInstance.scrollWheelZoom.enable(); });
    mapInstance.on('blur', function () { mapInstance.scrollWheelZoom.disable(); });
    setTimeout(() => mapInstance.invalidateSize(), 100);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        window.initDpylarMap();
        io.disconnect();
      }
    }, { rootMargin: '200px' });
    io.observe(mapEl);
  } else {
    window.initDpylarMap();
  }
})();

document.addEventListener('keydown', handleMobileMenuKeydown);

// Serviços: cards quadrados → modal com detalhes
(function () {
  const cards = Array.from(document.querySelectorAll('[data-service]'));
  const modal = document.getElementById('srvModal');
  if (!cards.length || !modal) return;

  const imgEl = document.getElementById('srvModalImg');
  const titleEl = document.getElementById('srvModalTitle');
  const chipEl = document.getElementById('srvModalChip');
  const priceEl = document.getElementById('srvModalPrice');
  const summaryEl = document.getElementById('srvModalSummary');
  const pricesBlockEl = document.getElementById('srvModalPricesBlock');
  const pricesEl = document.getElementById('srvModalPrices');
  const factsEl = document.getElementById('srvModalFacts');
  const ctaEl = document.getElementById('srvModalCta');
  let lastFocus = null;

  function openService(card) {
    lastFocus = document.activeElement;
    const title = card.getAttribute('data-title') || '';
    const chip = card.getAttribute('data-chip') || '';
    const img = card.getAttribute('data-img') || '';
    const summary = card.getAttribute('data-summary') || '';
    const wa = card.getAttribute('data-wa') || '#';
    const cta = card.getAttribute('data-cta') || 'Agendar';
    let facts = [];
    try { facts = JSON.parse(card.getAttribute('data-facts') || '[]'); } catch (e) { facts = []; }

    if (imgEl) {
      imgEl.src = img;
      imgEl.alt = title;
    }
    if (titleEl) titleEl.textContent = title;
    if (chipEl) chipEl.textContent = chip;
    if (priceEl) {
      const price = (card.getAttribute('data-price') || '').trim();
      priceEl.textContent = price;
      priceEl.hidden = !price;
    }
    if (summaryEl) summaryEl.textContent = summary;
    if (pricesBlockEl && pricesEl) {
      let prices = [];
      try { prices = JSON.parse(card.getAttribute('data-prices') || '[]'); } catch (e) { prices = []; }
      pricesEl.innerHTML = '';
      prices.forEach((row) => {
        const li = document.createElement('li');
        const label = row[0] || '';
        const value = row[1] || '';
        if (!value) {
          // Linha sem valor = cabeçalho de grupo (ex.: Feminina / Masculina)
          li.className = 'srv-prices-group';
          li.textContent = label;
        } else {
          const name = document.createElement('span');
          name.className = 'srv-prices-name';
          name.textContent = label;
          const dots = document.createElement('span');
          dots.className = 'srv-prices-dots';
          dots.setAttribute('aria-hidden', 'true');
          const price = document.createElement('strong');
          price.textContent = value;
          li.appendChild(name);
          li.appendChild(dots);
          li.appendChild(price);
        }
        pricesEl.appendChild(li);
      });
      pricesBlockEl.hidden = !prices.length;
    }
    if (factsEl) {
      factsEl.innerHTML = '';
      facts.forEach((row) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = row[0] || '';
        li.appendChild(strong);
        li.appendChild(document.createTextNode(row[1] || ''));
        factsEl.appendChild(li);
      });
    }
    if (ctaEl) {
      ctaEl.href = wa;
      ctaEl.textContent = cta;
    }

    modal.hidden = false;
    modal.classList.add('open');
    document.body.classList.add('srv-modal-open');
    const closeBtn = modal.querySelector('.srv-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeService() {
    modal.classList.remove('open');
    modal.hidden = true;
    document.body.classList.remove('srv-modal-open');
    if (imgEl) imgEl.src = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  cards.forEach((card) => {
    card.addEventListener('click', () => openService(card));
  });

  modal.querySelectorAll('[data-close-srv]').forEach((el) => {
    el.addEventListener('click', closeService);
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeService();
  });

  // Deep-link: #cera, #cilios, etc.
  function openFromHash() {
    const id = (location.hash || '').replace('#', '');
    if (!id) return;
    const card = document.getElementById(id);
    if (card && card.hasAttribute('data-service')) openService(card);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();
