// js/admin.js
const API_BASE = 'https://rentspace-markeplace.onrender.com/api';
const token = localStorage.getItem('rentspace_token');

// ─── Authentication check ──────────────────────────────────────────
if (!token) {
  window.location.href = 'login.html';
}

// ─── DOM Elements ──────────────────────────────────────────────────
const sections = {
  dashboard: document.getElementById('section-dashboard'),
  users: document.getElementById('section-users'),
  subscriptions: document.getElementById('section-subscriptions'),
  properties: document.getElementById('section-properties')
};
const navLinks = document.querySelectorAll('.sidebar-nav a');
const pageTitle = document.getElementById('pageTitle');

// ─── Tab Navigation ───────────────────────────────────────────────
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.dataset.section;
    // Update active state
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    // Show tab
    Object.keys(sections).forEach(key => {
      sections[key].classList.remove('active');
    });
    sections[section].classList.add('active');
    // Update title
    const titles = {
      dashboard: 'Dashboard',
      users: 'Users',
      subscriptions: 'Subscriptions',
      properties: 'Properties'
    };
    pageTitle.textContent = titles[section] || 'Admin Dashboard';
    // Load data on first visit
    if (section === 'dashboard') loadDashboard();
    else if (section === 'users') loadUsers();
    else if (section === 'subscriptions') loadSubscriptions();
    else if (section === 'properties') loadProperties();
  });
});

// ─── Logout ─────────────────────────────────────────────────────────
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  localStorage.removeItem('rentspace_token');
  window.location.href = 'login.html';
});

// ─── Pagination state ─────────────────────────────────────────────
let currentPage = { users: 1, subs: 1, props: 1 };
let currentFilter = { subs: 'all', props: 'all' };

// ─── Helpers ───────────────────────────────────────────────────────
function fetchWithAuth(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE');
}

function formatCurrency(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function renderPagination(containerId, totalPages, currentPage, callback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  let html = '';
  if (currentPage > 1) {
    html += `<button class="pagination-btn" data-page="${currentPage - 1}">Prev</button>`;
  }
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<button class="pagination-btn active" data-page="${i}">${i}</button>`;
    } else if (Math.abs(i - currentPage) <= 2 || i === 1 || i === totalPages) {
      html += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 3) {
      html += `<span style="margin:0 4px; color:#555;">...</span>`;
    }
  }
  if (currentPage < totalPages) {
    html += `<button class="pagination-btn" data-page="${currentPage + 1}">Next</button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (!isNaN(page)) {
        callback(page);
      }
    });
  });
}

// ─── Dashboard ─────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    const stats = data.stats;
    document.getElementById('statUsers').textContent = stats.totalUsers || 0;
    document.getElementById('statProperties').textContent = stats.totalProperties || 0;
    document.getElementById('statActiveSubs').textContent = stats.activeSubscriptions || 0;
    document.getElementById('statRevenue').textContent = formatCurrency(stats.totalRevenue || 0);
    document.getElementById('statPendingSubs').textContent = stats.pendingSubscriptions || 0;

    // Recent activity
    const recent = data.recentSubscriptions || [];
    const container = document.getElementById('recentActivity');
    if (recent.length === 0) {
      container.innerHTML = '<p style="color:#888;">No recent activity.</p>';
    } else {
      let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
      recent.forEach(sub => {
        const user = sub.userId || { name: 'Unknown' };
        const statusClass = sub.status || 'pending';
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.02); border-radius:8px; border-left:3px solid #c5a059;">
            <div>
              <strong>${user.name || 'Unknown'}</strong>
              <span style="color:#888; margin-left:8px;">subscribed to ${sub.plan}</span>
            </div>
            <div>
              <span class="status-badge ${statusClass}">${statusClass}</span>
              <span style="color:#888; font-size:12px; margin-left:8px;">${formatDate(sub.createdAt)}</span>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    document.getElementById('recentActivity').innerHTML = '<p style="color:#ff6b6b;">Failed to load dashboard data.</p>';
  }
}

