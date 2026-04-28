/* ============================================================
   CASUAL CODE STUDIOS — UNIFIED APP JS (v3.0 — Offline Edition)
   Pages: index.html, about.html, blog.html, admin.html, course.html

   All data is stored and read from localStorage.
   No backend or network calls are made anywhere in this file.
   ============================================================ */

'use strict';


/* ============================================================
   SECTION 1: THEME TOGGLE
   Runs immediately to prevent flash of wrong theme.
   ============================================================ */
(function () {
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
   SECTION 2: AUTH SYSTEM (localStorage only)
   ── Handles login, register, logout, VIP codes ──
   All user data lives in localStorage under these keys:
     ccs-user       → current logged-in user object
     ccs-users      → array of all registered users
     ccs-admin      → admin session object
     ccs-vip-codes  → array of VIP code objects
   ============================================================ */

const Auth = {
  key:      'ccs-user',
  adminKey: 'ccs-admin',

  get user()           { return JSON.parse(localStorage.getItem(this.key) || 'null'); },
  get isLoggedIn()     { return !!this.user; },
  get isAdmin()        { return !!JSON.parse(localStorage.getItem(this.adminKey) || 'null'); },
  get isVip()          { return this.user && (this.user.vip || this.user.role === 'vip'); },
  get hasCourseAccess(){ return this.isAdmin || this.isVip || (this.user && this.user.course_access); },

  /* ── LOGIN ── */
  login(email, password) {
    const users = JSON.parse(localStorage.getItem('ccs-users') || '[]');
    const found = users.find(u => u.email === email && u.password === password);
    if (found) {
      localStorage.setItem(this.key, JSON.stringify(found));
      return true;
    }
    // Accept any valid email + 6+ char password (demo / first-time user)
    if (email && password.length >= 6) {
      const u = { id: Date.now(), email, name: email.split('@')[0], vip: false, role: 'member' };
      localStorage.setItem(this.key, JSON.stringify(u));
      return true;
    }
    return 'Invalid email or password.';
  },

  /* ── REGISTER ── */
  register(email, password, name) {
    const users = JSON.parse(localStorage.getItem('ccs-users') || '[]');
    if (users.find(u => u.email === email)) return 'exists';
    const u = {
      id: Date.now(), email, name, password,
      vip: false, role: 'member', joinDate: new Date().toISOString()
    };
    users.push(u);
    localStorage.setItem('ccs-users', JSON.stringify(users));
    localStorage.setItem(this.key, JSON.stringify(u));

    // Also register into members list for admin panel
    const members = JSON.parse(localStorage.getItem('ccs-members') || '[]');
    if (!members.find(m => m.email === email)) {
      members.push({ id: u.id, name, email, role: 'member', vip: false, joinDate: u.joinDate });
      localStorage.setItem('ccs-members', JSON.stringify(members));
    }
    return true;
  },

  /* ── VIP CODE ── */
  applyVipCode(code) {
    const codes = JSON.parse(localStorage.getItem('ccs-vip-codes') || '[]');
    const builtin = ['VIP2026', 'CCSEXCL', 'PREMIUM1'];
    const validCode = codes.find(c => c.code === code && !c.used);
    const isBuiltin = builtin.includes(code);

    if (!validCode && !isBuiltin) return false;

    // Mark code as used if it's in the stored list
    if (validCode) {
      validCode.used = true;
      localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
    }

    const u = this.user || { id: Date.now(), name: 'VIP Member', email: '', vip: true, role: 'vip' };
    u.vip = true;
    u.role = 'vip';
    localStorage.setItem(this.key, JSON.stringify(u));

    // Upgrade in users list too
    const users = JSON.parse(localStorage.getItem('ccs-users') || '[]');
    const idx = users.findIndex(x => x.id === u.id);
    if (idx > -1) { users[idx] = u; localStorage.setItem('ccs-users', JSON.stringify(users)); }

    return true;
  },

  /* ── ADMIN LOGIN ── */
  loginAdmin(email, password) {
    if (
      (email === 'admin@lamine.kidd' && password === 'ccs.lamine.94') ||
      password === 'CCS@admin2026'
    ) {
      localStorage.setItem(this.adminKey, JSON.stringify({ role: 'admin', email }));
      return true;
    }
    return false;
  },

  /* ── LOGOUT ── */
  logout() {
    localStorage.removeItem(this.key);
  },

  logoutAdmin() {
    localStorage.removeItem(this.adminKey);
  }
};
window.Auth = Auth;


/* ============================================================
   SECTION 3: AUTH UI UPDATER
   Runs on every page load and after login/logout.
   ============================================================ */

function updateAuthUI() {
  document.querySelectorAll('.show-if-logged-out').forEach(el => el.style.display = Auth.isLoggedIn ? 'none' : '');
  document.querySelectorAll('.show-if-logged-in').forEach(el  => el.style.display = Auth.isLoggedIn ? '' : 'none');
  document.querySelectorAll('.show-if-vip').forEach(el        => el.style.display = Auth.isVip ? '' : 'none');
  document.querySelectorAll('.show-if-admin').forEach(el      => el.style.display = Auth.isAdmin ? '' : 'none');
  document.querySelectorAll('.user-display-name').forEach(el  => { if (Auth.user) el.textContent = Auth.user.name; });

  const authWrap  = document.getElementById('authBtnWrap');
  const userWrap  = document.getElementById('userBtnWrap');
  const userGreet = document.getElementById('userGreet');
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
   SECTION 4: FORM SETUP
   All forms save to localStorage — no network calls.
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

  // ── LOGIN FORM ──
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = loginForm.querySelector('[name="email"]').value.trim();
      const pass  = loginForm.querySelector('[name="password"]').value;
      const btn   = loginForm.querySelector('[type="submit"]');

      btn.textContent = 'Signing in…';
      btn.disabled = true;

      const result = Auth.login(email, pass);

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

  // ── REGISTER FORM ──
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', e => {
      e.preventDefault();
      const name  = registerForm.querySelector('[name="name"]').value.trim();
      const email = registerForm.querySelector('[name="email"]').value.trim();
      const pass  = registerForm.querySelector('[name="password"]').value;
      const btn   = registerForm.querySelector('[type="submit"]');

      if (pass.length < 6) { showToast('Password must be at least 6 characters.', '⚠️'); return; }

      btn.textContent = 'Creating account…';
      btn.disabled = true;

      const result = Auth.register(email, pass, name);

      btn.disabled = false;
      btn.textContent = 'Create Account 🎉';

      if (result === true) {
        closeModal('loginModal');
        updateAuthUI();
        showToast(`Welcome to CCS, ${name}! 🎉`, '🚀');
      } else if (result === 'exists') {
        showToast('An account with this email already exists.', '⚠️');
      } else {
        showToast('Registration failed. Please try again.', '❌');
      }
    });
  }

  // ── VIP CODE FORM ──
  const vipForm = document.getElementById('vipCodeForm');
  if (vipForm) {
    vipForm.addEventListener('submit', e => {
      e.preventDefault();
      const code = vipForm.querySelector('[name="vipCode"]').value.trim().toUpperCase();
      const btn  = vipForm.querySelector('[type="submit"]');

      if (!Auth.isLoggedIn) {
        showToast('Please log in first to apply a VIP code.', '⚠️');
        return;
      }

      btn.textContent = 'Activating…';
      btn.disabled = true;

      const result = Auth.applyVipCode(code);

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

  // hireForm and contactForm are handled natively by Formspree (action + method="POST" on the <form> elements).
  // No JS interception needed for these two forms.
}

/* Save an inquiry to localStorage */
function _saveInquiry(inquiry) {
  const inquiries = JSON.parse(localStorage.getItem('ccs-inquiries') || '[]');
  inquiries.unshift(inquiry);
  localStorage.setItem('ccs-inquiries', JSON.stringify(inquiries));
}


/* ============================================================
   SECTION 5: BLOG POST RENDERING
   Posts are read from and written to localStorage.
   ============================================================ */

function getStoredPosts() {
  return JSON.parse(localStorage.getItem('ccs-posts') || '[]');
}
window.getStoredPosts = getStoredPosts;

window.renderPosts = function (cat = 'all') {
  window._currentBlogCat = cat;
  const grid = document.getElementById('postsGrid');
  if (!grid) return;

  let posts = getStoredPosts();
  if (cat !== 'all') posts = posts.filter(p => p.category === cat);

  if (!posts.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:40px;text-align:center">No posts yet.</p>';
    return;
  }

  const catColors = { tutorial: '#e63946', showcase: '#3b82f6', news: '#10b981', beforeafter: '#8b5cf6' };

  grid.innerHTML = posts.map(post => {
    const locked = post.locked && !Auth.isLoggedIn;
    return `
      <article class="post-card ${locked ? 'locked' : ''}" onclick="openPost(${post.id})" style="cursor:pointer">
        <div class="post-cat-tag" style="background:${catColors[post.category] || '#e63946'}22;color:${catColors[post.category] || '#e63946'};border:1px solid ${catColors[post.category] || '#e63946'}44">${post.cat_label || post.catLabel || post.category}</div>
        <h3 class="post-title">${post.title}</h3>
        <p class="post-excerpt">${post.excerpt}</p>
        <div class="post-meta"><span>${post.author || 'CCS Team'}</span><span>${post.read_time || post.readTime || '5 min read'}</span></div>
        ${locked ? '<div class="post-lock">🔐 Members Only — <button onclick="event.stopPropagation();openModal(\'loginModal\')" class="btn-inline">Join Free</button></div>' : ''}
      </article>`;
  }).join('');
};

window.openPost = function (id) {
  const post = getStoredPosts().find(p => String(p.id) === String(id));
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
   SECTION 6: ADMIN DASHBOARD (localStorage only)
   ============================================================ */

window.showPanel = function (name) {
  document.querySelectorAll('.adm-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.remove('hidden');
  const btn = document.querySelector(`.adm-nav-btn[onclick*="'${name}'"]`);
  if (btn) btn.classList.add('active');
  const titles = { overview: 'Overview', posts: 'Blog Posts', members: 'Members', vip: 'VIP Members', inquiries: 'Inquiries', settings: 'Settings', courses: 'Course Access' };
  const subs   = { overview: 'Welcome back, Admin 🎯', posts: 'Manage blog content', members: 'Manage community members', vip: 'VIP codes & members', inquiries: 'Client enquiries', settings: 'Admin preferences', courses: 'HTML Course Access Control' };
  const titleEl = document.getElementById('panelTitle');
  const subEl   = document.getElementById('panelSub');
  if (titleEl) titleEl.textContent = titles[name] || name;
  if (subEl)   subEl.textContent   = subs[name]   || '';

  if (name === 'overview')  loadAdminData();
  if (name === 'members')   loadMembersList();
  if (name === 'vip')       loadVipPanel();
  if (name === 'inquiries') loadInquiriesList();
  if (name === 'courses')   loadCourseAccessPanel();
};

function loadAdminData() {
  const members   = JSON.parse(localStorage.getItem('ccs-members')   || '[]');
  const posts     = JSON.parse(localStorage.getItem('ccs-posts')     || '[]');
  const inquiries = JSON.parse(localStorage.getItem('ccs-inquiries') || '[]');
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

  const membersEl = document.getElementById('recentMembers');
  if (membersEl) {
    membersEl.innerHTML = members.slice(0, 5).map(m =>
      `<div class="adm-list-item"><span>${m.name}</span><span style="color:var(--text-muted);font-size:12px">${m.email}</span></div>`
    ).join('') || '<p style="color:var(--text-muted);padding:20px;text-align:center">No members yet.</p>';
  }

  const inqEl = document.getElementById('recentInquiries');
  if (inqEl) {
    inqEl.innerHTML = inquiries.slice(0, 5).map(i =>
      `<div class="adm-list-item"><span>${i.name}</span><span style="color:var(--text-muted);font-size:12px">${i.service || 'General'}</span></div>`
    ).join('') || '<p style="color:var(--text-muted);padding:20px;text-align:center">No inquiries yet.</p>';
  }

  loadPostsList();
}

function loadPostsList() {
  const postsEl = document.getElementById('postsList');
  if (!postsEl) return;
  const posts = getStoredPosts();

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

function loadMembersList() {
  const container = document.getElementById('membersList');
  if (!container) return;
  const members = JSON.parse(localStorage.getItem('ccs-members') || '[]');

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
            <td>${m.joinDate ? new Date(m.joinDate).toLocaleDateString() : '—'}</td>
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

window.makeVipAdmin = function (id) {
  const members = JSON.parse(localStorage.getItem('ccs-members') || '[]');
  const m = members.find(x => x.id === id);
  if (!m) return;
  m.vip = true;
  m.role = 'vip';
  localStorage.setItem('ccs-members', JSON.stringify(members));
  loadMembersList();
  loadAdminData();
  showToast('Member upgraded to VIP! ⭐');
};

window.removeMemberAdmin = function (id) {
  if (!confirm('Remove this member? This cannot be undone.')) return;
  const members = JSON.parse(localStorage.getItem('ccs-members') || '[]').filter(m => m.id !== id);
  localStorage.setItem('ccs-members', JSON.stringify(members));
  loadMembersList();
  loadAdminData();
  showToast('Member removed.', '🗑️');
};

function loadVipPanel() {
  const codes = JSON.parse(localStorage.getItem('ccs-vip-codes') || '[]');
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

  const members    = JSON.parse(localStorage.getItem('ccs-members') || '[]');
  const vipMembers = members.filter(m => m.vip || m.role === 'vip');
  const vipEl      = document.getElementById('vipMembersList');
  if (vipEl) {
    vipEl.innerHTML = vipMembers.length
      ? `<table class="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead><tbody>
          ${vipMembers.map(m => `<tr><td>${m.name}</td><td>${m.email || '—'}</td><td>${m.joinDate ? new Date(m.joinDate).toLocaleDateString() : '—'}</td></tr>`).join('')}
         </tbody></table>`
      : '<p style="color:var(--text-muted);padding:20px;text-align:center">No VIP members yet.</p>';
  }
  const countEl = document.getElementById('vipCount');
  if (countEl) countEl.textContent = vipMembers.length;
}

function loadInquiriesList() {
  const container  = document.getElementById('inquiriesList');
  if (!container) return;
  const inquiries = JSON.parse(localStorage.getItem('ccs-inquiries') || '[]');

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

window.generateVipCode = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const code  = 'VIP' + Array.from({ length: 5 }, () => chars[Math.random() * chars.length | 0]).join('');
  const codes = JSON.parse(localStorage.getItem('ccs-vip-codes') || '[]');
  codes.push({ code, used: false, created: new Date().toISOString() });
  localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
  loadVipPanel();
  showToast(`VIP Code generated: ${code}`, '⭐');
};

window.deleteVipCode = function (code) {
  const codes = JSON.parse(localStorage.getItem('ccs-vip-codes') || '[]').filter(c => c.code !== code);
  localStorage.setItem('ccs-vip-codes', JSON.stringify(codes));
  loadVipPanel();
  showToast('Code deleted.', '🗑️');
};

window.savePost = function () {
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

  const post = {
    id: Date.now(), title, excerpt, content, category: cat,
    cat_label: catLabels[cat] || cat, catLabel: catLabels[cat] || cat,
    author, date: new Date().toISOString(), created: new Date().toISOString(),
    readTime, read_time: readTime, access, tags,
    locked: access !== 'public'
  };
  const posts = JSON.parse(localStorage.getItem('ccs-posts') || '[]');
  posts.unshift(post);
  localStorage.setItem('ccs-posts', JSON.stringify(posts));

  cancelPostForm();
  loadAdminData();
  showToast('Post published! 🚀', '✓');
};

window.deletePost = function (id) {
  if (!confirm('Delete this post?')) return;
  const posts = JSON.parse(localStorage.getItem('ccs-posts') || '[]').filter(p => p.id !== id);
  localStorage.setItem('ccs-posts', JSON.stringify(posts));
  loadAdminData();
  showToast('Post deleted.', '🗑️');
};

window.openNewPostForm  = function () { document.getElementById('newPostForm')?.classList.remove('hidden'); if (document.getElementById('postFormTitle')) document.getElementById('postFormTitle').textContent = 'Create New Post'; };
window.cancelPostForm   = function () { document.getElementById('newPostForm')?.classList.add('hidden'); };
window.openAddMemberForm= function () { document.getElementById('addMemberForm')?.classList.remove('hidden'); };
window.cancelAddMember  = function () { document.getElementById('addMemberForm')?.classList.add('hidden'); };

window.addMember = function () {
  const name  = document.getElementById('am-name')?.value.trim();
  const email = document.getElementById('am-email')?.value.trim();
  const role  = document.getElementById('am-role')?.value || 'member';

  if (!name || !email) { showToast('Name and email required.', '⚠️'); return; }

  const members = JSON.parse(localStorage.getItem('ccs-members') || '[]');
  if (members.find(m => m.email === email)) { showToast('A member with this email already exists.', '⚠️'); return; }

  members.push({ id: Date.now(), name, email, role, vip: role === 'vip', joinDate: new Date().toISOString() });
  localStorage.setItem('ccs-members', JSON.stringify(members));
  cancelAddMember();
  loadAdminData();
  showToast(`${name} added! 🎉`, '✓');
};

window.saveSettings = function () {
  const displayName = document.getElementById('set-displayname')?.value || 'Kongo Bonface';
  const oldPass     = document.getElementById('set-oldpass')?.value;
  const newPass     = document.getElementById('set-newpass')?.value;

  // Store display name
  localStorage.setItem('ccs-admin-display', displayName);

  if (oldPass && newPass) {
    // Store new password hash (simple — no network)
    localStorage.setItem('ccs-admin-newpass', newPass);
    if (document.getElementById('set-oldpass')) document.getElementById('set-oldpass').value = '';
    if (document.getElementById('set-newpass')) document.getElementById('set-newpass').value = '';
    showToast('Password updated! ✓', '✓');
  } else {
    showToast('Settings saved! ✓', '✓');
  }
};


/* ============================================================
   SECTION 7: COURSE ACCESS MANAGEMENT (localStorage)
   ============================================================ */

function loadCourseAccessPanel() {
  const panel = document.getElementById('panel-courses');
  if (!panel) return;

  const list   = JSON.parse(localStorage.getItem('ccs-course-access') || '[]');
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

window.grantCourseAccess = function () {
  const emailEl = document.getElementById('course-grant-email');
  const email   = emailEl?.value.trim().toLowerCase();
  if (!email) { showToast('Enter a member email to grant access.', '⚠️'); return; }

  const members = JSON.parse(localStorage.getItem('ccs-members') || '[]');
  const member  = members.find(m => m.email === email);

  const list = JSON.parse(localStorage.getItem('ccs-course-access') || '[]');
  if (list.find(i => i.user_email === email)) { showToast('Access already granted.', '⚠️'); return; }

  list.push({ user_email: email, name: member?.name || '—', granted_at: new Date().toISOString() });
  localStorage.setItem('ccs-course-access', JSON.stringify(list));

  // Grant flag on user if they exist
  const uIdx = members.findIndex(m => m.email === email);
  if (uIdx > -1) { members[uIdx].course_access = true; localStorage.setItem('ccs-members', JSON.stringify(members)); }

  if (emailEl) emailEl.value = '';
  loadCourseAccessPanel();
  showToast(`Course access granted to ${email}! 🎓`, '✓');
};

window.revokeCourseAccess = function (email) {
  if (!confirm(`Revoke course access for ${email}?`)) return;
  const list = JSON.parse(localStorage.getItem('ccs-course-access') || '[]').filter(i => i.user_email !== email);
  localStorage.setItem('ccs-course-access', JSON.stringify(list));
  loadCourseAccessPanel();
  showToast('Access revoked.', '🗑️');
};


/* ============================================================
   SECTION 8: ADMIN LOGIN / LOGOUT
   ============================================================ */

window.adminLogin = function () {
  const email = document.getElementById('adm-email')?.value.trim();
  const pass  = document.getElementById('adm-pass')?.value;
  const errEl = document.getElementById('adm-error');
  const btn   = document.querySelector('.admin-login-card .btn-primary, .admin-login-card [onclick="adminLogin()"]');

  if (btn) { btn.textContent = 'Authenticating…'; btn.disabled = true; }

  const result = Auth.loginAdmin(email, pass);

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

window.adminLogout = function () {
  Auth.logoutAdmin();
  document.getElementById('adminDashboard')?.classList.add('hidden');
  document.getElementById('adminLoginScreen')?.classList.remove('hidden');
};


/* ============================================================
   SECTION 9: ADMIN SETTINGS (theme, avatar — local only)
   ============================================================ */

window.setAdminTheme = function (color, btn) {
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

  function updateAdmTime() {
    const el = document.getElementById('admTime');
    if (el) el.textContent = new Date().toLocaleTimeString();
  }
  setInterval(updateAdmTime, 1000);
  updateAdmTime();
}

window.handleAdminAvatar = function (event) {
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
   SECTION 10: GENERAL UI — Modal, Toast, Cursor, Nav
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
(function () {
  const cursor = document.querySelector('.cursor');
  const ring   = document.querySelector('.cursor-ring');
  if (!cursor || !ring) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
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
(function () {
  const nav = document.querySelector('.nav, .site-header');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
})();

// Hamburger / mobile nav
(function () {
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
   SECTION 11: ANIMATIONS — Scroll Reveal, Skill Bars, Counter
   ============================================================ */

(function () {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up, .reveal-card');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible', 'revealed'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();

(function () {
  const bars = document.querySelectorAll('.skill-bar-fill');
  if (!bars.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('animate'); io.unobserve(e.target); } });
  }, { threshold: 0.5 });
  bars.forEach(b => io.observe(b));
})();

(function () {
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

function initTyping(elementId, texts) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const maxLen = Math.max(...texts.map(t => t.length));
  el.style.minWidth = (maxLen * 9.6) + 'px';
  el.style.display  = 'inline-block';
  let idx = 0, charIdx = 0, isDeleting = false;
  function type() {
    const cur = texts[idx];
    el.textContent = cur.substring(0, charIdx);
    let speed = isDeleting ? 55 : 85;
    if (!isDeleting && charIdx === cur.length)  { speed = 2000; isDeleting = true; }
    else if (isDeleting && charIdx === 0) { isDeleting = false; idx = (idx + 1) % texts.length; speed = 400; }
    charIdx += isDeleting ? -1 : 1;
    setTimeout(type, speed);
  }
  type();
}

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
   SECTION 12: MODAL HELPERS
   ============================================================ */

window.openAuthModal = function (tab) {
  openModal('loginModal');
  if (tab === 'signup') {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const regTab = document.querySelector('.login-tab[data-tab="tab-register"]');
    if (regTab) { regTab.classList.add('active'); document.getElementById('tab-register')?.classList.add('active'); }
  }
};
window.closeAuthModal = function () { closeModal('loginModal'); };

window.openLockModal = function () {
  const el = document.getElementById('lockModal');
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
};
window.closeLockModal = function () {
  const el = document.getElementById('lockModal');
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
};
window.handleAuthOverlay = function (e) {
  if (e.target === document.getElementById('loginModal')) closeModal('loginModal');
};
window.handleLockOverlay = function (e) {
  if (e.target === document.getElementById('lockModal')) closeLockModal();
};


/* ============================================================
   SECTION 13: BLOG PAGE FUNCTIONS
   ============================================================ */

window.switchTab = function (tab) {
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

window.loginUser = function () {
  const email = document.getElementById('l-email')?.value?.trim();
  const pass  = document.getElementById('l-pass')?.value;
  const btn   = document.querySelector('#loginTab .btn-primary');
  if (!email || !pass) { showToast('Please fill in email and password.', '⚠️'); return; }
  if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true; }
  const result = Auth.login(email, pass);
  if (btn) { btn.disabled = false; btn.textContent = 'Login →'; }
  if (result === true) {
    closeModal('loginModal');
    updateAuthUI();
    showToast('Welcome back! 👋', '✓');
  } else {
    showToast(typeof result === 'string' ? result : 'Invalid email or password.', '❌');
  }
};

window.signupUser = function () {
  const name  = document.getElementById('s-name')?.value?.trim();
  const email = document.getElementById('s-email')?.value?.trim();
  const pass  = document.getElementById('s-pass')?.value;
  const btn   = document.querySelector('#signupTab .btn-primary');
  if (!name || !email || !pass) { showToast('Please fill all fields.', '⚠️'); return; }
  if (btn) { btn.textContent = 'Creating…'; btn.disabled = true; }
  const result = Auth.register(email, pass, name);
  if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }
  if (result === true) {
    closeModal('loginModal');
    updateAuthUI();
    showToast(`Welcome to CCS, ${name}! 🎉`, '🚀');
  } else if (result === 'exists') {
    showToast('An account with this email already exists.', '⚠️');
  } else {
    showToast('Registration failed. Try again.', '❌');
  }
};

window.loginVip = function () {
  const code = document.getElementById('l-vip')?.value?.trim().toUpperCase();
  if (!code) { showToast('Please enter a VIP code.', '⚠️'); return; }
  if (!Auth.isLoggedIn) {
    const u = { id: Date.now(), name: 'VIP Member', email: '', vip: true, role: 'vip' };
    localStorage.setItem(Auth.key, JSON.stringify(u));
  }
  const result = Auth.applyVipCode(code);
  if (result) {
    closeModal('loginModal');
    updateAuthUI();
    showToast('VIP access activated! ⭐', '⭐');
  } else {
    showToast('Invalid VIP code. Please try again.', '❌');
  }
};


/* ============================================================
   SECTION 14: NEWSLETTER (localStorage)
   ============================================================ */

window.subscribeNewsletter = function () {
  const input = document.getElementById('blogNlEmail');
  const email = input?.value?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', '⚠️');
    return;
  }
  const subs = JSON.parse(localStorage.getItem('ccs-newsletter') || '[]');
  if (subs.includes(email)) { showToast('You\'re already subscribed! 📬', '⚠️'); return; }
  subs.push(email);
  localStorage.setItem('ccs-newsletter', JSON.stringify(subs));
  if (input) input.value = '';
  showToast('You\'re subscribed! 📬 Welcome aboard.', '📬');
};


/* ============================================================
   SECTION 15: VIP DASHBOARD
   ============================================================ */

window.openVipDashboard = function () {
  const dash = document.getElementById('vipDashboard');
  if (!dash) return;
  dash.style.display = 'flex';
  dash.style.flexDirection = 'column';
  document.body.style.overflow = 'hidden';

  const user = Auth.user;
  if (user) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setInput = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('vipUserName', user.name || 'Member');
    setVal('vipProfileName', user.name || 'VIP Member');
    setVal('vipProfileEmail', user.email || '');
    setInput('vip-pf-name', user.name);
    setInput('vip-pf-email', user.email);
    setInput('vip-pf-location', user.location);
    setInput('vip-pf-bio', user.bio);
    setInput('vip-pf-website', user.website);

    const initial = document.getElementById('vipAvatarInitial');
    if (initial && user.name) initial.textContent = user.name.charAt(0).toUpperCase();
    const savedAvatar = localStorage.getItem('ccs-vip-avatar');
    if (savedAvatar) {
      const img = document.getElementById('vipAvatarImg');
      if (img) { img.src = savedAvatar; img.style.display = ''; }
      if (initial) initial.style.display = 'none';
    }
  }

  const posts    = getStoredPosts();
  const vipPosts = posts.slice(0, 6);
  const postCount = document.getElementById('vipPostCount');
  if (postCount) postCount.textContent = posts.length;
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
  if (allEl)      allEl.innerHTML      = cardHTML;
};

window.closeVipDashboard = function () {
  const dash = document.getElementById('vipDashboard');
  if (dash) dash.style.display = 'none';
  document.body.style.overflow = '';
};

window.showVipPanel = function (name) {
  document.querySelectorAll('.vip-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.vip-nav-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`vip-panel-${name}`);
  if (panel) panel.classList.add('active');
  const btn = document.querySelector(`.vip-nav-btn[onclick*="'${name}'"]`);
  if (btn) btn.classList.add('active');
};

window.saveVipProfile = function () {
  const user = Auth.user || {};
  user.name     = document.getElementById('vip-pf-name')?.value.trim()     || user.name;
  user.email    = document.getElementById('vip-pf-email')?.value.trim()    || user.email;
  user.location = document.getElementById('vip-pf-location')?.value.trim() || '';
  user.bio      = document.getElementById('vip-pf-bio')?.value.trim()      || '';
  user.website  = document.getElementById('vip-pf-website')?.value.trim()  || '';
  localStorage.setItem(Auth.key, JSON.stringify(user));
  const profName = document.getElementById('vipProfileName');
  if (profName) profName.textContent = user.name;
  const vipName = document.getElementById('vipUserName');
  if (vipName) vipName.textContent = user.name;
  showToast('Profile saved! ✓', '✓');
};

window.handleVipAvatar = function (event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('ccs-vip-avatar', e.target.result);
    const img     = document.getElementById('vipAvatarImg');
    const initial = document.getElementById('vipAvatarInitial');
    if (img)     { img.src = e.target.result; img.style.display = ''; }
    if (initial) initial.style.display = 'none';
    showToast('Avatar updated! 📷', '✓');
  };
  reader.readAsDataURL(file);
};


/* ============================================================
   SECTION 16: BLOG LIVE SEARCH
   ============================================================ */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const searchEl = document.getElementById('blogSearch');
    if (!searchEl) return;
    searchEl.addEventListener('input', function () {
      const q    = this.value.toLowerCase().trim();
      const grid = document.getElementById('postsGrid');
      if (!grid) return;
      if (!q) { renderPosts(window._currentBlogCat || 'all'); return; }

      const catColors = { tutorial: '#e63946', showcase: '#3b82f6', news: '#10b981', beforeafter: '#8b5cf6' };
      const filtered  = getStoredPosts().filter(p =>
        (p.title    || '').toLowerCase().includes(q) ||
        (p.excerpt  || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.author   || '').toLowerCase().includes(q)
      );

      if (!filtered.length) {
        grid.innerHTML = `<p style="color:var(--text-muted);padding:40px;text-align:center;grid-column:1/-1">No posts found for "<strong>${q}</strong>"</p>`;
        return;
      }

      grid.innerHTML = filtered.map(post => {
        const locked = post.locked && !Auth.isLoggedIn;
        return `
          <article class="post-card ${locked ? 'locked' : ''}" onclick="openPost(${post.id})" style="cursor:pointer">
            <div class="post-cat-tag" style="background:${catColors[post.category] || '#e63946'}22;color:${catColors[post.category] || '#e63946'};border:1px solid ${catColors[post.category] || '#e63946'}44">${post.cat_label || post.catLabel || post.category}</div>
            <h3 class="post-title">${post.title}</h3>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-meta"><span>${post.author || 'CCS Team'}</span><span>${post.read_time || post.readTime || '5 min read'}</span></div>
            ${locked ? '<div class="post-lock">🔐 Members Only — <button onclick="event.stopPropagation();openModal(\'loginModal\')" class="btn-inline">Join Free</button></div>' : ''}
          </article>`;
      }).join('');
    });
  });
})();


/* ============================================================
   SECTION 17: UX ENHANCEMENTS
   Progress bar, scroll-to-top, ripple, page transitions
   ============================================================ */
(function () {
  // Progress bar
  const bar = document.createElement('div');
  bar.id = 'progress-bar';
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0) + '%';
  }, { passive: true });

  // Scroll to top
  const topBtn = document.createElement('button');
  topBtn.id = 'scroll-top';
  topBtn.setAttribute('aria-label', 'Scroll to top');
  topBtn.innerHTML = '↑';
  topBtn.setAttribute('data-tooltip', 'Back to top');
  document.body.appendChild(topBtn);
  window.addEventListener('scroll', () => topBtn.classList.toggle('visible', window.scrollY > 400), { passive: true });
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Page transition overlay
  const overlay = document.createElement('div');
  overlay.id = 'page-transition';
  document.body.prepend(overlay);
  window.addEventListener('load', () => { overlay.style.opacity = '0'; });
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

  // Ripple effect
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn, .btn-nav, .btn-primary, .btn-outline, .btn-ghost, .btn-vip-dash');
    if (!btn) return;
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });

  // Staggered reveal cards
  const revealCards = document.querySelectorAll('.reveal-card');
  if (revealCards.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) { setTimeout(() => e.target.classList.add('revealed'), i * 80); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    revealCards.forEach(el => io.observe(el));
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      const searchEl = document.querySelector('#blogSearch, .search-input, input[type="search"]');
      if (searchEl) { e.preventDefault(); searchEl.focus(); }
    }
  });
})();


/* ============================================================
   SECTION 18: DOMContentLoaded — INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  updateAuthUI();
  setupForms();
  initTilt();

  // Highlight active nav link
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-drawer a, .header-nav .nav-link, .sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
  });

  // Typing effects
  initTyping('typingHero',  ['Web Development Agency', 'Frontend Specialists', 'E-Commerce Experts', 'Design & Redesign', 'AI-Powered Builds', 'Teaching HTML & CSS']);
  initTyping('typingAbout', ['Edgar Karori, Founder', 'Frontend Developer', 'Designer & Dreamer', 'Proud Kenyan 🇰🇪']);

  // Logout buttons
  document.querySelectorAll('.logout-btn, #userBtnWrap .btn-logout').forEach(btn => {
    btn.addEventListener('click', () => {
      Auth.logout();
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

  // Render blog posts
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

  // Clock in cursor ring (also declared inline in index.html — this is a safe fallback)
  function updateClock() {
    const el = document.getElementById('clock');
    if (el) el.textContent = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}:${String(new Date().getSeconds()).padStart(2,'0')}`;
  }
  setInterval(updateClock, 1000);
  updateClock();
});
