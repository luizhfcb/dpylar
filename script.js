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
    img: 'assets/team-rosina.jpg',
    full: 'assets/team-rosina.jpg',
    name: 'Rosina Helena',
    role: 'Fundadora · Depilação & Design de Sobrancelhas',
    tag: 'Fundadora',
    founder: true,
    desc: 'Profissional da beleza há mais de 10 anos, especialista em depilação e design de sobrancelhas. Fundou a D\'Pylar em 2016 com uma missão clara: oferecer atendimento humanizado, com excelência e cuidado em cada detalhe.'
  },
  {
    img: 'assets/team-luana.jpg',
    full: 'assets/team-luana.jpg',
    name: 'Luana Silva',
    role: 'Depilação & Sobrancelhas',
    tag: 'Especialista',
    desc: 'Mais de 10 anos de experiência, com trabalho baseado em técnica, cuidado e respeito — sempre priorizando conforto e resultado.'
  },
  {
    img: 'assets/team-ednalva.jpg',
    full: 'assets/team-ednalva.jpg',
    name: 'Ednalva Santos',
    role: 'Esteticista',
    tag: 'Esteticista',
    desc: 'Atua na área da beleza com dedicação ao cuidado da pele, bem-estar e autoestima, com tratamentos personalizados.'
  },
  {
    img: 'assets/team-jheniffer.jpg',
    full: 'assets/team-jheniffer.jpg',
    name: 'Jheniffer Silva',
    role: 'Sobrancelhas & Brow Lamination',
    tag: 'Especialista',
    desc: 'Foco em valorizar o olhar respeitando a identidade de cada cliente, com resultados naturais e harmoniosos.'
  },
  {
    img: 'assets/team-bruna.jpg',
    full: 'assets/team-bruna.jpg',
    name: 'Bruna Célia',
    role: 'Depilação',
    tag: 'Especialista',
    desc: 'Trabalho pautado em técnica, higiene, conforto e atendimento humanizado, respeitando a individualidade de cada pessoa.'
  },
  {
    img: 'assets/team-rayssa.jpg',
    full: 'assets/team-rayssa.jpg',
    name: 'Rayssa dos Santos',
    role: 'Cílios & Sobrancelhas',
    tag: 'Especialista',
    desc: 'Compromisso em realçar a beleza natural de cada cliente com técnica, cuidado e excelência no atendimento.'
  },
  {
    img: 'assets/team-renata.jpg',
    full: 'assets/team-renata.jpg',
    name: 'Renata',
    role: 'Recepcionista',
    tag: 'Atendimento',
    desc: 'Responsável pelo acolhimento e atendimento de cada cliente com simpatia, organização e profissionalismo.'
  },
  {
    img: 'assets/team-jaciana.jpg',
    full: 'assets/team-jaciana.jpg',
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

  function fill() {
    const p = roster[idx];
    if (img) {
      img.src = p.img;
      img.alt = p.name;
    }
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
    dotEls.forEach((d, i) => {
      const on = i === idx;
      d.classList.toggle('active', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function go(i) {
    idx = (i + n) % n;
    if (reduceMotion || !main) {
      fill();
      return;
    }
    main.classList.add('is-swapping');
    setTimeout(() => {
      fill();
      main.classList.remove('is-swapping');
    }, 180);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => go(idx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(idx + 1));

  let touchX = 0;
  const stage = featured.querySelector('.tf-photo-row') || featured;
  stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) go(idx + (diff > 0 ? 1 : -1));
  }, { passive: true });

  fill();

  // Lightbox / expandir foto
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const photoBtn = document.getElementById('tfPhotoBtn') || document.querySelector('.tf-photo');
  if (lightbox && lightboxImg && photoBtn) {
    let lastFocus = null;
    const paint = () => {
      const p = roster[idx];
      lightboxImg.src = p.full || p.img;
      lightboxImg.alt = p.name;
      if (caption) caption.textContent = p.name + ' · ' + p.role;
    };
    const open = () => {
      lastFocus = document.activeElement;
      paint();
      lightbox.hidden = false;
      lightbox.classList.add('open');
      document.body.classList.add('lightbox-open');
      const cb = document.getElementById('lightboxClose');
      if (cb) cb.focus();
    };
    const close = () => {
      lightbox.classList.remove('open');
      lightbox.hidden = true;
      document.body.classList.remove('lightbox-open');
      lightboxImg.src = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    const step = (dir) => {
      go(idx + dir);
      paint();
    };

    photoBtn.addEventListener('click', open);
    const cb = document.getElementById('lightboxClose');
    const lp = document.getElementById('lightboxPrev');
    const ln = document.getElementById('lightboxNext');
    if (cb) cb.addEventListener('click', close);
    if (lp) lp.addEventListener('click', () => step(-1));
    if (ln) ln.addEventListener('click', () => step(1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-inner')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
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
  const summaryEl = document.getElementById('srvModalSummary');
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
    if (summaryEl) summaryEl.textContent = summary;
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
