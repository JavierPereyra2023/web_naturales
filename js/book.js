// ─── Progress bar ───
const bar = document.createElement('div');
bar.id = 'scroll-progress';
document.body.prepend(bar);

function updateProgress() {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });

// ─── Menú mobile ───
const menuToggle = document.getElementById('menuToggle');
const menuClose  = document.getElementById('menuClose');
const mobileMenu = document.getElementById('mobileMenu');
const menuOverlay = document.getElementById('menuOverlay');
const navbar = document.getElementById('navbar');

function openMenu() {
  if (!mobileMenu || !menuOverlay) return;
  mobileMenu.classList.add('open');
  menuOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  if (!mobileMenu || !menuOverlay) return;
  mobileMenu.classList.remove('open');
  menuOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}
if (menuToggle) menuToggle.addEventListener('click', openMenu);
if (menuClose)  menuClose.addEventListener('click', closeMenu);
if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);
document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', closeMenu));

if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 80
      ? 'rgba(7,10,15,0.94)' : 'rgba(7,10,15,0.85)';
  }, { passive: true });
}

// ─── Reveal on scroll ───
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

function markReveal(el, cls = 'reveal', delay = '') {
  if (el.classList.contains('reveal') || el.classList.contains('reveal-left') || el.classList.contains('reveal-right')) return;
  el.classList.add(cls);
  if (delay) el.classList.add(delay);
  revealObs.observe(el);
}

// Tarjetas
document.querySelectorAll('.chapter-card, .topic-card, .lab-card, .unit-card').forEach((el, i) => {
  markReveal(el, 'reveal', i > 0 ? 'd' + Math.min(i, 5) : '');
});

// Secciones (excepto hero)
document.querySelectorAll('section').forEach(section => {
  if (section.querySelector('.hero-img')) return;

  // Títulos
  section.querySelectorAll('h1, h2, h3').forEach(el => {
    if (el.closest('.chapter-card, .topic-card, .lab-card, .unit-card')) return;
    markReveal(el);
  });

  // Párrafos con stagger
  let pCount = 0;
  section.querySelectorAll('p').forEach(el => {
    if (el.closest('.chapter-card, .topic-card, .lab-card, .unit-card')) return;
    markReveal(el, 'reveal', pCount > 0 ? 'd' + Math.min(pCount, 5) : '');
    pCount++;
  });

  // Asides desde la derecha
  section.querySelectorAll('aside').forEach(el => markReveal(el, 'reveal-right'));

  // Imágenes (no hero)
  section.querySelectorAll('img:not(.hero-img)').forEach((el, i) => {
    markReveal(el, 'reveal', i > 0 ? 'd' + Math.min(i, 5) : '');
  });

  // Accent lines y labels
  section.querySelectorAll('.accent-line').forEach(el => markReveal(el));

  // Números / stats con stagger
  section.querySelectorAll('[class*="border-l"]').forEach((el, i) => {
    if (el.closest('.chapter-card, .topic-card, .lab-card, .unit-card')) return;
    markReveal(el, 'reveal', 'd' + Math.min(i + 1, 5));
  });
});
