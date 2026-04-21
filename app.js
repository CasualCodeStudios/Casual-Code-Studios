/* ============================================================
   CASUAL CODE STUDIOS — UNIFIED APP JS (v2.0)
   Pages: index.html, about.html, blog.html, admin.html, course.html
   
   ── HOW BACKEND CONNECTION WORKS ─────────────────────────────
   This file communicates with api/index.php via fetch() calls.
   Every form submission, login, register, and admin action
   sends a POST request to api/index.php with a JSON body:
   
     { "action": "action_name", ...other fields }
   
   Authenticated requests include a Bearer token in the header:
   
     Authorization: Bearer <token-from-localStorage>
   
   The token is stored in localStorage as 'ccs-token'.
   
   Helper function: apiCall(action, data) — see Section 2.
   ============================================================ */

'use strict';

/* ============================================================
   SECTION 1: THEME TOGGLE
   Runs immediately to prevent flash of wrong theme.
   ============================================================ */
(function() {
  const saved = localStorage.getItem('ccs-theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light-mode');
})();

function applyTheme() {
  const isDark = !document.body.classList.contains('light-mode');
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const icon = btn.querySelector('.theme-icon') || btn;
    if (icon.tagName === 'IMG') {
      icon.src = isDark ? 'happy-sun.png' : 'full-moon.png';
      icon.alt = isDark ? 'Sun icon' : 'Moon icon';
    } else if (icon.classList && icon.classList.contains('theme-icon')) {
      icon.textContent = isDark ? '🌙' : '☀️';
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


/* ============================================================
   SECTION 2: BACKEND API CLIENT
   ── Central fetch wrapper that talks to api/index.php ──
   
   USAGE:
     const res = await apiCall('login', { email, password });
     if (res.success) { ... }
   
   TOKEN HANDLING:
     If a user/admin token exists in localStorage ('ccs-token'),
     it is automatically sent as Authorization: Bearer <token>.
   ============================================================ */

const API_URL = 'api/index.php'; // Path to PHP backend

async function apiCall(action, data = {}, useAdminToken = false) {
  /* Determine which token to send.
   * Regular users use 'ccs-token', admin uses 'ccs-admin-token'. */
  const tokenKey = useAdminToken ? 'ccs-admin-token' : 'ccs-token';
  const token    = localStorage.getItem(tokenKey);

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(API_URL, {
      method:  'POST',
      headers: headers,
      body:    JSON.stringify({ action, ...data })
    });

    const json = await response.json();
    return json;                              // { success, ...data } or { success: false, error }
  } catch (err) {
    console.error('[CCS API] Network/fetch error:', err);
    return { success: false, error: 'Network error — could not reach server.' };
  }
}
window.apiCall = apiCall;


/* ============================================================
   SECTION 3: AUTH SYSTEM
   ── Handles login, register, logout, VIP codes ──
   
   TOKEN FLOW:
   1. User submits login/register form
   2. apiCall sends credentials to api/index.php
   3. PHP verifies, creates a DB session, returns { token, user }
   4. Token stored in localStorage as 'ccs-token'
   5. User object stored as 'ccs-user' (JSON)
   6. All subsequent requests include Authorization: Bearer <token>
   
   FALLBACK (offline/no PHP):
   If the API call fails, the system falls back to localStorage-only
   mode (original behaviour) so the site works without a server.
   ============================================================ */

const Auth = {
  key:      'ccs-user',
  tokenKey: 'ccs-token',
  adminKey: 'ccs-admin',
  adminTokenKey: 'ccs-admin-token',

  /* Returns the stored user object or null */
  get user()      { return JSON.parse(localStorage.getItem(this.key) || 'null'); },
  get token()     { return localStorage.getItem(this.tokenKey); },
  get isLoggedIn(){ return !!this.user; },
  get isAdmin()   { return !!localStorage.getItem(this.adminTokenKey) || !!JSON.parse(localStorage.getItem(this.adminKey)||'null'); },
  get isVip()     { return this.user && (this.user.vip || this.user.role === 'vip'); },
  get hasCourseAccess() { return this.isAdmin || this.isVip || (this.user && this.user.course_access); },

  /* ── LOGIN ──
   * Tries PHP backend first, falls back to localStorage on failure.
   * On success: stores { token, user } in localStorage. */
  async login(email, password) {
    // Try PHP backend first
    const res = await apiCall('login', { email, password });

    if (res.success) {
      // BACKEND SUCCESS: store server-issued token and user
      localStorage.setItem(this.tokenKey, res.token);
      localStorage.setItem(this.key, JSON.stringify(res.user));
      return true;
    }

    // FALLBACK: localStorage-only (no server)
    if (res.error && res.error.includes('Network')) {
      const users = JSON.parse(localStorage.getItem('ccs-users') || '[]');
      const found = users.find(u => u.email === email && u.password === password);
      if (found) {
        localStorage.setItem(this.key, JSON.stringify(found));
        return true;
      }
      // Demo mode — accept any valid email+pass
      if (email && password.length >= 6) {
        const u = { id: Date.now(), email, name: email.split('@')[0], vip: false, role: 'member' };
        localStorage.setItem(this.key, JSON.stringify(u));
        return true;
      }
    }

    return res.error || false;
  },

  /* ── REGISTER ──
   * Sends to PHP, falls back to localStorage. */
  async register(email, password, name) {
    const res = await apiCall('register', { name, email, password });

    if (res.success) {
      localStorage.setItem(this.tokenKey, res.token);
      localStorage.setItem(this.key, JSON.stringify(res.user));
      // Also sync to localStorage users list (for offline fallback)
      this._syncLocalUser(res.user);
      return true;
    }

    // Fallback
    if (res.error && res.error.includes('Network')) {
      const users = JSON.parse(localStorage.getItem('ccs-users') || '[]');
      if (users.find(u => u.email === email)) return 'exists';
      const u = { id: Date.now(), email, name, password, vip: false, role: 'member', joinDate: new Date().toISOString() };
      users.push(u);
      localStorage.setItem('ccs-users', JSON.stringify(users));
      localStorage.setItem(this.key, JSON.stringify(u));
      return true;
    }

    return res.error || false;
  },

  /* ── VIP CODE ──
   * Sends code to PHP; marks user as VIP on success. */
  async applyVipCode(code) {
    const res = await apiCall('apply_vip_code', { code });

    if (res.success) {
      const user = this.user;
      if (user) { user.vip = true; user.role = 'vip'; localStorage.setItem(this.key, JSON.stringify(user)); }
      return true;
    }

    // Fallback: built-in codes
    if (res.error && res.error.includes('Network')) {
      const builtin = ['VIP2026', 'CCSEXCL', 'PREMIUM1'];
      if (builtin.includes(code.toUpperCase())) {
        const u = this.user || { id: Date.now(), name:'VIP Member', email:'', vip:true, role:'vip' };
        u.vip = true; u.role = 'vip';
        localStorage.setItem(this.key, JSON.stringify(u));
        return true;
      }
    }

    return false;
  },

  /* ── ADMIN LOGIN ──
   * Sends credentials; stores admin token separately. */
  async loginAdmin(email, password) {
    const res = await apiCall('admin_login', { email, password });

    if (res.success) {
      // Store admin token under a different key to avoid conflicts with user token
      localStorage.setItem(this.adminTokenKey, res.token);
      localStorage.setItem(this.adminKey, JSON.stringify({ role: 'admin', email }));
      return true;
    }

    // Fallback: hardcoded credentials
    if (res.error && res.error.includes('Network')) {
      if ((email === 'admin@lamine.kidd' && password === 'ccs.lamine.94') || password === 'CCS@admin2026') {
        localStorage.setItem(this.adminKey, JSON.stringify({ role: 'admin', email }));
        return true;
      }
    }

    return false;
  },

  /* ── LOGOUT ──
   * Tells PHP to invalidate the session, then clears localStorage. */
  async logout() {
    await apiCall('logout'); // Invalidate server-side session
    localStorage.removeItem(this.key);
    localStorage.removeItem(this.tokenKey);
  },

  async logoutAdmin() {
    // Use admin token for logout
    const token = localStorage.getItem(this.adminTokenKey);
    if (token) {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'logout' })
      }).catch(() => {});
    }
    localStorage.removeItem(this.adminKey);
    localStorage.removeItem(this.adminTokenKey);
  },

  /* Sync a user to the local users list (offline fallback) */
  _syncLocalUser(user) {
    const users = JSON.parse(localStorage.getItem('ccs-users') || '[]');
    if (!users.find(u => u.email === user.email)) {
      users.push({ ...user, joinDate: new Date().toISOString() });
      localStorage.setItem('ccs-users', JSON.stringify(users));
    }
  }
};
window.Auth = Auth;


