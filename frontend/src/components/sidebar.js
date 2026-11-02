/**
 * Role-Based Navigation Sidebar
 */
import { authState } from '../auth/authContext.js';

export function renderSidebar(currentPath = '#/dashboard') {
  const user = authState.user;
  const role = (authState.role || 'student').toLowerCase();
  const displayName = user?.displayName || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const navLinks = [
    { label: 'Dashboard', path: '#/dashboard', icon: '📊', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Alumni Directory', path: '#/directory', icon: '👥', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Mentorship', path: '#/mentorship', icon: '🎯', roles: ['student', 'alumni'] },
    { label: 'Direct Messages', path: '#/messages', icon: '💬', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Opportunities & Jobs', path: '#/opportunities', icon: '💼', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Events & Reunions', path: '#/events', icon: '📅', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Achievements', path: '#/achievements', icon: '🏆', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Birthday Corner', path: '#/birthdays', icon: '🎂', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'BatchVerse', path: '#/batches', icon: '🎓', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Resources & Notices', path: '#/resources', icon: '📚', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { label: 'Career Growth Tracker', path: '#/career-tracker', icon: '🚀', roles: ['student'] },
    { label: 'Career Guide (Rules)', path: '#/career-guide', icon: '🧭', roles: ['student', 'alumni'] },
    { label: 'Moderation Queue', path: '#/faculty/moderation', icon: '🛡️', roles: ['faculty', 'admin'] },
    { label: 'Student Promotion', path: '#/faculty/promotion', icon: '🎓', roles: ['faculty', 'admin'] },
    { label: 'Admin Console', path: '#/admin', icon: '⚙️', roles: ['admin'] },
    { label: 'Support Tickets', path: '#/admin/tickets', icon: '🎫', roles: ['admin'] },
    { label: 'Audit Logs', path: '#/admin/audit-logs', icon: '📜', roles: ['admin'] },
    { label: 'Contact Admin', path: '#/contact-admin', icon: '✉️', roles: ['student', 'alumni', 'faculty'] },
    { label: 'My Settings', path: '#/settings', icon: '⚙️', roles: ['student', 'alumni', 'faculty', 'admin'] },
  ];

  const filteredLinks = navLinks.filter(item => item.roles.includes(role));

  return `
    <aside class="sidebar" id="app-sidebar">
      <div class="sidebar-header">
        <a href="#/dashboard" class="brand-logo">
          <span>MyAlumni</span>
          <span class="brand-badge">2.0</span>
        </a>
        <button type="button" id="sidebar-close-btn" class="sidebar-close-btn" aria-label="Close navigation" title="Close navigation">✕</button>
      </div>

      <div class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        ${filteredLinks.map(link => `
          <a href="${link.path}" class="nav-item ${currentPath === link.path ? 'active' : ''}">
            <span class="nav-icon">${link.icon}</span>
            <span class="nav-label">${link.label}</span>
          </a>
        `).join('')}
      </div>

      <div class="sidebar-footer">
        <div class="user-avatar-mini" style="position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${user?.avatarUrl ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
          <div style="display: ${user?.avatarUrl ? 'none' : 'flex'}; width: 100%; height: 100%; align-items: center; justify-content: center;">${initials}</div>
        </div>
        <div class="user-info-mini">
          <div class="user-name-mini" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
          <span class="user-role-badge role-${role}">${role}</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm" id="sidebar-logout-btn" title="Sign out" aria-label="Sign out" style="padding: 4px 8px; color: #cbd5e1; border-color: rgba(255,255,255,0.15);">
          ⏻
        </button>
      </div>
    </aside>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

