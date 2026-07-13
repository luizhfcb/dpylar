// Mobile menu
function closeMobile() { document.getElementById('mobileMenu').classList.remove('open'); }

// Navbar scroll
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});

// Theme toggle
const THEME_KEY = 'dpylar-theme';
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = root.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Load saved theme
(function () {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }
})();

// Scroll reveal
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.srv-card,.perk,.loc-card,.info-item,.team-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  obs.observe(el);
});

// Team Carousel (só roda se a página tiver o carrossel de equipe)
const track = document.getElementById('teamTrack');
if (track) {
  let teamPos = 0;
  const cards = track.querySelectorAll('.team-card');
  const dotsContainer = document.getElementById('teamDots');

  const getCardWidth = () => {
    const card = cards[0];
    const style = getComputedStyle(track);
    const gap = parseInt(style.gap) || 24;
    return card.offsetWidth + gap;
  };
  const getVisibleCount = () => {
    const container = track.parentElement;
    return Math.floor(container.offsetWidth / getCardWidth()) || 1;
  };
  const getMaxPos = () => Math.max(0, cards.length - getVisibleCount());
  const buildDots = () => {
    const max = getMaxPos();
    dotsContainer.innerHTML = '';
    for (let i = 0; i <= max; i++) {
      const dot = document.createElement('button');
      dot.className = 'team-dot' + (i === teamPos ? ' active' : '');
      dot.onclick = () => { teamPos = i; updateCarousel(); };
      dotsContainer.appendChild(dot);
    }
  };
  const updateCarousel = () => {
    const max = getMaxPos();
    if (teamPos < 0) teamPos = max;
    if (teamPos > max) teamPos = 0;
    track.style.transform = `translateX(-${teamPos * getCardWidth()}px)`;
    buildDots();
  };
  window.slideTeam = (dir) => { teamPos += dir; updateCarousel(); };

  buildDots();
  updateCarousel();
  window.addEventListener('resize', () => { teamPos = Math.min(teamPos, getMaxPos()); updateCarousel(); });

  // Touch swipe for carousel
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) window.slideTeam(diff > 0 ? 1 : -1);
  }, { passive: true });
}
// Lightbox para as fotos da equipe
(function () {
  const imgs = Array.from(document.querySelectorAll('.team-card-img'));
  if (!imgs.length) return;

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  let current = 0;

  function openLightbox(i) {
    current = i;
    lightboxImg.src = imgs[current].src;
    lightboxImg.alt = imgs[current].alt;
    lightbox.classList.add('open');
  }
  function closeLightbox() { lightbox.classList.remove('open'); }
  function nextLightbox(dir) {
    current = (current + dir + imgs.length) % imgs.length;
    lightboxImg.src = imgs[current].src;
    lightboxImg.alt = imgs[current].alt;
  }

  imgs.forEach((img, i) => img.addEventListener('click', () => openLightbox(i)));
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => nextLightbox(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => nextLightbox(1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextLightbox(1);
    if (e.key === 'ArrowLeft') nextLightbox(-1);
  });
})();