/* ============================================================
   SECTION 4: AUTH UI UPDATER
   Runs on every page load and after login/logout.
   ============================================================ */

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
  names.forEach(el     => { if (Auth.user) el.textContent = Auth.user.name; });

  if (authWrap && userWrap) {
    if (Auth.isLoggedIn) {
      authWrap.classList.add('hidden');
      userWrap.classList.remove('hidden');
      if (userGreet && Auth.user) userGreet.innerHTML = `Hey, <strong>${Auth.user.name.split(' ')[0]}</strong>`;
    } else {
      authWrap.classList.remove('hidden');
      userWrap.classList.add('hidden');
    }
  }

  document.querySelectorAll('.btn-vip-dash').forEach(btn => {
    btn.style.display = Auth.isVip ? '' : 'none';
  });

  if (typeof renderPosts === 'function') renderPosts(window._currentBlogCat || 'all');
}
window.updateAuthUI = updateAuthUI;


/* ============================================================
   SECTION 5: FORM SETUP
   All form submissions are routed to the PHP backend.
   ── Connection map ──
   loginForm    → apiCall('login')          → api/index.php
   registerForm → apiCall('register')       → api/index.php
   vipCodeForm  → apiCall('apply_vip_code') → api/index.php
   hireForm     → apiCall('submit_inquiry') → api/index.php
   contactForm  → apiCall('submit_inquiry') → api/index.php
   ============================================================ */

function setupForms() {
  // ── Tab switching for login modal ──
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  // ── LOGIN FORM → api/index.php action=login ──
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = loginForm.querySelector('[name="email"]').value.trim();
      const pass  = loginForm.querySelector('[name="password"]').value;
      const btn   = loginForm.querySelector('[type="submit"]');

      btn.textContent = 'Signing in…';
      btn.disabled = true;

      const result = await Auth.login(email, pass);

      btn.disabled = false;
      btn.textContent = 'Sign In';

      if (result === true) {
        closeModal('loginModal');
        updateAuthUI();
        showToast(`Welcome back! 👋`, '✓');
      } else {
        showToast(typeof result === 'string' ? result : 'Invalid email or password.', '❌');
      }
    });
  }

  // ── REGISTER FORM → api/index.php action=register ──
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name  = registerForm.querySelector('[name="name"]').value.trim();
      const email = registerForm.querySelector('[name="email"]').value.trim();
      const pass  = registerForm.querySelector('[name="password"]').value;
      const btn   = registerForm.querySelector('[type="submit"]');

      btn.textContent = 'Creating account…';
      btn.disabled = true;

      const result = await Auth.register(email, pass, name);

      btn.disabled = false;
      btn.textContent = 'Create Account 🎉';

      if (result === true) {
        closeModal('loginModal');
        updateAuthUI();
        showToast(`Welcome to CCS, ${name}! 🎉`, '🚀');
      } else if (result === 'exists') {
        showToast('An account with this email already exists.', '⚠️');
      } else {
        showToast(typeof result === 'string' ? result : 'Registration failed. Please try again.', '❌');
      }
    });
  }

  // ── VIP CODE FORM → api/index.php action=apply_vip_code ──
  const vipForm = document.getElementById('vipCodeForm');
  if (vipForm) {
    vipForm.addEventListener('submit', async e => {
      e.preventDefault();
      const code = vipForm.querySelector('[name="vipCode"]').value.trim().toUpperCase();
      const btn  = vipForm.querySelector('[type="submit"]');

      if (!Auth.isLoggedIn) {
        showToast('Please log in first to apply a VIP code.', '⚠️');
        return;
      }

      btn.textContent = 'Activating…';
      btn.disabled = true;

      const result = await Auth.applyVipCode(code);

      btn.disabled = false;
      btn.textContent = '⭐ Activate VIP';

      if (result) {
        closeModal('loginModal');
        updateAuthUI();
        showToast('VIP access activated! Welcome, insider. ⭐', '⭐');
      } else {
        showToast('Invalid or already used VIP code.', '❌');
      }
    });
  }

  // ── HIRE / INQUIRY FORM → api/index.php action=submit_inquiry ──
  const hireForm = document.getElementById('hireForm');
  if (hireForm) {
    hireForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(e.target);
      const btn  = hireForm.querySelector('[type="submit"]');
      btn.textContent = 'Sending…';
      btn.disabled = true;

      const res = await apiCall('submit_inquiry', {
        name:    data.get('name'),
        contact: data.get('contact'),
        service: data.get('service'),
        message: data.get('brief')
      });

      btn.disabled = false;
      btn.textContent = 'Send Enquiry →';

      if (res.success) {
        closeModal('hireModal');
        showToast(res.message || 'Enquiry sent! We\'ll be in touch. 🚀', '✓');
        hireForm.reset();
      } else {
        showToast(res.error || 'Could not send. Please try WhatsApp instead.', '❌');
      }
    });
  }

  // ── CONTACT FORM → api/index.php action=submit_inquiry ──
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(e.target);
      const btn  = contactForm.querySelector('[type="submit"]');
      btn.textContent = 'Sending…';
      btn.disabled = true;

      const res = await apiCall('submit_inquiry', {
        name:    data.get('name'),
        contact: data.get('email'),
        service: data.get('type'),
        message: data.get('message')
      });

      btn.disabled = false;
      btn.textContent = 'Send Message →';

      if (res.success) {
        showToast('Message sent! 🚀', '✓');
        contactForm.reset();
      } else {
        showToast(res.error || 'Could not send. Please use WhatsApp.', '❌');
      }
    });
  }
}


/* ============================================================
   SECTION 6: BLOG POST RENDERING
   ── Fetches posts from PHP backend, falls back to localStorage ──
   Connection: renderPosts() → apiCall('get_posts') → api/index.php
   ============================================================ */

