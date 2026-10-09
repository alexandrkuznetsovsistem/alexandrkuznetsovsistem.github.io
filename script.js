// Mobile menu
const burger = document.querySelector('.burger');
const links = document.querySelector('.nav__links');
burger.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', open);
});
links.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') links.classList.remove('is-open');
});

// Tabs: marks the active tab, handles arrow keys; `onSelect` swaps the content
function initTabs(tablist, onSelect) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
  const select = (index, moveFocus) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active);
      tab.tabIndex = active ? 0 : -1;
    });
    if (moveFocus) tabs[index].focus();
    if (tablist.scrollWidth > tablist.clientWidth) {
      tablist.scrollTo({ left: tabs[index].offsetLeft - 16, behavior: 'smooth' });
    }
    onSelect(panels[index], panels);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      select((i + step + tabs.length) % tabs.length, true);
    });
  });
  return panels;
}

// Screenshot switchers: each group has its own tabs; panels are stacked, the active one fades in
document.querySelectorAll('.switch__tabs').forEach((tablist) => {
  initTabs(tablist, (next, panels) => {
    panels.forEach((panel) => panel.classList.toggle('is-active', panel === next));
  });
});

// Lightbox: opens a screenshot large. Click on the image zooms in/out when there is room to zoom;
// click outside the image, the close button or Esc closes it.
const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('.lightbox__img');
const lbCaption = lightbox.querySelector('.lightbox__caption');
const lbClose = lightbox.querySelector('.lightbox__close');
let lbTrigger = null;
let lbNaturalWidth = 0;

function setLightboxZoom(zoomIn, pointer) {
  const available = lightbox.clientWidth - 48;
  const fitWidth = Math.min(lbNaturalWidth, available);
  // Desktop: zoom to 1:1. Phone: 1:1 would be 4-5x, so cap at 2.5x the screen width.
  const zoomWidth = Math.min(lbNaturalWidth, Math.round(lightbox.clientWidth * 2.5));
  const canZoom = zoomWidth > fitWidth * 1.15;
  const zoomed = zoomIn && canZoom;
  const before = pointer && lbImg.getBoundingClientRect();
  lbImg.style.width = (zoomed ? zoomWidth : fitWidth) + 'px';
  lightbox.classList.toggle('can-zoom', canZoom);
  lightbox.classList.toggle('is-zoomed', zoomed);
  if (before) {
    // keep the point under the cursor/finger in place
    const rx = (pointer.clientX - before.left) / before.width;
    const ry = (pointer.clientY - before.top) / before.height;
    const after = lbImg.getBoundingClientRect();
    lightbox.scrollLeft += after.left + rx * after.width - pointer.clientX;
    lightbox.scrollTop += after.top + ry * after.height - pointer.clientY;
  }
}

function openLightbox(frame) {
  const img = frame.querySelector('img');
  lbTrigger = frame;
  lbNaturalWidth = Number(img.getAttribute('width'));
  lbImg.src = img.currentSrc || img.src;
  lbImg.alt = img.alt;
  lbCaption.textContent = frame.closest('figure').querySelector('figcaption').textContent;
  lightbox.hidden = false;
  document.documentElement.classList.add('is-locked');
  setLightboxZoom(false);
  lightbox.scrollTo(0, 0);
  lbClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.documentElement.classList.remove('is-locked');
  if (lbTrigger) lbTrigger.focus({ preventScroll: true });
}

document.querySelectorAll('.shot__frame').forEach((frame) => {
  frame.addEventListener('click', () => openLightbox(frame));
});
lbImg.addEventListener('click', (e) => {
  e.stopPropagation();
  setLightboxZoom(!lightbox.classList.contains('is-zoomed'), e);
});
lightbox.addEventListener('click', closeLightbox); // anything but the image
document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'Tab') { e.preventDefault(); lbClose.focus(); } // the close button is the only control
});
window.addEventListener('resize', () => {
  if (!lightbox.hidden) setLightboxZoom(lightbox.classList.contains('is-zoomed'));
});

// Case tabs: all panels are in the HTML, JS shows one at a time
let caseTimer;
const casePanels = initTabs(document.querySelector('#cases .tabs'), (next, panels) => {
  const shown = panels.find((panel) => !panel.hidden);
  if (shown === next) return;
  clearTimeout(caseTimer);
  shown.classList.add('fade');
  caseTimer = setTimeout(() => {
    panels.forEach((panel) => { panel.hidden = panel !== next; panel.classList.remove('fade'); });
    next.classList.add('fade');
    next.getBoundingClientRect();
    next.classList.remove('fade');
  }, 200);
});
casePanels.forEach((panel, i) => { panel.hidden = i !== 0; });

// About photo: if images/photo.jpg is missing, hide the broken image and keep the placeholder box
document.querySelectorAll('.about__photo img').forEach((img) => {
  const showPlaceholder = () => img.parentElement.classList.add('is-empty');
  if (img.complete && !img.naturalWidth) showPlaceholder();
  else img.addEventListener('error', showPlaceholder);
});

// Newcomer race: the final state is the default; arm it only when it can actually play
const race = document.getElementById('race');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const raceArmed = Boolean(race) && !reduceMotion;
if (raceArmed) race.classList.add('is-armed');

// Reveal on scroll (also starts the race once, when most of it is visible)
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    if (en.target === race) {
      if (en.intersectionRatio < 0.6) return;
      race.getBoundingClientRect(); // commit the start state so the transitions run
      race.classList.replace('is-armed', 'is-playing');
    } else {
      en.target.classList.add('is-in');
    }
    io.unobserve(en.target);
  });
}, { threshold: [0.12, 0.6] });
document.querySelectorAll('section:not(.hero) .container > *:not(.process__steps), .promo, .step').forEach((el) => {
  el.classList.add('reveal'); io.observe(el);
});
if (raceArmed) io.observe(race);
