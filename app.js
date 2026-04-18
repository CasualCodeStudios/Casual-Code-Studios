/* =============================================
   CASUAL CODE STUDIOS — UNIFIED APP JS
   All pages: home, about, blog, admin
   ============================================= */

'use strict';

// ===== THEME TOGGLE =====
(function() {
  const saved = localStorage.getItem('ccs-theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light-mode');
})();

function applyTheme() {
  const isDark = !document.body.classList.contains('light-mode');
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const icon = btn.querySelector('.theme-icon') || btn;
    if (icon.className === 'theme-icon' || icon === btn) {
      icon.textContent = isDark ? '☀️' : '🌙';
    }
  });
  localStorage.setItem('ccs-theme', isDark ? 'dark' : 'light');
}
applyTheme();

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      applyTheme();
    });
  });
});


// ===== CUSTOM CURSOR =====
(function() {
  const cursor = document.querySelector('.cursor');
  const ring   = document.querySelector('.cursor-ring');
  if (!cursor || !ring) return;
  let mx=0,my=0,rx=0,ry=0;
  window.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cursor.style.left=mx+'px'; cursor.style.top=my+'px';
  });
  (function animRing(){
    rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(animRing);
  })();
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .service-card, .testi-card, .project-card')) {
      cursor.style.transform='translate(-50%,-50%) scale(2.5)';
      ring.style.transform='translate(-50%,-50%) scale(1.6)';
      ring.style.borderColor='rgba(230,57,70,0.8)';
    } else {
      cursor.style.transform='translate(-50%,-50%) scale(1)';
      ring.style.transform='translate(-50%,-50%) scale(1)';
      ring.style.borderColor='rgba(230,57,70,0.5)';
    }
  });
})();