async function getStoredPosts() {
  const res = await apiCall('get_posts', { category: 'all' });

  if (res.success && res.posts) return res.posts;

  // Fallback: localStorage posts
  return JSON.parse(localStorage.getItem('ccs-posts') || '[]');
}
window.getStoredPosts = getStoredPosts;

window.renderPosts = async function(cat = 'all') {
  window._currentBlogCat = cat;
  const grid = document.getElementById('postsGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="color:var(--text-muted);padding:40px;text-align:center">Loading posts…</div>';

  let posts = await getStoredPosts();
  if (cat !== 'all') posts = posts.filter(p => p.category === cat);

  if (!posts.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:40px;text-align:center">No posts yet.</p>';
    return;
  }

  const catColors = { tutorial:'#e63946', showcase:'#3b82f6', news:'#10b981', beforeafter:'#8b5cf6' };

  grid.innerHTML = posts.map(post => {
    const locked = post.locked && !Auth.isLoggedIn;
    return `
      <article class="post-card ${locked ? 'locked' : ''}" onclick="openPost(${post.id || post.id})" style="cursor:pointer">
        <div class="post-cat-tag" style="background:${catColors[post.category]||'#e63946'}22;color:${catColors[post.category]||'#e63946'};border:1px solid ${catColors[post.category]||'#e63946'}44">${post.cat_label || post.catLabel || post.category}</div>
        <h3 class="post-title">${post.title}</h3>
        <p class="post-excerpt">${post.excerpt}</p>
        <div class="post-meta"><span>${post.author || 'CCS Team'}</span><span>${post.read_time || post.readTime || '5 min read'}</span></div>
        ${locked ? '<div class="post-lock">🔐 Members Only — <button onclick="event.stopPropagation();openModal(\'loginModal\')" class="btn-inline">Join Free</button></div>' : ''}
      </article>`;
  }).join('');
};

window.openPost = async function(id) {
  const posts = await getStoredPosts();
  const post  = posts.find(p => String(p.id) === String(id));
  if (!post) return;

  if (post.locked && !Auth.isLoggedIn) {
    openModal('loginModal');
    return;
  }

  const mc = document.getElementById('articleModalContent');
  if (mc) {
    mc.innerHTML = `
      <h2 style="font-family:var(--font-display);font-size:28px;font-weight:800;margin-bottom:12px">${post.title}</h2>
      <p style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);margin-bottom:24px">${post.author || 'CCS Team'} · ${new Date(post.date || post.created).toLocaleDateString()} · ${post.read_time || post.readTime || '5 min read'}</p>
      <div style="font-size:15px;line-height:1.9;color:var(--text-base)">${post.content || post.excerpt}</div>`;
    openModal('articleModal');
  }
};


/* ============================================================
   SECTION 7: ADMIN DASHBOARD
   ── All admin functions now call the PHP backend ──
   
   Connection pattern:
   loadAdminData()       → apiCall('get_stats', {}, true)   → api/index.php
   loadMembersList()     → apiCall('get_members', {}, true)  → api/index.php
   makeVipAdmin(id)      → apiCall('make_vip', {}, true)     → api/index.php
   removeMemberAdmin(id) → apiCall('remove_member', {}, true)→ api/index.php
   savePost()            → apiCall('save_post', {}, true)    → api/index.php
   generateVipCode()     → apiCall('generate_vip_code',true) → api/index.php
   
   NOTE: All admin calls pass useAdminToken=true so the
   Authorization header uses 'ccs-admin-token'.
   ============================================================ */

/* Admin panel navigation */
window.showPanel = function(name) {
  document.querySelectorAll('.adm-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.remove('hidden');
  const btn = document.querySelector(`.adm-nav-btn[onclick*="'${name}'"]`);
  if (btn) btn.classList.add('active');
  const titles = { overview:'Overview', posts:'Blog Posts', members:'Members', vip:'VIP Members', inquiries:'Inquiries', settings:'Settings', courses:'Course Access' };
  const subs   = { overview:'Welcome back, Admin 🎯', posts:'Manage blog content', members:'Manage community members', vip:'VIP codes & members', inquiries:'Client enquiries', settings:'Admin preferences', courses:'HTML Course Access Control' };
  document.getElementById('panelTitle').textContent = titles[name] || name;
  document.getElementById('panelSub').textContent   = subs[name]   || '';

  // Load fresh data when switching panels
  if (name === 'overview') loadAdminData();
  if (name === 'members')  loadMembersList();
  if (name === 'courses')  loadCourseAccessPanel();
};

/* Load all admin overview data from PHP backend */
async function loadAdminData() {
  /* ── BACKEND CALL ──
   * GET /api/index.php { action: 'get_stats' }
   * Authorization: Bearer <admin-token>
   * Returns aggregated counts + recent items */
  const res = await apiCall('get_stats', {}, true);

  if (res.success) {
    // Update stat counters
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('totalMembers',   res.stats.total_members);
    setEl('totalVip',       res.stats.total_vip);
    setEl('totalPosts',     res.stats.total_posts);
    setEl('totalInquiries', res.stats.total_inquiries);
    setEl('postCount',      res.stats.total_posts);
    setEl('memberCount',    res.stats.total_members);
    setEl('inquiryCount',   res.stats.total_inquiries);
    setEl('vipCount',       res.stats.total_vip);

    // Recent members list
    const membersEl = document.getElementById('recentMembers');
    if (membersEl) {
      membersEl.innerHTML = res.stats.recent_members.map(m =>
        `<div class="adm-list-item"><span>${m.name}</span><span style="color:var(--text-muted);font-size:12px">${m.email}</span></div>`
      ).join('') || '<p style="color:var(--text-muted);padding:20px;text-align:center">No members yet.</p>';
    }

    // Recent inquiries
    const inqEl = document.getElementById('recentInquiries');
    if (inqEl) {
      inqEl.innerHTML = res.stats.recent_inquiries.map(i =>
        `<div class="adm-list-item"><span>${i.name}</span><span style="color:var(--text-muted);font-size:12px">${i.service || 'General'}</span></div>`
      ).join('') || '<p style="color:var(--text-muted);padding:20px;text-align:center">No inquiries yet.</p>';
    }
  } else {
    // Fallback: read from localStorage (offline mode)
    _loadAdminDataFromLocalStorage();
  }

  // Also load posts and VIP data
  await loadPostsList();
  await loadVipPanel();
  await loadInquiriesList();
}

/* Fallback: load stats from localStorage when PHP not available */
function _loadAdminDataFromLocalStorage() {
  const members   = JSON.parse(localStorage.getItem('ccs-members') || '[]');
  const posts     = JSON.parse(localStorage.getItem('ccs-posts')   || '[]');
  const inquiries = JSON.parse(localStorage.getItem('ccs-inquiries')|| '[]');
  const codes     = JSON.parse(localStorage.getItem('ccs-vip-codes')|| '[]');
  const vipCount  = members.filter(m => m.vip || m.role === 'vip').length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('totalMembers',   members.length);
  setEl('totalVip',       vipCount);
  setEl('totalPosts',     posts.length);
  setEl('totalInquiries', inquiries.length);
  setEl('postCount',      posts.length);
  setEl('memberCount',    members.length);
  setEl('inquiryCount',   inquiries.length);
  setEl('vipCount',       vipCount);
}

/* Load and render posts list in admin panel */
async function loadPostsList() {
  /* ── BACKEND CALL ──
   * GET /api/index.php { action: 'get_posts', category: 'all' }
   * Authorization: Bearer <admin-token> */
  const postsEl = document.getElementById('postsList');
  if (!postsEl) return;

  const res = await apiCall('get_posts', { category: 'all' }, true);
  const posts = res.success ? res.posts : JSON.parse(localStorage.getItem('ccs-posts') || '[]');

  if (!posts.length) {
    postsEl.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center">No posts yet. Create your first post! ✍️</p>';
    return;
  }

  postsEl.innerHTML = `
    <table class="adm-table">
      <thead><tr><th>Title</th><th>Category</th><th>Access</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        ${posts.map(p => `
          <tr>
            <td>${p.title}</td>
            <td><span class="item-badge">${p.cat_label || p.catLabel || p.category}</span></td>
            <td><span class="item-badge ${p.access === 'public' ? 'badge-public' : 'badge-member'}">${p.access === 'public' ? '🌐 Public' : '🔐 Members'}</span></td>
            <td>${new Date(p.created || p.date).toLocaleDateString()}</td>
            <td><button class="tbl-action danger" onclick="deletePost(${p.id})">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/* Load members list in admin panel */
async function loadMembersList() {
  const container = document.getElementById('membersList');
  if (!container) return;

  /* ── BACKEND CALL ──
   * GET /api/index.php { action: 'get_members' }
   * Authorization: Bearer <admin-token> */
  const res = await apiCall('get_members', {}, true);
  const members = res.success ? res.members : JSON.parse(localStorage.getItem('ccs-members') || '[]');

  if (!members.length) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center">No members yet.</p>';
    return;
  }

  container.innerHTML = `
    <table class="adm-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>
        ${members.map(m => `
          <tr>
            <td>${m.name}</td>
            <td>${m.email || '—'}</td>
            <td><span class="item-badge ${(m.vip || m.role === 'vip') ? 'badge-vip' : 'badge-member'}">${(m.vip || m.role === 'vip') ? '⭐ VIP' : 'Member'}</span></td>
            <td>${m.join_date || m.joinDate ? new Date(m.join_date || m.joinDate).toLocaleDateString() : '—'}</td>
            <td>
              ${!(m.vip || m.role === 'vip') ? `<button class="tbl-action" onclick="makeVipAdmin(${m.id})">Make VIP</button>` : ''}
              <button class="tbl-action danger" onclick="removeMemberAdmin(${m.id})">Remove</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  const countEl = document.getElementById('memberCount');
  if (countEl) countEl.textContent = members.length;
}

/* Make a member VIP */
window.makeVipAdmin = async function(id) {
  /* ── BACKEND CALL ──
   * POST /api/index.php { action: 'make_vip', user_id: id }
   * Authorization: Bearer <admin-token> */
  const res = await apiCall('make_vip', { user_id: id }, true);
  if (res.success) {
    loadMembersList();
    loadAdminData();
    showToast('Member upgraded to VIP! ⭐');
  } else {
    showToast(res.error || 'Failed to upgrade member.', '❌');
  }
};

/* Remove a member */
window.removeMemberAdmin = async function(id) {
  if (!confirm('Remove this member? This cannot be undone.')) return;
  /* ── BACKEND CALL ──
   * POST /api/index.php { action: 'remove_member', user_id: id } */
  const res = await apiCall('remove_member', { user_id: id }, true);
  if (res.success) {
    loadMembersList();
    loadAdminData();
    showToast('Member removed.', '🗑️');
  }
};

/* Load VIP panel */
async function loadVipPanel() {
  /* ── BACKEND CALL ──
   * POST /api/index.php { action: 'get_vip_codes' } */
  const codesRes = await apiCall('get_vip_codes', {}, true);
  const codes = codesRes.success ? codesRes.codes : JSON.parse(localStorage.getItem('ccs-vip-codes') || '[]');

  const codesEl = document.getElementById('vipCodesList');
  if (codesEl) {
    codesEl.innerHTML = codes.length
      ? codes.map(c => `
          <div class="vip-code-item">
            <span class="vip-code">${c.code}</span>
            <span class="vip-status ${c.used ? 'vip-used' : ''}">${c.used ? '✓ Used' : 'Available'}</span>
            <button class="tbl-action danger" onclick="deleteVipCode('${c.code}')">Delete</button>
          </div>`).join('')
      : '<p style="color:var(--text-muted);padding:20px;text-align:center">No VIP codes yet. Generate one!</p>';
  }

  const membersRes = await apiCall('get_members', {}, true);
  const vipMembers = membersRes.success
    ? membersRes.members.filter(m => m.vip || m.role === 'vip')
    : JSON.parse(localStorage.getItem('ccs-members') || '[]').filter(m => m.vip || m.role === 'vip');

  const vipEl = document.getElementById('vipMembersList');
  if (vipEl) {
    vipEl.innerHTML = vipMembers.length
      ? `<table class="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead><tbody>
          ${vipMembers.map(m => `<tr><td>${m.name}</td><td>${m.email || '—'}</td><td>${m.join_date ? new Date(m.join_date).toLocaleDateString() : '—'}</td></tr>`).join('')}
         </tbody></table>`
      : '<p style="color:var(--text-muted);padding:20px;text-align:center">No VIP members yet.</p>';
  }

  const countEl = document.getElementById('vipCount');
  if (countEl) countEl.textContent = vipMembers.length;
}

/* Load inquiries */
async function loadInquiriesList() {
  const container = document.getElementById('inquiriesList');
  if (!container) return;

  /* ── BACKEND CALL ── */
  const res = await apiCall('get_inquiries', {}, true);
  const inquiries = res.success ? res.inquiries : JSON.parse(localStorage.getItem('ccs-inquiries') || '[]');

  container.innerHTML = inquiries.length
    ? `<table class="adm-table">
        <thead><tr><th>Name</th><th>Contact</th><th>Service</th><th>Message</th><th>Date</th></tr></thead>
        <tbody>
          ${inquiries.map(q => `
            <tr>
              <td>${q.name || '—'}</td>
              <td>${q.contact || q.email || '—'}</td>
              <td>${q.service || '—'}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.message || q.brief || '—'}</td>
              <td>${q.date ? new Date(q.date).toLocaleDateString() : '—'}</td>
            </tr>`).join('')}
        </tbody>
       </table>`
    : '<p style="color:var(--text-muted);padding:20px;text-align:center">No inquiries yet.</p>';

  const countEl = document.getElementById('inquiryCount');
  if (countEl) countEl.textContent = inquiries.length;
}

/* Generate VIP code */
window.generateVipCode = async function() {
  /* ── BACKEND CALL ──
   * POST /api/index.php { action: 'generate_vip_code' } */
  const res = await apiCall('generate_vip_code', {}, true);
  if (res.success) {
    loadVipPanel();
    showToast(`VIP Code: ${res.code}`, '⭐');
  } else {
    // Fallback: generate locally
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code  = 'VIP' + Array.from({ length: 5 }, () => chars[Math.random() * chars.length | 0]).join('');
    const codes = JSON.parse(localStorage.getItem('ccs-vip-codes') || '[]');
    codes.push({ code, used: false, created: new Date().toISOString() });
    localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
    loadVipPanel();
    showToast(`VIP Code: ${code}`, '⭐');
  }
};

window.deleteVipCode = async function(code) {
  /* ── BACKEND CALL ── */
  const res = await apiCall('delete_vip_code', { code }, true);
  if (res.success || res.error) { // even if backend fails, remove locally
    const codes = JSON.parse(localStorage.getItem('ccs-vip-codes') || '[]').filter(c => c.code !== code);
    localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
    loadVipPanel();
    showToast('Code deleted.', '🗑️');
  }
};

/* Save a post */
window.savePost = async function() {
  const title    = document.getElementById('pf-title')?.value.trim();
  const cat      = document.getElementById('pf-cat')?.value;
  const excerpt  = document.getElementById('pf-excerpt')?.value.trim();
  const content  = document.getElementById('pf-content')?.value.trim();
  const author   = document.getElementById('pf-author')?.value.trim() || 'CCS Team';
  const access   = document.getElementById('pf-access')?.value || 'members';
  const tags     = document.getElementById('pf-tags')?.value || '';
  const readTime = document.getElementById('pf-readtime')?.value || '5 min read';
  const catLabels = { tutorial: 'Tutorial', showcase: 'Showcase', news: 'Dev News', beforeafter: 'Before & After' };

  if (!title || !cat) { showToast('Title and category required.', '⚠️'); return; }

  /* ── BACKEND CALL ──
   * POST /api/index.php { action: 'save_post', ...fields } */
  const res = await apiCall('save_post', {
    title, excerpt, content, category: cat,
    cat_label: catLabels[cat] || cat,
    tags, author, access, read_time: readTime
  }, true);

  if (res.success) {
    // Also save to localStorage as fallback cache
    const post = { id: Date.now(), title, excerpt, content, category: cat, catLabel: catLabels[cat] || cat,
                   author, date: new Date().toISOString(), readTime, access, tags };
    const posts = JSON.parse(localStorage.getItem('ccs-posts') || '[]');
    posts.unshift(post);
    localStorage.setItem('ccs-posts', JSON.stringify(posts));
  }

  cancelPostForm();
  loadAdminData();
  showToast('Post published! 🚀', '✓');
};

/* Delete a post */
window.deletePost = async function(id) {
  if (!confirm('Delete this post?')) return;
  /* ── BACKEND CALL ── */
  await apiCall('delete_post', { id }, true);
  const posts = JSON.parse(localStorage.getItem('ccs-posts') || '[]').filter(p => p.id !== id);
  localStorage.setItem('ccs-posts', JSON.stringify(posts));
  loadAdminData();
  showToast('Post deleted.', '🗑️');
};

/* Open/cancel post form */
window.openNewPostForm = function() {
  document.getElementById('newPostForm')?.classList.remove('hidden');
  document.getElementById('postFormTitle').textContent = 'Create New Post';
};
window.cancelPostForm = function() {
  document.getElementById('newPostForm')?.classList.add('hidden');
};

/* Open/cancel add member form */
window.openAddMemberForm = function() { document.getElementById('addMemberForm')?.classList.remove('hidden'); };
window.cancelAddMember   = function() { document.getElementById('addMemberForm')?.classList.add('hidden'); };

/* Add member manually from admin panel */
window.addMember = async function() {
  const name  = document.getElementById('am-name')?.value.trim();
  const email = document.getElementById('am-email')?.value.trim();
  const role  = document.getElementById('am-role')?.value || 'member';

  if (!name || !email) { showToast('Name and email required.', '⚠️'); return; }

  /* ── BACKEND CALL ── */
  const res = await apiCall('add_member', { name, email, role }, true);
  if (res.success) {
    // Save to localStorage fallback too
    const members = JSON.parse(localStorage.getItem('ccs-members') || '[]');
    if (!members.find(m => m.email === email)) {
      members.push({ name, email, role, vip: role === 'vip', joinDate: new Date().toISOString() });
      localStorage.setItem('ccs-members', JSON.stringify(members));
    }
    cancelAddMember();
    loadAdminData();
    showToast(`${name} added! ${res.temp_password ? 'Temp pass: ' + res.temp_password : ''} 🎉`, '✓');
  } else {
    showToast(res.error || 'Failed to add member.', '❌');
  }
};

/* Save admin settings */
window.saveSettings = async function() {
  const displayName = document.getElementById('set-displayname')?.value || 'Kongo Bonface';
  const oldPass     = document.getElementById('set-oldpass')?.value;
  const newPass     = document.getElementById('set-newpass')?.value;

  /* ── BACKEND CALL ── */
  const res = await apiCall('save_settings', {
    display_name: displayName,
    old_password: oldPass,
    new_password: newPass
  }, true);

  if (res.success) {
    showToast(res.message || 'Settings saved! ✓', '✓');
    if (oldPass) {
      document.getElementById('set-oldpass').value = '';
      document.getElementById('set-newpass').value = '';
    }
  } else {
    showToast(res.error || 'Failed to save settings.', '❌');
  }
};


/* ============================================================
   SECTION 8: COURSE ACCESS MANAGEMENT (Admin Panel)
   ── Admin grants/revokes access to the HTML course ──
   
   Connection: 
   loadCourseAccessPanel() → apiCall('get_course_access_list', {}, true)
   grantAccess(email)      → apiCall('grant_course_access', { user_email }, true)
   revokeAccess(email)     → apiCall('revoke_course_access', { user_email }, true)
   ============================================================ */

async function loadCourseAccessPanel() {
  const panel = document.getElementById('panel-courses');
  if (!panel) return;

  /* ── BACKEND CALL ── */
  const res = await apiCall('get_course_access_list', {}, true);
  const list = res.success ? res.list : [];

  const listEl = document.getElementById('courseAccessList');
  if (listEl) {
    listEl.innerHTML = list.length
      ? `<table class="adm-table">
          <thead><tr><th>Name</th><th>Email</th><th>Granted</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(item => `
              <tr>
                <td>${item.name || '—'}</td>
                <td>${item.user_email}</td>
                <td>${new Date(item.granted_at).toLocaleDateString()}</td>
                <td><button class="tbl-action danger" onclick="revokeCourseAccess('${item.user_email}')">Revoke</button></td>
              </tr>`).join('')}
          </tbody>
         </table>`
      : '<p style="color:var(--text-muted);padding:20px;text-align:center">No course access granted yet.</p>';
  }
}

window.grantCourseAccess = async function() {
  const emailEl = document.getElementById('course-grant-email');
  const email   = emailEl?.value.trim().toLowerCase();
  if (!email) { showToast('Enter a member email to grant access.', '⚠️'); return; }

  /* ── BACKEND CALL ── */
  const res = await apiCall('grant_course_access', { user_email: email }, true);
  if (res.success) {
    if (emailEl) emailEl.value = '';
    loadCourseAccessPanel();
    showToast(`Course access granted to ${email}! 🎓`, '✓');
  } else {
    showToast(res.error || 'Failed to grant access.', '❌');
  }
};

window.revokeCourseAccess = async function(email) {
  if (!confirm(`Revoke course access for ${email}?`)) return;
  /* ── BACKEND CALL ── */
  await apiCall('revoke_course_access', { user_email: email }, true);
  loadCourseAccessPanel();
  showToast('Access revoked.', '🗑️');
};


/* ============================================================
   SECTION 9: ADMIN LOGIN / LOGOUT
   ── Admin credentials sent to PHP, token stored ──
   ============================================================ */

window.adminLogin = async function() {
  const email = document.getElementById('adm-email')?.value.trim();
  const pass  = document.getElementById('adm-pass')?.value;
  const errEl = document.getElementById('adm-error');
  const btn   = document.querySelector('.admin-login-card .btn-primary, .admin-login-card [onclick="adminLogin()"]');

  if (btn) { btn.textContent = 'Authenticating…'; btn.disabled = true; }

  /* ── BACKEND CALL ──
   * POST /api/index.php { action: 'admin_login', email, password }
   * Returns: { success, token } */
  const result = await Auth.loginAdmin(email, pass);

  if (btn) { btn.textContent = 'Enter Dashboard →'; btn.disabled = false; }

  if (result) {
    document.getElementById('adminLoginScreen')?.classList.add('hidden');
    document.getElementById('adminDashboard')?.classList.remove('hidden');
    loadAdminData();
    initAdminSettings();
  } else {
    if (errEl) errEl.classList.remove('hidden');
    setTimeout(() => errEl?.classList.add('hidden'), 3000);
  }
};

window.adminLogout = async function() {
  await Auth.logoutAdmin();
  document.getElementById('adminDashboard')?.classList.add('hidden');
  document.getElementById('adminLoginScreen')?.classList.remove('hidden');
};


/* ============================================================
   SECTION 10: ADMIN SETTINGS (Theme, Avatar)
   These are local-only (no backend needed for these UX features)
   ============================================================ */

window.setAdminTheme = function(color, btn) {
  document.documentElement.style.setProperty('--red', color);
  document.querySelectorAll('.admin-theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  localStorage.setItem('ccs-admin-color', color);
};

function initAdminSettings() {
  const savedColor  = localStorage.getItem('ccs-admin-color');
  const savedAvatar = localStorage.getItem('ccs-admin-avatar');

  if (savedColor) {
    document.documentElement.style.setProperty('--red', savedColor);
    document.querySelectorAll('.admin-theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.color === savedColor);
    });
  }

  if (savedAvatar) applyAdminAvatar(savedAvatar);

  // Live clock in admin topbar
  function updateAdmTime() {
    const now = new Date();
    const el  = document.getElementById('admTime');
    if (el) el.textContent = now.toLocaleTimeString();
  }
  setInterval(updateAdmTime, 1000);
  updateAdmTime();
}

window.handleAdminAvatar = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('ccs-admin-avatar', e.target.result);
    applyAdminAvatar(e.target.result);
    showToast('Profile photo updated! 📷', '✓');
  };
  reader.readAsDataURL(file);
};