// ─── Users ─────────────────────────────────────────────────────────
async function loadUsers(page = 1) {
  try {
    currentPage.users = page;
    const limit = 20;
    const res = await fetchWithAuth(`${API_BASE}/admin/users?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    const users = data.data || [];
    const tbody = document.getElementById('usersTableBody');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No users found.</td></tr>';
    } else {
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.name || '—'}</td>
          <td>${u.email || '—'}</td>
          <td>${u.phone || '—'}</td>
          <td><span class="status-badge ${u.subscriptionPlan === 'free' ? 'expired' : 'active'}">${u.subscriptionPlan || 'free'}</span></td>
          <td>${u.role || 'customer'}</td>
        </tr>
      `).join('');
    }
    renderPagination('usersPagination', data.totalPages || 1, currentPage.users, loadUsers);
  } catch (error) {
    console.error('Users error:', error);
    document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ff6b6b;">Failed to load users.</td></tr>';
  }
}

// ─── Subscriptions ────────────────────────────────────────────────
async function loadSubscriptions(page = 1, filter = currentFilter.subs) {
  try {
    currentPage.subs = page;
    currentFilter.subs = filter;
    const limit = 20;
    const url = filter === 'all' 
      ? `${API_BASE}/admin/subscriptions?page=${page}&limit=${limit}`
      : `${API_BASE}/admin/subscriptions?status=${filter}&page=${page}&limit=${limit}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Failed to fetch subscriptions');
    const data = await res.json();
    const subs = data.data || [];
    const tbody = document.getElementById('subsTableBody');
    if (subs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No subscriptions found.</td></tr>';
    } else {
      tbody.innerHTML = subs.map(s => {
        const user = s.userId || { name: 'Unknown' };
        return `
          <tr>
            <td>${user.name || 'Unknown'}</td>
            <td>${s.plan || '—'}</td>
            <td>${formatCurrency(s.amount)}</td>
            <td><span class="status-badge ${s.status}">${s.status}</span></td>
            <td>${formatDate(s.renewalDate)}</td>
          </tr>
        `;
      }).join('');
    }
    renderPagination('subsPagination', data.totalPages || 1, currentPage.subs, (p) => loadSubscriptions(p, filter));
  } catch (error) {
    console.error('Subscriptions error:', error);
    document.getElementById('subsTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ff6b6b;">Failed to load subscriptions.</td></tr>';
  }
}

// ─── Properties ───────────────────────────────────────────────────
async function loadProperties(page = 1, filter = currentFilter.props) {
  try {
    currentPage.props = page;
    currentFilter.props = filter;
    const limit = 20;
    const url = filter === 'all'
      ? `${API_BASE}/admin/properties?page=${page}&limit=${limit}`
      : `${API_BASE}/admin/properties?status=${filter}&page=${page}&limit=${limit}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Failed to fetch properties');
    const data = await res.json();
    const props = data.data || [];
    const tbody = document.getElementById('propsTableBody');
    if (props.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No properties found.</td></tr>';
    } else {
      tbody.innerHTML = props.map(p => {
        const owner = p.ownerId || { name: 'Unknown' };
        return `
          <tr>
            <td>${p.title || '—'}</td>
            <td>${owner.name || 'Unknown'}</td>
            <td>${p.estate || '—'}</td>
            <td>${formatCurrency(p.price)}</td>
            <td><span class="status-badge ${p.status}">${p.status}</span></td>
          </tr>
        `;
      }).join('');
    }
    renderPagination('propsPagination', data.totalPages || 1, currentPage.props, (p) => loadProperties(p, filter));
  } catch (error) {
    console.error('Properties error:', error);
    document.getElementById('propsTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ff6b6b;">Failed to load properties.</td></tr>';
  }
}

// ─── Filter Listeners ─────────────────────────────────────────────
// Subscriptions filter
document.querySelectorAll('#subsFilterNav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#subsFilterNav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSubscriptions(1, btn.dataset.filter);
  });
});

// Properties filter
document.querySelectorAll('#propFilterNav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#propFilterNav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadProperties(1, btn.dataset.filter);
  });
});

// ─── Initial Load ──────────────────────────────────────────────────
loadDashboard();