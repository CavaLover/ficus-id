// ===== 共享JS v1 — 榕属网站动效系统 =====

const IMG_BASE = '/img';
const IMG = {
  hero: `${IMG_BASE}/hero.jpg`,
  syconium: `${IMG_BASE}/syconium.jpg`,
  leaf: `${IMG_BASE}/leaf.jpg`,
  bark: `${IMG_BASE}/bark.jpg`,
  gallery1: `${IMG_BASE}/gallery1.jpg`,
  gallery2: `${IMG_BASE}/gallery2.jpg`,
  gallery3: `${IMG_BASE}/gallery3.jpg`,
  gallery4: `${IMG_BASE}/gallery4.jpg`,
  gallery5: `${IMG_BASE}/gallery5.jpg`,
  gallery6: `${IMG_BASE}/gallery6.jpg`
};

function loadHeroImg() { const el = document.getElementById('heroImg'); if(el) el.style.backgroundImage = `url(${IMG.hero})`; }
function loadDataImages() { document.querySelectorAll('[data-img]').forEach(el => { el.src = IMG[el.dataset.img]; }); }

// ===== Lightbox =====
function openLB(src, caption) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lbImg').src = src;
  document.getElementById('lbCaption').innerHTML = caption;
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeLB() {
  document.getElementById('lightbox').classList.remove('show');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeLB(); });

// ===== Hero particles (green-yellow spectrum for Ficus theme) =====
function createParticles() {
  const hero = document.getElementById('hero');
  if(!hero) return;
  for(let i = 0; i < 22; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const size = Math.random()*3+1.5;
    const hue = 100 + Math.random()*60; // green-yellow range (was blue-cyan 200+60)
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;` +
      `background:hsla(${hue},70%,55%,${0.2+Math.random()*0.3});` +
      `box-shadow:0 0 ${size*2}px hsla(${hue},70%,55%,0.3);` +
      `animation-duration:${Math.random()*12+10}s;animation-delay:${Math.random()*12}s;` +
      `border-radius:${Math.random()>0.5?'50%':'2px'};`;
    hero.appendChild(p);
  }
}

// ===== Stats counter =====
let _countersAnimated = false;
function animateCounters() {
  if(_countersAnimated) return;
  _countersAnimated = true;
  document.querySelectorAll('.stat-num').forEach(el => {
    const t = parseInt(el.dataset.target);
    let current = 0;
    const duration = 1400, startTime = performance.now();
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      current = Math.round(ease * t);
      el.textContent = current + (t >= 100 ? '+' : '%');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(() => setTimeout(() => requestAnimationFrame(tick), 400));
  });
}

// ===== Scroll reveal =====
function initReveal() {
  const REVEAL_SELECTOR = '.type-card,.stat-box,.mod-card,.example-card,.spectrum-section,.method-card,.g-item';
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting) {
        e.target.classList.add('fade-in');
        if(e.target.classList.contains('stat-row') || e.target.closest('.stats-row')) animateCounters();
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll(REVEAL_SELECTOR).forEach(el => obs.observe(el));
  document.querySelectorAll('.stats-row').forEach(el => obs.observe(el));
}

// ===== Gallery builder (Ficus species) =====
function buildGallery(gridId) {
  const data = [
    { img:IMG.gallery1, title:'🌳 孟加拉榕', desc:'Ficus benghalensis — 著名绞杀榕，气生根形成"树中之树"' },
    { img:IMG.gallery2, title:'🍃 垂叶榕', desc:'Ficus benjamina — 常见室内观赏榕树，叶片下垂如帘' },
    { img:IMG.gallery3, title:'🫒 菩提树', desc:'Ficus religiosa — 佛教圣树，心形长尾尖叶片' },
    { img:IMG.gallery4, title:'🔴 无花果', desc:'Ficus carica — 最常见的食用榕果，原产地中海' },
    { img:IMG.gallery5, title:'🌿 薜荔', desc:'Ficus pumila — 攀援型榕属植物，常用于墙面绿化' },
    { img:IMG.gallery6, title:'🫐 橡皮树', desc:'Ficus elastica — 大型革质亮叶榕，热带雨林层树种' },
    { img:IMG.syconium, title:'🫒 隐头果', desc:'Syconium — 榕属特有的封闭花序结构' },
    { img:IMG.leaf, title:'🍃 榕叶多样性', desc:'全球800+种榕树的叶片形态变化' },
    { img:IMG.bark, title:'🪵 树皮与气生根', desc:'不同亚属的树皮纹理与气生根形态差异' },
  ];
  const grid = document.getElementById(gridId); if(!grid) return;
  data.forEach((g, i) => {
    const item = document.createElement('div');
    item.className='g-item fade-in'; item.style.animationDelay = `${i * 0.06}s`;
    item.innerHTML=`<img src="${g.img}" alt="${g.title}" loading="lazy"><div class="g-info"><h4>${g.title}</h4><p>${g.desc}</p></div>`;
    item.onclick=()=>openLB(g.img,`${g.title} — ${g.desc}`);
    grid.appendChild(item);
  });
}

// ===== Nav active state =====
function initNavActive() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if(href && (path.endsWith(href) || (path === '/' && href === '/'))) link.classList.add('active');
    else link.classList.remove('active');
  });
}

// ===== Page transitions =====
function initPageTransitions() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if(!a) return;
    const href = a.getAttribute('href');
    if(!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('//')) return;
    e.preventDefault();
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.25s ease';
    setTimeout(() => window.location.href = href, 250);
  });
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.35s var(--ease-out, cubic-bezier(0.16,1,0.3,1))';
      document.body.style.opacity = '1';
    });
  });
}

// ===== Footer year =====
function initFooterYear() {
  const el = document.getElementById('year');
  if(el) el.textContent = new Date().getFullYear();
}

// ===== Lifecycle parallax (reuse from butterfly-ant) =====
function initLifecycleParallax() {
  const images = document.querySelectorAll('.lc-img-wrap img');
  if(!images.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting) entry.target.style.transform = 'scale(1)'; });
  }, { threshold: 0.3 });
  images.forEach(img => observer.observe(img));
  let ticking = false;
  window.addEventListener('scroll', () => {
    if(!ticking) {
      requestAnimationFrame(() => {
        images.forEach(img => {
          const rect = img.getBoundingClientRect();
          const center = rect.top + rect.height/2;
          const viewportCenter = window.innerHeight / 2;
          const offset = (center - viewportCenter) / window.innerHeight;
          img.style.transform = `scale(1) translateY(${offset * -8}px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ===== Shared init =====
function sharedInit(){
  initPageTransitions();
  loadHeroImg(); loadDataImages(); createParticles();
  initReveal(); initNavActive(); initFooterYear();
  initLifecycleParallax();
  initNavMore();
}

// ===== Nav More Dropdown =====
function initNavMore() {
  const more = document.querySelector('.nav-more');
  if(!more) return;
  const btn = more.querySelector('.nav-more-btn');
  btn.addEventListener('click', e => { e.stopPropagation(); more.classList.toggle('open'); });
  document.addEventListener('click', e => { if(!more.contains(e.target)) more.classList.remove('open'); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') more.classList.remove('open'); });
}