function applyAdminAvatar(dataUrl) {
  document.querySelectorAll('#adminAvatarImg, #adminTopbarImg').forEach(img => {
    img.src = dataUrl;
    img.style.display = '';
  });
  document.querySelectorAll('#adminAvatarInitial, #adminTopbarInitial').forEach(el => {
    el.style.display = 'none';
  });
}


/* ============================================================
   SECTION 11: GENERAL UI — Modal, Toast, Cursor, Nav
   ============================================================ */

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
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});
window.openModal  = openModal;
window.closeModal = closeModal;

function showToast(message, icon = '✓') {
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

// Custom cursor
(function() {
  const cursor = document.querySelector('.cursor');
  const ring   = document.querySelector('.cursor-ring');
  if (!cursor || !ring) return;
  let mx=0, my=0, rx=0, ry=0;
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });
  (function animRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  })();
  document.addEventListener('mouseover', e => {
    const over = e.target.closest('a, button, .service-card, .testi-card, .project-card');
    cursor.style.transform = over ? 'translate(-50%,-50%) scale(2.5)' : 'translate(-50%,-50%) scale(1)';
    ring.style.transform   = over ? 'translate(-50%,-50%) scale(1.6)' : 'translate(-50%,-50%) scale(1)';
    ring.style.borderColor = over ? 'rgba(230,57,70,0.8)' : 'rgba(230,57,70,0.5)';
  });
})();

