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

// Team Carousel
let teamPos = 0;
const track = document.getElementById('teamTrack');
const cards = track.querySelectorAll('.team-card');
const dotsContainer = document.getElementById('teamDots');

function getCardWidth() {
  const card = cards[0];
  const style = getComputedStyle(track);
  const gap = parseInt(style.gap) || 24;
  return card.offsetWidth + gap;
}
function getVisibleCount() {
  const container = track.parentElement;
  return Math.floor(container.offsetWidth / getCardWidth()) || 1;
}
function getMaxPos() {
  return Math.max(0, cards.length - getVisibleCount());
}
function buildDots() {
  const max = getMaxPos();
  dotsContainer.innerHTML = '';
  for (let i = 0; i <= max; i++) {
    const dot = document.createElement('button');
    dot.className = 'team-dot' + (i === teamPos ? ' active' : '');
    dot.onclick = () => { teamPos = i; updateCarousel(); };
    dotsContainer.appendChild(dot);
  }
}
function updateCarousel() {
  const max = getMaxPos();
  if (teamPos < 0) teamPos = max;
  if (teamPos > max) teamPos = 0;
  track.style.transform = `translateX(-${teamPos * getCardWidth()}px)`;
  buildDots();
}
function slideTeam(dir) { teamPos += dir; updateCarousel(); }

buildDots();
updateCarousel();
window.addEventListener('resize', () => { teamPos = Math.min(teamPos, getMaxPos()); updateCarousel(); });

// Touch swipe for carousel
let touchStartX = 0;
track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
track.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) slideTeam(diff > 0 ? 1 : -1);
}, { passive: true });