// ===== NAV SCROLL =====
(function() {
  const nav = document.querySelector('.nav, .site-header');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();


// ===== HAMBURGER / MOBILE NAV =====
(function() {
  // Old-style (home/about): .hamburger + .nav-drawer
  const ham = document.querySelector('.hamburger');
  const drawer = document.querySelector('.nav-drawer');
  if (ham && drawer) {
    ham.addEventListener('click', () => {
      ham.classList.toggle('open');
      drawer.classList.toggle('open');
      document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
  // New-style (blog): .menu-btn + .sidebar
  const menuBtn = document.querySelector('.menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); });
    sidebarOverlay?.addEventListener('click', () => sidebar.classList.remove('open'));
  }
})();

window.toggleSidebar = function() {
  document.querySelector('.sidebar')?.classList.toggle('open');
};
window.closeSidebar = function() {
  document.querySelector('.sidebar')?.classList.remove('open');
};


// ===== SCROLL REVEAL =====
(function() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up, .reveal-card');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible', 'revealed');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();


// ===== SKILL BAR ANIMATION =====
(function() {
  const bars = document.querySelectorAll('.skill-bar-fill');
  if (!bars.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('animate'); io.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  bars.forEach(b => io.observe(b));
})();


// ===== TYPING EFFECT =====
function initTyping(elementId, texts) {
  const el = document.getElementById(elementId);
  if (!el) return;
  // Set a fixed width based on the longest text to prevent layout shift
  const maxLen = Math.max(...texts.map(t => t.length));
  el.style.minWidth = (maxLen * 9.6) + 'px'; // ~9.6px per char in mono
  el.style.display = 'inline-block';
  
  let idx=0, charIdx=0, isDeleting=false;
  function type() {
    const cur = texts[idx];
    el.textContent = cur.substring(0, charIdx);
    let speed = isDeleting ? 55 : 85;
    if (!isDeleting && charIdx===cur.length) { speed=2000; isDeleting=true; }
    else if (isDeleting && charIdx===0) { isDeleting=false; idx=(idx+1)%texts.length; speed=400; }
    charIdx += isDeleting ? -1 : 1;
    setTimeout(type, speed);
  }
  type();
}


// ===== COUNTER ANIMATION =====
(function() {
  const nums = document.querySelectorAll('[data-count]');
  if (!nums.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseInt(e.target.dataset.count);
        const suffix = e.target.dataset.suffix || '';
        let start=0;
        const inc = target / (1800/16);
        const interval = setInterval(() => {
          start+=inc;
          if (start>=target) { start=target; clearInterval(interval); }
          e.target.textContent = Math.floor(start)+suffix;
        }, 16);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  nums.forEach(n => io.observe(n));
})();


// ===== TOAST =====
function showToast(message, icon='✓') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}
window.showToast = showToast;


// ===== MODAL SYSTEM =====
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});
document.addEventListener('keydown', e => {
  if (e.key==='Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});
window.openModal = openModal;
window.closeModal = closeModal;


// ===== AUTH SYSTEM =====
const Auth = {
  key: 'ccs-user',
  adminKey: 'ccs-admin',

  get user() { return JSON.parse(localStorage.getItem(this.key)||'null'); },
  get isLoggedIn() { return !!this.user; },
  get isAdmin() { return !!JSON.parse(localStorage.getItem(this.adminKey)||'null'); },
  get isVip() { return this.user && this.user.vip; },

  login(email, password) {
    if (!email || !password || password.length < 6) return false;
    // Check stored users first
    const users = JSON.parse(localStorage.getItem('ccs-users')||'[]');
    const found = users.find(u => u.email===email && u.password===password);
    if (found) {
      localStorage.setItem(this.key, JSON.stringify(found));
      this._syncMember(found);
      return true;
    }
    // Fallback: accept any valid-format login (demo mode)
    const u = { id: Date.now(), email, name: email.split('@')[0], vip: false, role:'member', joinDate: new Date().toISOString() };
    localStorage.setItem(this.key, JSON.stringify(u));
    this._syncMember(u);
    return true;
  },

  register(email, password, name) {
    if (!email||!password||!name||password.length<6) return false;
    const users = JSON.parse(localStorage.getItem('ccs-users')||'[]');
    if (users.find(u=>u.email===email)) return 'exists';
    const u = { id: Date.now(), email, name, password, vip: false, role:'member', joinDate: new Date().toISOString() };
    users.push(u);
    localStorage.setItem('ccs-users', JSON.stringify(users));
    localStorage.setItem(this.key, JSON.stringify(u));
    this._syncMember(u);
    return true;
  },

  applyVipCode(code) {
    const codes = JSON.parse(localStorage.getItem('ccs-vip-codes')||'[]');
    const found = codes.find(c => c.code===code.toUpperCase() && !c.used);
    if (found) {
      found.used = true;
      localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
      const u = this.user;
      if (u) { u.vip=true; u.role='vip'; localStorage.setItem(this.key, JSON.stringify(u)); }
      return true;
    }
    // Fallback built-in codes
    const builtin = ['VIP2026','CCSEXCL','PREMIUM1'];
    if (builtin.includes(code.toUpperCase())) {
      const u = this.user || { id: Date.now(), name:'VIP Member', email:'', vip:true, role:'vip', joinDate: new Date().toISOString() };
      u.vip=true; u.role='vip';
      localStorage.setItem(this.key, JSON.stringify(u));
      return true;
    }
    return false;
  },

  loginAdmin(email, password) {
    // Match admin credentials: admin@cc-studios.com / FormalDecode.94.ccs.Admin OR legacy
    if ((email==='admin@cc-studios.com'&&password==='FormalDecode.94.ccs.Admin')||(password==='CCS@admin2026')) {
      localStorage.setItem(this.adminKey, JSON.stringify({ role:'admin', email, loginTime: new Date().toISOString() }));
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem(this.key);
  },
  logoutAdmin() {
    localStorage.removeItem(this.adminKey);
  },

  _syncMember(user) {
    const members = JSON.parse(localStorage.getItem('ccs-members')||'[]');
    if (!members.find(m=>m.email===user.email)) {
      members.push({ name:user.name, email:user.email, vip:user.vip, role:user.role||'member', joinDate:user.joinDate });
      localStorage.setItem('ccs-members', JSON.stringify(members));
    }
  }
};
window.Auth = Auth;


// ===== UPDATE AUTH UI =====
function updateAuthUI() {
  const loggedOut = document.querySelectorAll('.show-if-logged-out');
  const loggedIn  = document.querySelectorAll('.show-if-logged-in');
  const vipEls    = document.querySelectorAll('.show-if-vip');
  const adminEls  = document.querySelectorAll('.show-if-admin');
  const names     = document.querySelectorAll('.user-display-name');
  const authWrap  = document.getElementById('authBtnWrap');
  const userWrap  = document.getElementById('userBtnWrap');
  const userGreet = document.getElementById('userGreet');

  loggedOut.forEach(el => el.style.display = Auth.isLoggedIn ? 'none' : '');
  loggedIn.forEach(el  => el.style.display = Auth.isLoggedIn ? '' : 'none');
  vipEls.forEach(el    => el.style.display = Auth.isVip ? '' : 'none');
  adminEls.forEach(el  => el.style.display = Auth.isAdmin ? '' : 'none');
  names.forEach(el     => { if(Auth.user) el.textContent = Auth.user.name; });

  // Blog-style auth UI
  if (authWrap && userWrap) {
    if (Auth.isLoggedIn) {
      authWrap.classList.add('hidden');
      userWrap.classList.remove('hidden');
      if (userGreet && Auth.user) {
        userGreet.innerHTML = `Hey, <strong>${Auth.user.name.split(' ')[0]}</strong>`;
      }
    } else {
      authWrap.classList.remove('hidden');
      userWrap.classList.add('hidden');
    }
  }

  // Show VIP dashboard button if VIP
  document.querySelectorAll('.btn-vip-dash').forEach(btn => {
    btn.style.display = Auth.isVip ? '' : 'none';
  });

  // Refresh blog posts if on blog page
  if (typeof renderPosts === 'function') renderPosts(window._currentBlogCat||'all');
}
window.updateAuthUI = updateAuthUI;


// ===== AUTH MODAL FUNCTIONS (blog.html style) =====
window.openAuthModal = function(tab) {
  openModal('loginModal');
  if (tab==='signup') {
    const loginTabs = document.querySelectorAll('.login-tab');
    loginTabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const regTab = document.querySelector('.login-tab[data-tab="tab-register"]');
    if (regTab) { regTab.classList.add('active'); document.getElementById('tab-register')?.classList.add('active'); }
  }
};
window.closeAuthModal = function() { closeModal('loginModal'); };
window.handleAuthOverlay = function(e) { if(e.target===document.getElementById('authModal')||e.target===document.getElementById('loginModal')) closeModal(e.target.id); };
window.openLockModal = function() { openModal('lockModal'); };
window.closeLockModal = function() { closeModal('lockModal'); };
window.handleLockOverlay = function(e) { if(e.target===document.getElementById('lockModal')) closeModal('lockModal'); };


// ===== FORMS SETUP =====
function setupForms() {
  // Login tab switching
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = loginForm.querySelector('[name="email"]').value;
      const pass  = loginForm.querySelector('[name="password"]').value;
      if (Auth.login(email, pass)) {
        closeModal('loginModal');
        updateAuthUI();
        showToast(`Welcome back! 👋`, '✓');
      } else {
        showToast('Invalid credentials. Try again.', '⚠️');
      }
    });
  }

  // Register form
  const regForm = document.getElementById('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', e => {
      e.preventDefault();
      const name  = regForm.querySelector('[name="name"]').value;
      const email = regForm.querySelector('[name="email"]').value;
      const pass  = regForm.querySelector('[name="password"]').value;
      const result = Auth.register(email, pass, name);
      if (result==='exists') { showToast('Email already registered.', '⚠️'); return; }
      if (result) {
        closeModal('loginModal');
        updateAuthUI();
        showToast(`Account created! Welcome to CCS, ${name.split(' ')[0]}! 🎉`, '✓');
      } else {
        showToast('Fill all fields (min 6-char password).', '⚠️');
      }
    });
  }

  // VIP code form
  const vipForm = document.getElementById('vipCodeForm');
  if (vipForm) {
    vipForm.addEventListener('submit', e => {
      e.preventDefault();
      const code = vipForm.querySelector('[name="vipCode"]').value;
      if (Auth.applyVipCode(code)) {
        closeModal('loginModal');
        updateAuthUI();
        showToast('VIP access granted! Welcome, elite member. ⭐', '⭐');
      } else {
        showToast('Invalid or already-used VIP code.', '✕');
      }
    });
  }

  // Hire form
  const hireForm = document.getElementById('hireForm');
  if (hireForm) {
    hireForm.addEventListener('submit', e => {
      e.preventDefault();
      showToast("Message sent! We'll be in touch within 24h. 🚀", '✓');
      hireForm.reset();
      closeModal('hireModal');
    });
  }

  // Contact form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      showToast('Thanks for reaching out! We\'ll reply soon. 🙌', '✓');
      contactForm.reset();
    });
  }
}


// ===== BLOG SYSTEM =====
const SAMPLE_POSTS = [
  { id:1, title:'How We Built a Farm Website That Actually Converts', excerpt:'The inside story of building SunRise Valley Farms — design decisions, challenges, and what we learned along the way.', content:'<p>Building an e-commerce website for a farm business is a unique challenge. You\'re trying to communicate trust, freshness, and sustainability all at once...</p><p>Here\'s how we approached the SunRise Valley Farms project from brief to launch in under 3 weeks.</p><h3>The Brief</h3><p>The client wanted a website that felt earthy, trustworthy, and easy to use. We started with a deep green color palette, heavy use of natural imagery, and a layout that focused on products above everything else. The result was a site that converted from day one.</p>', category:'showcase', catLabel:'Showcase', emoji:'🌅', author:'Kongo Bonface', date:'Jan 12, 2026', readTime:'5 min read', access:'members', tags:['e-commerce','case study','design'] },
  { id:2, title:'5 CSS Tricks That Made Our Clients Say "Whoa"', excerpt:'CSS is more powerful than most people realize. Here are 5 techniques we use regularly that never fail to impress.', content:'<p>CSS has evolved dramatically in recent years. Here are our 5 favorite tricks...</p><p><strong>1. Clip-path animations</strong> — Using clip-path transitions for dramatic reveals...</p><p><strong>2. Custom properties for theming</strong> — Dynamic theming with CSS variables...</p><p><strong>3. Container queries</strong> — The future of responsive components.</p><p><strong>4. Scroll-driven animations</strong> — Native CSS animation on scroll without JavaScript.</p><p><strong>5. @layer cascade layers</strong> — Predictable specificity at scale.</p>', category:'tutorial', catLabel:'Tutorial', emoji:'🎨', author:'James Kariuki', date:'Feb 3, 2026', readTime:'7 min read', access:'members', tags:['css','tutorial','tips'] },
  { id:3, title:'Why Kenyan Businesses Still Don\'t Have Websites (And Why That\'s Changing)', excerpt:'We surveyed local businesses in Nyeri and found some surprising reasons. Here\'s what the data says.', content:'<p>The digital gap in Kenyan SMEs is real, but it\'s closing faster than you might think. The main barriers: perceived cost, lack of awareness, and not knowing where to start. That\'s exactly why we built CCS — to remove those barriers and make professional web presence accessible to every Kenyan business.</p>', category:'news', catLabel:'Dev News', emoji:'🇰🇪', author:'Grace Njoki', date:'Mar 5, 2026', readTime:'4 min read', access:'public', tags:['kenya','business','web'] },
  { id:4, title:'From Broken Template to Boutique Dream: The Bemilwis Story', excerpt:'A before-and-after deep dive into how we transformed a generic template into a fashion-forward brand experience.', content:'<p>When Bemilwis came to us, their website was technically functional but completely soulless. Zero brand identity. Generic fonts. Stock photos. We rebuilt it from scratch — new color palette, custom typography, smooth animations, and a layout that actually shows off their gorgeous clothing. The result? 3x more inquiries in the first month.</p>', category:'beforeafter', catLabel:'Before & After', emoji:'👗', author:'Amina Mwangi', date:'Mar 18, 2026', readTime:'6 min read', access:'members', tags:['design','before-after','boutique'] },
  { id:5, title:'How We Use AI in Our Daily Web Dev Workflow', excerpt:"AI isn't replacing us — it's making us 10x faster. Here's exactly how we use Claude and other AI tools.", content:"<p>We use AI tools at almost every stage of our development process. From research to writing content, debugging CSS, and even generating color palettes — AI is now a core part of how we work at CCS. But it's a tool, not a crutch. The creativity, the taste, the client relationship — that's still entirely human.</p>", category:'tutorial', catLabel:'Tutorial', emoji:'🤖', author:'Kongo Bonface', date:'Apr 2, 2026', readTime:'8 min read', access:'members', tags:['ai','workflow','productivity'] },
  { id:6, title:"The State of Frontend in 2026: What's Hot, What's Not", excerpt:"GSAP, Astro, CSS container queries — we break down what's actually worth learning this year.", content:'<p>The frontend landscape moves fast. In 2026, the things worth learning are: CSS container queries (finally stable everywhere), View Transitions API, GSAP for complex animations, and vanilla JS over heavy frameworks for most small-to-mid projects. Skip: most meta-frameworks unless you\'re building at scale.</p>', category:'news', catLabel:'Dev News', emoji:'📊', author:'James Kariuki', date:'Apr 10, 2026', readTime:'5 min read', access:'public', tags:['frontend','2026','trends'] }
];

function getStoredPosts() {
  const stored = JSON.parse(localStorage.getItem('ccs-posts')||'[]');
  // stored posts from admin have different shape — normalize
  const normalized = stored.map(p => ({
    id: p.id || Date.now(),
    title: p.title,
    excerpt: p.excerpt || p.body?.substring(0,120)+'...' || '',
    content: p.content || p.body || '',
    category: p.category || p.cat || 'news',
    catLabel: p.catLabel || p.cat || 'News',
    emoji: p.emoji || '📝',
    author: p.author || 'CCS Team',
    date: p.date ? new Date(p.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'Recent',
    readTime: p.readTime || '3 min read',
    access: p.access || (p.vipOnly ? 'vip' : 'members'),
    tags: p.tags || []
  }));
  return [...SAMPLE_POSTS, ...normalized];
}

window._currentBlogCat = 'all';

function renderPosts(cat='all') {
  const grid = document.getElementById('postsGrid');
  if (!grid) return;
  window._currentBlogCat = cat;
  const user = Auth.user;
  const allPosts = getStoredPosts();
  const filtered = cat==='all' ? allPosts : allPosts.filter(p=>p.category===cat);

  if (!filtered.length) {
    grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);font-family:var(--font-mono)">No posts in this category yet.</div>';
    return;
  }

  grid.innerHTML = filtered.map(post => {
    const isLocked = post.access !== 'public' && !user;
    return `
    <div class="post-card ${isLocked?'locked':''} reveal-card" data-cat="${post.category}">
      <div class="post-img cat-${post.category}">
        <span>${post.emoji}</span>
        ${isLocked ? '<span class="post-lock-badge">🔒 Members</span>' : ''}
        <span class="post-cat-tag">${post.catLabel}</span>
      </div>
      <div class="post-body">
        <div class="post-meta">
          <span>📅 ${post.date}</span>
          <span>⏱ ${post.readTime}</span>
        </div>
        <h3>${post.title}</h3>
        <p class="post-excerpt">${post.excerpt}</p>
      </div>
      <div class="post-footer">
        <span class="post-author">By ${post.author}</span>
        <button class="post-read-btn" onclick="handleReadPost(${post.id})">
          ${isLocked ? '🔒 Read' : 'Read →'}
        </button>
      </div>
    </div>`;
  }).join('');

  setTimeout(() => {
    document.querySelectorAll('.reveal-card').forEach(el => el.classList.add('revealed'));
  }, 80);
}

window.renderPosts = renderPosts;

window.handleReadPost = function(id) {
  const user = Auth.user;
  const post = getStoredPosts().find(p=>p.id===id);
  if (!post) return;
  if (post.access !== 'public' && !user) {
    openModal('lockModal');
    return;
  }
  openFullArticle(post);
};

window.openFullArticle = function(post) {
  // Remove any existing article modal
  const existing = document.getElementById('articleOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'articleOverlay';
  overlay.innerHTML = `
    <div class="modal-panel" style="max-width:720px;max-height:85vh;overflow-y:auto;padding:40px;">
      <button class="modal-close" onclick="document.getElementById('articleOverlay').remove();document.body.style.overflow='';">✕</button>
      <span class="section-tag">${post.catLabel}</span>
      <h2 style="font-family:var(--font-display);font-size:clamp(1.4rem,3vw,2rem);font-weight:800;margin:12px 0 8px;">${post.title}</h2>
      <div style="display:flex;gap:16px;font-size:0.75rem;color:var(--text-muted);margin-bottom:28px;font-family:var(--font-mono)">
        <span>By ${post.author}</span><span>${post.date}</span><span>${post.readTime}</span>
      </div>
      <div style="font-size:0.9rem;color:var(--text-muted);line-height:1.9;">${post.content}</div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  overlay.addEventListener('click', e => {
    if (e.target===overlay) { overlay.remove(); document.body.style.overflow=''; }
  });
};

window.subscribeNewsletter = function() {
  const email = document.getElementById('blogNlEmail')?.value;
  if (!email) { showToast('Enter your email first!', '⚠️'); return; }
  showToast('You\'re subscribed! 🎉 Check your inbox soon.', '✓');
  if (document.getElementById('blogNlEmail')) document.getElementById('blogNlEmail').value='';
};


// ===== OPEN ARTICLE (home page style) =====
window.openArticle = function(articleId) {
  if (!Auth.isLoggedIn) { openModal('loginModal'); return; }
  const post = getStoredPosts().find(p=>p.id===articleId);
  if (!post) return;
  openFullArticle(post);
};


// ===== ADMIN FUNCTIONS =====
window.adminLogin = function() {
  const email = document.getElementById('adm-email')?.value.trim();
  const pass  = document.getElementById('adm-pass')?.value.trim();
  const err   = document.getElementById('adm-error');
  if (Auth.loginAdmin(email, pass)) {
    document.getElementById('adminLoginScreen')?.classList.add('hidden');
    document.getElementById('adminDashboard')?.classList.remove('hidden');
    loadAdminData();
  } else {
    if (err) err.classList.remove('hidden');
  }
};

window.adminLogout = function() {
  Auth.logoutAdmin();
  document.getElementById('adminLoginScreen')?.classList.remove('hidden');
  document.getElementById('adminDashboard')?.classList.add('hidden');
  showToast('Logged out of admin.', '👋');
};

window.showPanel = function(panel) {
  document.querySelectorAll('.adm-panel').forEach(p=>{ p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.adm-nav-btn').forEach(b=>b.classList.remove('active'));
  const target = document.getElementById('panel-'+panel);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
  const btn = document.querySelector(`.adm-nav-btn[onclick*="'${panel}'"]`);
  if (btn) btn.classList.add('active');
  // Update panel title
  const titles = { overview:'Overview', posts:'Blog Posts', members:'Members', vip:'VIP Members', inquiries:'Inquiries', settings:'Settings' };
  const el = document.getElementById('panelTitle');
  if (el) el.textContent = titles[panel]||panel;
};

function loadAdminData() {
  // Stats
  const members = JSON.parse(localStorage.getItem('ccs-members')||'[]');
  const posts = JSON.parse(localStorage.getItem('ccs-posts')||'[]');
  const inquiries = JSON.parse(localStorage.getItem('ccs-inquiries')||'[]');
  const vipCodes = JSON.parse(localStorage.getItem('ccs-vip-codes')||'[]');
  const vipMembers = members.filter(m=>m.vip||m.role==='vip');

  const s = { totalMembers: members.length, totalVip: vipMembers.length, totalPosts: posts.length + SAMPLE_POSTS.length, totalInquiries: inquiries.length };
  Object.entries(s).forEach(([k,v]) => { const el=document.getElementById(k); if(el) el.textContent=v; });

  // Recent members list
  const rm = document.getElementById('recentMembers');
  if (rm) {
    rm.innerHTML = members.slice(-5).reverse().map(m=>`
      <div class="adm-list-item">
        <span>${m.name}</span>
        <span class="item-badge ${m.vip||m.role==='vip'?'badge-vip':'badge-member'}">${m.vip||m.role==='vip'?'VIP':'Member'}</span>
      </div>`).join('') || '<div class="adm-list-item" style="color:var(--text-dim)">No members yet.</div>';
  }

  // Recent inquiries
  const ri = document.getElementById('recentInquiries');
  if (ri) {
    ri.innerHTML = inquiries.slice(-5).reverse().map(q=>`
      <div class="adm-list-item">
        <span>${q.name||'Anonymous'}</span>
        <span class="item-badge badge-new">New</span>
      </div>`).join('') || '<div class="adm-list-item" style="color:var(--text-dim)">No inquiries yet.</div>';
  }

  // Counts
  const mc=document.getElementById('memberCount'); if(mc) mc.textContent=members.length;
  const pc=document.getElementById('postCount'); if(pc) pc.textContent=posts.length+SAMPLE_POSTS.length;
  const vc=document.getElementById('vipCount'); if(vc) vc.textContent=vipMembers.length;
  const ic=document.getElementById('inquiryCount'); if(ic) ic.textContent=inquiries.length;

  loadPostsList();
  loadMembersList();
  loadVipPanel(vipCodes, vipMembers);
  loadInquiriesList(inquiries);

  // Admin time
  const timeEl = document.getElementById('admTime');
  if (timeEl) {
    setInterval(() => { timeEl.textContent = new Date().toLocaleTimeString(); }, 1000);
  }
}

function loadPostsList() {
  const container = document.getElementById('postsList');
  if (!container) return;
  const posts = [...SAMPLE_POSTS, ...JSON.parse(localStorage.getItem('ccs-posts')||'[]')];
  container.innerHTML = `<table class="adm-table"><thead><tr><th>Title</th><th>Category</th><th>Access</th><th>Author</th><th>Actions</th></tr></thead><tbody>
    ${posts.map((p,i)=>`<tr>
      <td>${p.title}</td>
      <td>${p.catLabel||p.category}</td>
      <td><span class="item-badge ${p.access==='public'?'badge-member':'badge-vip'}">${p.access||'members'}</span></td>
      <td>${p.author||'CCS'}</td>
      <td>${i>=SAMPLE_POSTS.length?`<button class="tbl-action danger" onclick="deleteAdminPost(${i-SAMPLE_POSTS.length})">Delete</button>`:'<span style="font-size:0.7rem;color:var(--text-dim)">Built-in</span>'}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

window.deleteAdminPost = function(idx) {
  if (!confirm('Delete this post?')) return;
  const posts = JSON.parse(localStorage.getItem('ccs-posts')||'[]');
  posts.splice(idx,1);
  localStorage.setItem('ccs-posts', JSON.stringify(posts));
  loadAdminData();
  showToast('Post deleted.', '🗑️');
};

function loadMembersList() {
  const container = document.getElementById('membersList');
  if (!container) return;
  const members = JSON.parse(localStorage.getItem('ccs-members')||'[]');
  if (!members.length) { container.innerHTML='<p style="color:var(--text-dim);padding:20px;text-align:center">No members yet.</p>'; return; }
  container.innerHTML = `<table class="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
    ${members.map((m,i)=>`<tr>
      <td>${m.name}</td><td>${m.email||'—'}</td>
      <td><span class="item-badge ${m.vip||m.role==='vip'?'badge-vip':'badge-member'}">${m.vip||m.role==='vip'?'⭐ VIP':'Member'}</span></td>
      <td>${m.joinDate?new Date(m.joinDate).toLocaleDateString():'—'}</td>
      <td>
        ${!(m.vip||m.role==='vip')?`<button class="tbl-action" onclick="makeVipAdmin(${i})">Make VIP</button>`:''}
        <button class="tbl-action danger" onclick="removeMemberAdmin(${i})">Remove</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

window.makeVipAdmin = function(idx) {
  const members = JSON.parse(localStorage.getItem('ccs-members')||'[]');
  if (members[idx]) { members[idx].vip=true; members[idx].role='vip'; localStorage.setItem('ccs-members', JSON.stringify(members)); loadAdminData(); showToast('Member upgraded to VIP! ⭐'); }
};
window.removeMemberAdmin = function(idx) {
  if (!confirm('Remove this member?')) return;
  const members = JSON.parse(localStorage.getItem('ccs-members')||'[]');
  members.splice(idx,1);
  localStorage.setItem('ccs-members', JSON.stringify(members));
  loadAdminData(); showToast('Member removed.', '🗑️');
};

function loadVipPanel(codes, vipMembers) {
  const codesEl = document.getElementById('vipCodesList');
  if (codesEl) {
    codesEl.innerHTML = codes.length ? codes.map(c=>`
      <div class="vip-code-item">
        <span class="vip-code">${c.code}</span>
        <span class="vip-status ${c.used?'vip-used':''}">${c.used?'✓ Used':'Available'}</span>
        <button class="tbl-action danger" onclick="deleteVipCode('${c.code}')">Delete</button>
      </div>`).join('') : '<p style="color:var(--text-dim);padding:20px;text-align:center">No VIP codes generated yet.</p>';
  }
  const vipEl = document.getElementById('vipMembersList');
  if (vipEl) {
    vipEl.innerHTML = vipMembers.length ? `<table class="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead><tbody>
      ${vipMembers.map(m=>`<tr><td>${m.name}</td><td>${m.email||'—'}</td><td>${m.joinDate?new Date(m.joinDate).toLocaleDateString():'—'}</td></tr>`).join('')}
    </tbody></table>` : '<p style="color:var(--text-dim);padding:20px;text-align:center">No VIP members yet.</p>';
  }
}

window.generateVipCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const code = 'VIP'+(Array.from({length:5},()=>chars[Math.random()*chars.length|0]).join(''));
  const codes = JSON.parse(localStorage.getItem('ccs-vip-codes')||'[]');
  codes.push({ code, used:false, created: new Date().toISOString() });
  localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
  loadAdminData();
  showToast(`VIP Code generated: ${code}`, '⭐');
};

window.deleteVipCode = function(code) {
  const codes = JSON.parse(localStorage.getItem('ccs-vip-codes')||'[]').filter(c=>c.code!==code);
  localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
  loadAdminData(); showToast('Code deleted.', '🗑️');
};

function loadInquiriesList(inquiries) {
  const container = document.getElementById('inquiriesList');
  if (!container) return;
  container.innerHTML = inquiries.length ? `<table class="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Service</th><th>Message</th><th>Date</th></tr></thead><tbody>
    ${inquiries.map(q=>`<tr><td>${q.name||'—'}</td><td>${q.email||'—'}</td><td>${q.service||'—'}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.message||q.brief||'—'}</td><td>${q.date?new Date(q.date).toLocaleDateString():'—'}</td></tr>`).join('')}
  </tbody></table>` : '<p style="color:var(--text-dim);padding:20px;text-align:center">No inquiries yet.</p>';
}

// Admin Post Form
window.openNewPostForm = function() {
  const form = document.getElementById('newPostForm');
  if (form) { form.classList.remove('hidden'); document.getElementById('postFormTitle').textContent='Create New Post'; }
};
window.cancelPostForm = function() {
  document.getElementById('newPostForm')?.classList.add('hidden');
};
window.savePost = function() {
  const title   = document.getElementById('pf-title')?.value.trim();
  const cat     = document.getElementById('pf-cat')?.value;
  const excerpt = document.getElementById('pf-excerpt')?.value.trim();
  const content = document.getElementById('pf-content')?.value.trim();
  const author  = document.getElementById('pf-author')?.value.trim()||'CCS Team';
  const access  = document.getElementById('pf-access')?.value||'members';
  const tags    = document.getElementById('pf-tags')?.value.split(',').map(t=>t.trim()).filter(Boolean)||[];
  const catLabels = { tutorial:'Tutorial', showcase:'Showcase', news:'Dev News', beforeafter:'Before & After' };
  if (!title||!cat) { showToast('Title and category required.', '⚠️'); return; }
  const post = { id: Date.now(), title, excerpt, content, category:cat, catLabel:catLabels[cat]||cat, emoji:'📝', author, date:new Date().toISOString(), readTime:'5 min read', access, tags };
  const posts = JSON.parse(localStorage.getItem('ccs-posts')||'[]');
  posts.unshift(post);
  localStorage.setItem('ccs-posts', JSON.stringify(posts));
  cancelPostForm();
  loadAdminData();
  showToast('Post published! 🚀', '✓');
};

window.openAddMemberForm = function() {
  document.getElementById('addMemberForm')?.classList.remove('hidden');
};
window.cancelAddMember = function() {
  document.getElementById('addMemberForm')?.classList.add('hidden');
};
window.addMember = function() {
  const name  = document.getElementById('am-name')?.value.trim();
  const email = document.getElementById('am-email')?.value.trim();
  const role  = document.getElementById('am-role')?.value||'member';
  if (!name||!email) { showToast('Name and email required.', '⚠️'); return; }
  const members = JSON.parse(localStorage.getItem('ccs-members')||'[]');
  if (members.find(m=>m.email===email)) { showToast('Member already exists.', '⚠️'); return; }
  members.push({ name, email, role, vip:role==='vip', joinDate:new Date().toISOString() });
  localStorage.setItem('ccs-members', JSON.stringify(members));
  cancelAddMember();
  loadAdminData();
  showToast(`${name} added!${role==='vip'?' (VIP)':''} 🎉`, '✓');
};

window.saveSettings = function() {
  const name = document.getElementById('set-displayname')?.value || 'Kongo Bonface';
  const oldPass = document.getElementById('set-oldpass')?.value;
  const newPass = document.getElementById('set-newpass')?.value;
  
  // Save settings to localStorage
  const settings = {
    agencyName: document.getElementById('set-agency')?.value || 'Casual Code Studios',
    email: document.getElementById('set-email')?.value || 'kongobonface@gmail.com',
    phone: document.getElementById('set-phone')?.value || '+254 111 760 757',
    location: document.getElementById('set-location')?.value || 'Nyeri, Kenya',
    displayName: name,
    title: document.getElementById('set-title')?.value || 'Lead Developer'
  };
  localStorage.setItem('ccs-admin-settings', JSON.stringify(settings));
  
  // Password change
  if (oldPass && newPass) {
    if (newPass.length < 6) { showToast('New password must be at least 6 characters.', '⚠️'); return; }
    showToast('Password updated! ✓', '🔐');
    document.getElementById('set-oldpass').value = '';
    document.getElementById('set-newpass').value = '';
  } else {
    showToast('Profile saved! ✓', '✓');
  }
};

window.handleAdminAvatar = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    localStorage.setItem('ccs-admin-avatar', dataUrl);
    applyAdminAvatar(dataUrl);
    showToast('Profile photo updated! 📷', '✓');
  };
  reader.readAsDataURL(file);
};

function applyAdminAvatar(dataUrl) {
  const imgs = document.querySelectorAll('#adminAvatarImg, #adminTopbarImg');
  const initials = document.querySelectorAll('#adminAvatarInitial, #adminTopbarInitial');
  if (dataUrl) {
    imgs.forEach(img => { img.src = dataUrl; img.style.display = ''; });
    initials.forEach(el => { el.style.display = 'none'; });
  } else {
    imgs.forEach(img => { img.style.display = 'none'; });
    initials.forEach(el => { el.style.display = ''; });
  }
}

window.setAdminTheme = function(color, btn) {
  // Update CSS variables
  document.documentElement.style.setProperty('--red', color);
  // Derived colors
  const hex = color.replace('#','');
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  document.documentElement.style.setProperty('--red-soft', `rgba(${r},${g},${b},0.12)`);
  document.documentElement.style.setProperty('--red-glow', `rgba(${r},${g},${b},0.35)`);
  document.documentElement.style.setProperty('--border-red', `rgba(${r},${g},${b},0.3)`);
  document.documentElement.style.setProperty('--shadow-red', `0 4px 30px rgba(${r},${g},${b},0.3)`);
  document.documentElement.style.setProperty('--accent', color);
  
  // Update active button
  document.querySelectorAll('.admin-theme-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  
  // Save
  localStorage.setItem('ccs-admin-theme-color', color);
  showToast('Theme updated! 🎨', '✓');
};

function initAdminSettings() {
  // Load saved avatar
  const savedAvatar = localStorage.getItem('ccs-admin-avatar');
  if (savedAvatar) applyAdminAvatar(savedAvatar);
  
  // Load saved theme color
  const savedColor = localStorage.getItem('ccs-admin-theme-color');
  if (savedColor) {
    const matchBtn = document.querySelector(`.admin-theme-btn[data-color="${savedColor}"]`);
    setAdminTheme(savedColor, matchBtn);
  }
  
  // Load saved settings into fields
  const settings = JSON.parse(localStorage.getItem('ccs-admin-settings') || 'null');
  if (settings) {
    if (document.getElementById('set-agency')) document.getElementById('set-agency').value = settings.agencyName || 'Casual Code Studios';
    if (document.getElementById('set-displayname')) document.getElementById('set-displayname').value = settings.displayName || 'Kongo Bonface';
    if (document.getElementById('set-title')) document.getElementById('set-title').value = settings.title || 'Lead Developer';
  }
}


// ===== VIP DASHBOARD =====
window.openVipDashboard = function() {
  const dash = document.getElementById('vipDashboard');
  if (!dash) return;
  dash.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadVipDashboard();
};

window.closeVipDashboard = function() {
  const dash = document.getElementById('vipDashboard');
  if (!dash) return;
  dash.classList.remove('open');
  document.body.style.overflow = '';
};

window.showVipPanel = function(name) {
  document.querySelectorAll('.vip-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.vip-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('vip-panel-' + name)?.classList.add('active');
  document.querySelector(`.vip-nav-btn[onclick*="${name}"]`)?.classList.add('active');
};

function loadVipDashboard() {
  const user = Auth.user;
  if (!user) return;

  // Set user info
  const nameEl = document.getElementById('vipUserName');
  if (nameEl) nameEl.textContent = user.name?.split(' ')[0] || 'Member';

  const profileName = document.getElementById('vipProfileName');
  if (profileName) profileName.textContent = user.name || 'VIP Member';
  const profileEmail = document.getElementById('vipProfileEmail');
  if (profileEmail) profileEmail.textContent = user.email || '';

  // Load saved VIP profile
  const vipProfile = JSON.parse(localStorage.getItem(`ccs-vip-profile-${user.email}`) || '{}');
  if (document.getElementById('vip-pf-name')) document.getElementById('vip-pf-name').value = vipProfile.name || user.name || '';
  if (document.getElementById('vip-pf-email')) document.getElementById('vip-pf-email').value = vipProfile.email || user.email || '';
  if (document.getElementById('vip-pf-location')) document.getElementById('vip-pf-location').value = vipProfile.location || '';
  if (document.getElementById('vip-pf-bio')) document.getElementById('vip-pf-bio').value = vipProfile.bio || '';
  if (document.getElementById('vip-pf-website')) document.getElementById('vip-pf-website').value = vipProfile.website || '';

  // Load avatar
  const savedAvatar = localStorage.getItem(`ccs-vip-avatar-${user.email}`);
  if (savedAvatar) {
    const img = document.getElementById('vipAvatarImg');
    const init = document.getElementById('vipAvatarInitial');
    if (img) { img.src = savedAvatar; img.style.display = ''; }
    if (init) init.style.display = 'none';
  } else {
    const init = document.getElementById('vipAvatarInitial');
    if (init) init.textContent = (user.name || 'V')[0].toUpperCase();
  }

  // Render posts
  renderVipPosts();
}

function renderVipPosts() {
  const allPosts = getStoredPosts ? getStoredPosts() : [];
  const overview = document.getElementById('vipOverviewPosts');
  const all = document.getElementById('vipAllPosts');
  const countEl = document.getElementById('vipPostCount');

  if (countEl) countEl.textContent = allPosts.length;

  function postCard(p) {
    return `<div class="vip-post-card" onclick="openVipArticle(${p.id})">
      <div class="vip-post-cat">${p.catLabel || p.category}</div>
      <h4>${p.title}</h4>
      <p>${p.excerpt || ''}</p>
      <div class="vip-post-meta"><span>${p.author || 'CCS Team'}</span><span>${p.readTime || '5 min read'}</span></div>
    </div>`;
  }

  if (overview) overview.innerHTML = allPosts.slice(0, 4).map(postCard).join('') || '<p style="color:var(--text-muted)">No posts yet.</p>';
  if (all) all.innerHTML = allPosts.map(postCard).join('') || '<p style="color:var(--text-muted)">No posts yet.</p>';
}

window.openVipArticle = function(id) {
  const allPosts = getStoredPosts ? getStoredPosts() : [];
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
  // Open article modal if it exists
  const modalContent = document.getElementById('articleModalContent');
  if (modalContent) {
    modalContent.innerHTML = `<h2 style="font-family:var(--font-display);font-size:28px;font-weight:800;margin-bottom:16px">${post.title}</h2>
      <p style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim);margin-bottom:24px">${post.author} · ${post.date} · ${post.readTime}</p>
      <div style="font-size:15px;line-height:1.8;color:var(--text-muted)">${post.content || post.excerpt}</div>`;
    openModal('articleModal');
    closeVipDashboard();
  }
};

window.handleVipAvatar = function(event) {
  const user = Auth.user;
  if (!user) return;
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    localStorage.setItem(`ccs-vip-avatar-${user.email}`, dataUrl);
    const img = document.getElementById('vipAvatarImg');
    const init = document.getElementById('vipAvatarInitial');
    if (img) { img.src = dataUrl; img.style.display = ''; }
    if (init) init.style.display = 'none';
    showToast('Profile photo updated! 📷', '✓');
  };
  reader.readAsDataURL(file);
};

window.saveVipProfile = function() {
  const user = Auth.user;
  if (!user) return;
  const profile = {
    name: document.getElementById('vip-pf-name')?.value || user.name,
    email: document.getElementById('vip-pf-email')?.value || user.email,
    location: document.getElementById('vip-pf-location')?.value || '',
    bio: document.getElementById('vip-pf-bio')?.value || '',
    website: document.getElementById('vip-pf-website')?.value || ''
  };
  localStorage.setItem(`ccs-vip-profile-${user.email}`, JSON.stringify(profile));
  // Update display name
  const profileName = document.getElementById('vipProfileName');
  if (profileName) profileName.textContent = profile.name;
  showToast('Profile saved! ✓', '✓');
};


// ===== SERVICE CARD TILT =====
function initTilt() {
  document.querySelectorAll('.service-card, .testi-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r=card.getBoundingClientRect();
      const x=((e.clientX-r.left)/r.width-0.5)*10;
      const y=((e.clientY-r.top)/r.height-0.5)*-10;
      card.style.transform=`translateY(-8px) rotateX(${y}deg) rotateY(${x}deg)`;
      card.style.transition='transform 0.1s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform='';
      card.style.transition='transform 0.4s ease';
    });
  });
}


// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  setupForms();
  initTilt();

  // Set active nav link
  const page = window.location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.nav-links a, .nav-drawer a, .header-nav .nav-link, .sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href')||'';
    if (href===page || (page===''&&href==='index.html')) a.classList.add('active');
  });

  // Typing effects
  initTyping('typingHero', ['Web Development Agency','Frontend Specialists','E-Commerce Experts','Design & Redesign','AI-Powered Builds','Teaching HTML & CSS']);
  initTyping('typingAbout', ['Edgar Karori, Founder','Frontend Developer','Designer & Dreamer','Proud Kenyan 🇰🇪']);

  // Logout buttons
  document.querySelectorAll('.logout-btn, #userBtnWrap .btn-logout').forEach(btn => {
    btn.addEventListener('click', () => { Auth.logout(); updateAuthUI(); showToast('Logged out. See you! 👋','👋'); });
  });
  document.querySelectorAll('.admin-logout-btn').forEach(btn => {
    btn.addEventListener('click', () => { Auth.logoutAdmin(); window.location.href='index.html'; });
  });

  // Blog category filter
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderPosts(btn.dataset.cat);
    });
  });

  // Render blog posts if on blog page
  if (document.getElementById('postsGrid')) renderPosts();

  // Admin: check if already logged in
  if (document.getElementById('adminLoginScreen')) {
    if (Auth.isAdmin) {
      document.getElementById('adminLoginScreen').classList.add('hidden');
      document.getElementById('adminDashboard').classList.remove('hidden');
      loadAdminData();
    }
    // Initialize admin settings (avatar, theme)
    initAdminSettings();
  }

  // Show VIP dashboard button if VIP logged in
  document.querySelectorAll('.btn-vip-dash').forEach(btn => {
    btn.style.display = Auth.isVip ? '' : 'none';
  });

  // Save contact/hire inquiries to localStorage
  document.getElementById('contactForm')?.addEventListener('submit', e => {
    const data = new FormData(e.target);
    const inquiry = { name:data.get('name'), email:data.get('email'), service:data.get('type'), message:data.get('message'), date:new Date().toISOString() };
    const inquiries = JSON.parse(localStorage.getItem('ccs-inquiries')||'[]');
    inquiries.push(inquiry);
    localStorage.setItem('ccs-inquiries', JSON.stringify(inquiries));
  });
  document.getElementById('hireForm')?.addEventListener('submit', e => {
    const data = new FormData(e.target);
    const inquiry = { name:data.get('name'), email:data.get('contact'), service:data.get('service'), message:data.get('brief'), date:new Date().toISOString() };
    const inquiries = JSON.parse(localStorage.getItem('ccs-inquiries')||'[]');
    inquiries.push(inquiry);
    localStorage.setItem('ccs-inquiries', JSON.stringify(inquiries));
  });
});