// Nav scroll behaviour
(function() {
  const nav = document.querySelector('.nav, .site-header');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
})();

// Hamburger / mobile nav
(function() {
  const ham    = document.querySelector('.hamburger');
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
  const menuBtn = document.querySelector('.menu-btn');
  const sidebar = document.querySelector('.sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.querySelector('.sidebar-overlay')?.addEventListener('click', () => sidebar.classList.remove('open'));
  }
})();
window.toggleSidebar = () => document.querySelector('.sidebar')?.classList.toggle('open');
window.closeSidebar  = () => document.querySelector('.sidebar')?.classList.remove('open');


/* ============================================================
   SECTION 12: ANIMATIONS — Scroll Reveal, Skill Bars, Counter
   ============================================================ */

// Scroll reveal
(function() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up, .reveal-card');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible', 'revealed'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();

// Skill bars
(function() {
  const bars = document.querySelectorAll('.skill-bar-fill');
  if (!bars.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('animate'); io.unobserve(e.target); } });
  }, { threshold: 0.5 });
  bars.forEach(b => io.observe(b));
})();

// Counters
(function() {
  const nums = document.querySelectorAll('[data-count]');
  if (!nums.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseInt(e.target.dataset.count);
        const suffix = e.target.dataset.suffix || '';
        let start = 0;
        const inc = target / (1800 / 16);
        const interval = setInterval(() => {
          start += inc;
          if (start >= target) { start = target; clearInterval(interval); }
          e.target.textContent = Math.floor(start) + suffix;
        }, 16);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  nums.forEach(n => io.observe(n));
})();

// Typing effect
function initTyping(elementId, texts) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const maxLen = Math.max(...texts.map(t => t.length));
  el.style.minWidth  = (maxLen * 9.6) + 'px';
  el.style.display   = 'inline-block';
  let idx = 0, charIdx = 0, isDeleting = false;
  function type() {
    const cur = texts[idx];
    el.textContent = cur.substring(0, charIdx);
    let speed = isDeleting ? 55 : 85;
    if (!isDeleting && charIdx === cur.length)    { speed = 2000; isDeleting = true; }
    else if (isDeleting && charIdx === 0) { isDeleting = false; idx = (idx + 1) % texts.length; speed = 400; }
    charIdx += isDeleting ? -1 : 1;
    setTimeout(type, speed);
  }
  type();
}

// Card tilt
function initTilt() {
  document.querySelectorAll('.service-card, .testi-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 10;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * -10;
      card.style.transform  = `translateY(-8px) rotateX(${y}deg) rotateY(${x}deg)`;
      card.style.transition = 'transform 0.1s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.4s ease';
    });
  });
}


/* ============================================================
   SECTION 13: MODAL HELPERS (auth modal aliases)
   ============================================================ */
window.openAuthModal = function(tab) {
  openModal('loginModal');
  if (tab === 'signup') {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const regTab = document.querySelector('.login-tab[data-tab="tab-register"]');
    if (regTab) { regTab.classList.add('active'); document.getElementById('tab-register')?.classList.add('active'); }
  }
};
window.closeAuthModal = function() { closeModal('loginModal'); };


/* ============================================================
   SECTION 14: DOMContentLoaded — INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // Update nav auth buttons based on stored session
  updateAuthUI();

  // Wire up all forms to the backend
  setupForms();

  // Card hover tilt effect
  initTilt();

  // Highlight current page in nav
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-drawer a, .header-nav .nav-link, .sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
  });

  // Typing effects
  initTyping('typingHero',  ['Web Development Agency','Frontend Specialists','E-Commerce Experts','Design & Redesign','AI-Powered Builds','Teaching HTML & CSS']);
  initTyping('typingAbout', ['Edgar Karori, Founder','Frontend Developer','Designer & Dreamer','Proud Kenyan 🇰🇪']);

  // Logout buttons
  document.querySelectorAll('.logout-btn, #userBtnWrap .btn-logout').forEach(btn => {
    btn.addEventListener('click', async () => {
      await Auth.logout();
      updateAuthUI();
      showToast('Logged out. See you! 👋', '👋');
    });
  });

  // Blog category filter
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPosts(btn.dataset.cat);
    });
  });

  // Render blog on blog page
  if (document.getElementById('postsGrid')) renderPosts();

  // Admin dashboard init
  if (document.getElementById('adminLoginScreen')) {
    if (Auth.isAdmin) {
      document.getElementById('adminLoginScreen').classList.add('hidden');
      document.getElementById('adminDashboard').classList.remove('hidden');
      loadAdminData();
    }
    initAdminSettings();
  }

  // Clock in cursor ring
  function updateClock() {
    const now = new Date();
    const el  = document.getElementById('clock');
    if (el) el.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  }
  setInterval(updateClock, 1000);
  updateClock();
});
/* ============================================================
   SECTION 15: HIGH-CLASS UX ENHANCEMENTS — v3.0
   Progress bar, scroll-to-top, ripple, page transitions
   ============================================================ */

(function() {
  // ── Progress bar ──
  const bar = document.createElement('div');
  bar.id = 'progress-bar';
  document.body.prepend(bar);

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });

  // ── Scroll to top button ──
  const topBtn = document.createElement('button');
  topBtn.id = 'scroll-top';
  topBtn.setAttribute('aria-label', 'Scroll to top');
  topBtn.innerHTML = '↑';
  topBtn.setAttribute('data-tooltip', 'Back to top');
  document.body.appendChild(topBtn);

  window.addEventListener('scroll', () => {
    topBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  topBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Page transition overlay ──
  const overlay = document.createElement('div');
  overlay.id = 'page-transition';
  document.body.prepend(overlay);

  // Fade in on load
  window.addEventListener('load', () => {
    overlay.style.opacity = '0';
  });

  // Intercept internal link clicks for smooth exit
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || a.target === '_blank') return;
    e.preventDefault();
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    setTimeout(() => { window.location.href = href; }, 320);
  });

  // ── Ripple effect on buttons ──
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn, .btn-nav, .btn-primary, .btn-outline, .btn-ghost, .btn-vip-dash');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });

  // ── Staggered reveal for cards ──
  const revealCards = document.querySelectorAll('.reveal-card');
  if (revealCards.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('revealed'), i * 80);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    revealCards.forEach(el => io.observe(el));
  }

  // ── Keyboard shortcut: press / to focus search (if exists) ──
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      const searchEl = document.querySelector('#blogSearch, .search-input, input[type="search"]');
      if (searchEl) { e.preventDefault(); searchEl.focus(); }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        const id = m.id;
        if (id) { try { closeModal(id); } catch(err) {} }
        else { m.classList.remove('open'); }
      });
    }
  });
})();

/* ============================================================
   SECTION 16: BLOG PAGE — MISSING FUNCTIONS
   blog.html calls these; they were not previously defined.
   ============================================================ */

/* ── Auth modal tab switcher (blog.html uses switchTab) ── */
window.switchTab = function(tab) {
  const loginTab  = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  if (!loginTab || !signupTab) return;

  if (tab === 'login') {
    loginTab.classList.remove('hidden');
    signupTab.classList.add('hidden');
  } else {
    loginTab.classList.add('hidden');
    signupTab.classList.remove('hidden');
  }

  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('onclick')?.includes(`'${tab}'`));
  });
};

/* ── Inline Login (blog.html modal) ── */
window.loginUser = async function() {
  const email = document.getElementById('l-email')?.value?.trim();
  const pass  = document.getElementById('l-pass')?.value;
  const btn   = document.querySelector('#loginTab .btn-primary');

  if (!email || !pass) { showToast('Please fill in email and password.', '⚠️'); return; }

  if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true; }
  const result = await Auth.login(email, pass);
  if (btn) { btn.disabled = false; btn.textContent = 'Login →'; }

  if (result === true) {
    closeModal('loginModal');
    updateAuthUI();
    showToast('Welcome back! 👋', '✓');
  } else {
    showToast(typeof result === 'string' ? result : 'Invalid email or password.', '❌');
  }
};

/* ── Inline Sign Up (blog.html modal) ── */
window.signupUser = async function() {
  const name  = document.getElementById('s-name')?.value?.trim();
  const email = document.getElementById('s-email')?.value?.trim();
  const pass  = document.getElementById('s-pass')?.value;
  const btn   = document.querySelector('#signupTab .btn-primary');

  if (!name || !email || !pass) { showToast('Please fill all fields.', '⚠️'); return; }

  if (btn) { btn.textContent = 'Creating…'; btn.disabled = true; }
  const result = await Auth.register(email, pass, name);
  if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }

  if (result === true) {
    closeModal('loginModal');
    updateAuthUI();
    showToast(`Welcome to CCS, ${name}! 🎉`, '🚀');
  } else if (result === 'exists') {
    showToast('An account with this email already exists.', '⚠️');
  } else {
    showToast(typeof result === 'string' ? result : 'Registration failed. Try again.', '❌');
  }
};

/* ── VIP Login (blog.html modal) ── */
window.loginVip = async function() {
  const code = document.getElementById('l-vip')?.value?.trim().toUpperCase();
  if (!code) { showToast('Please enter a VIP code.', '⚠️'); return; }

  // Ensure user has an account first (create guest if needed)
  if (!Auth.isLoggedIn) {
    const u = { id: Date.now(), name: 'VIP Member', email: '', vip: true, role: 'vip' };
    localStorage.setItem(Auth.key, JSON.stringify(u));
  }

  const result = await Auth.applyVipCode(code);
  if (result) {
    closeModal('loginModal');
    updateAuthUI();
    showToast('VIP access activated! ⭐', '⭐');
  } else {
    showToast('Invalid VIP code. Please try again.', '❌');
  }
};

/* ── Handle auth modal overlay click ── */
window.handleAuthOverlay = function(e) {
  if (e.target === document.getElementById('loginModal')) closeModal('loginModal');
};

/* ── Article lock modal ── */
window.openLockModal = function() {
  const el = document.getElementById('lockModal');
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
};
window.closeLockModal = function() {
  const el = document.getElementById('lockModal');
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
};
window.handleLockOverlay = function(e) {
  if (e.target === document.getElementById('lockModal')) closeLockModal();
};

/* ── Newsletter subscription ── */
window.subscribeNewsletter = async function() {
  const input = document.getElementById('blogNlEmail');
  const email = input?.value?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', '⚠️');
    return;
  }

  const btn = document.querySelector('.nl-form button');
  if (btn) { btn.textContent = 'Subscribing…'; btn.disabled = true; }

  const res = await apiCall('subscribe_newsletter', { email });

  if (btn) { btn.disabled = false; btn.textContent = 'Subscribe →'; }

  if (res.success || res.error?.includes('Network')) {
    // Save locally as fallback
    const subs = JSON.parse(localStorage.getItem('ccs-newsletter') || '[]');
    if (!subs.includes(email)) { subs.push(email); localStorage.setItem('ccs-newsletter', JSON.stringify(subs)); }
    if (input) input.value = '';
    showToast('You\'re subscribed! 📬 Welcome aboard.', '📬');
  } else {
    showToast(res.error || 'Subscription failed. Please try again.', '❌');
  }
};

/* ── VIP Dashboard ── */
window.openVipDashboard = function() {
  const dash = document.getElementById('vipDashboard');
  if (!dash) return;
  dash.style.display = 'flex';
  dash.style.flexDirection = 'column';
  document.body.style.overflow = 'hidden';

  // Populate VIP user info
  const user = Auth.user;
  if (user) {
    const nameEl = document.getElementById('vipUserName');
    if (nameEl) nameEl.textContent = user.name || 'Member';
    const profName = document.getElementById('vipProfileName');
    if (profName) profName.textContent = user.name || 'VIP Member';
    const profEmail = document.getElementById('vipProfileEmail');
    if (profEmail) profEmail.textContent = user.email || '';
    const pfName = document.getElementById('vip-pf-name');
    if (pfName) pfName.value = user.name || '';
    const pfEmail = document.getElementById('vip-pf-email');
    if (pfEmail) pfEmail.value = user.email || '';
    const pfLoc = document.getElementById('vip-pf-location');
    if (pfLoc) pfLoc.value = user.location || '';
    const pfBio = document.getElementById('vip-pf-bio');
    if (pfBio) pfBio.value = user.bio || '';
    const pfWeb = document.getElementById('vip-pf-website');
    if (pfWeb) pfWeb.value = user.website || '';

    // Avatar initial
    const initial = document.getElementById('vipAvatarInitial');
    if (initial && user.name) initial.textContent = user.name.charAt(0).toUpperCase();
    const savedAvatar = localStorage.getItem('ccs-vip-avatar');
    if (savedAvatar) {
      const img = document.getElementById('vipAvatarImg');
      if (img) { img.src = savedAvatar; img.style.display = ''; }
      if (initial) initial.style.display = 'none';
    }
  }

  // Load VIP posts into overview and content panels
  (async () => {
    const posts = await getStoredPosts();
    const vipPosts = posts.slice(0, 6);
    const postCount = document.getElementById('vipPostCount');
    if (postCount) postCount.textContent = posts.length;
    const catColors = { tutorial:'#e63946', showcase:'#3b82f6', news:'#10b981', beforeafter:'#8b5cf6' };
    const cardHTML = vipPosts.map(p => `
      <div class="vip-post-card" onclick="openPost(${p.id})">
        <div class="vip-post-cat">${p.cat_label || p.catLabel || p.category || 'Article'}</div>
        <h4>${p.title}</h4>
        <p>${p.excerpt || ''}</p>
        <div class="vip-post-meta"><span>${p.author || 'CCS Team'}</span><span>${p.read_time || p.readTime || '5 min'}</span></div>
      </div>`).join('') || '<p style="color:var(--text-muted)">No posts available yet.</p>';
    const overviewEl = document.getElementById('vipOverviewPosts');
    const allEl      = document.getElementById('vipAllPosts');
    if (overviewEl) overviewEl.innerHTML = cardHTML;
    if (allEl) allEl.innerHTML = cardHTML;
  })();
};

window.closeVipDashboard = function() {
  const dash = document.getElementById('vipDashboard');
  if (dash) { dash.style.display = 'none'; }
  document.body.style.overflow = '';
};

window.showVipPanel = function(name) {
  document.querySelectorAll('.vip-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.vip-nav-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`vip-panel-${name}`);
  if (panel) panel.classList.add('active');
  const btn = document.querySelector(`.vip-nav-btn[onclick*="'${name}'"]`);
  if (btn) btn.classList.add('active');
};

/* ── Save VIP Profile ── */
window.saveVipProfile = function() {
  const user = Auth.user || {};
  user.name     = document.getElementById('vip-pf-name')?.value.trim()    || user.name;
  user.email    = document.getElementById('vip-pf-email')?.value.trim()   || user.email;
  user.location = document.getElementById('vip-pf-location')?.value.trim() || '';
  user.bio      = document.getElementById('vip-pf-bio')?.value.trim()     || '';
  user.website  = document.getElementById('vip-pf-website')?.value.trim() || '';
  localStorage.setItem(Auth.key, JSON.stringify(user));

  const profName = document.getElementById('vipProfileName');
  if (profName) profName.textContent = user.name;
  const vipName = document.getElementById('vipUserName');
  if (vipName) vipName.textContent = user.name;

  showToast('Profile saved! ✓', '✓');
};

/* ── VIP Avatar Upload ── */
window.handleVipAvatar = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('ccs-vip-avatar', e.target.result);
    const img = document.getElementById('vipAvatarImg');
    const initial = document.getElementById('vipAvatarInitial');
    if (img) { img.src = e.target.result; img.style.display = ''; }
    if (initial) initial.style.display = 'none';
    showToast('Avatar updated! 📷', '✓');
  };
  reader.readAsDataURL(file);
};

/* ── Blog live search filter ── */
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const searchEl = document.getElementById('blogSearch');
    if (!searchEl) return;
    searchEl.addEventListener('input', async function() {
      const q = this.value.toLowerCase().trim();
      const grid = document.getElementById('postsGrid');
      if (!grid) return;
      if (!q) { renderPosts(window._currentBlogCat || 'all'); return; }

      const posts = await getStoredPosts();
      const filtered = posts.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.author || '').toLowerCase().includes(q)
      );

      if (!filtered.length) {
        grid.innerHTML = `<p style="color:var(--text-muted);padding:40px;text-align:center;grid-column:1/-1">No posts found for "<strong>${q}</strong>"</p>`;
        return;
      }

      const catColors = { tutorial:'#e63946', showcase:'#3b82f6', news:'#10b981', beforeafter:'#8b5cf6' };
      grid.innerHTML = filtered.map(post => {
        const locked = post.locked && !Auth.isLoggedIn;
        return `
          <article class="post-card ${locked ? 'locked' : ''}" onclick="openPost(${post.id})" style="cursor:pointer">
            <div class="post-cat-tag" style="background:${catColors[post.category]||'#e63946'}22;color:${catColors[post.category]||'#e63946'};border:1px solid ${catColors[post.category]||'#e63946'}44">${post.cat_label || post.catLabel || post.category}</div>
            <h3 class="post-title">${post.title}</h3>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-meta"><span>${post.author || 'CCS Team'}</span><span>${post.read_time || post.readTime || '5 min read'}</span></div>
            ${locked ? '<div class="post-lock">🔐 Members Only — <button onclick="event.stopPropagation();openModal(\'loginModal\')" class="btn-inline">Join Free</button></div>' : ''}
          </article>`;
      }).join('');
    });
  });
})();
