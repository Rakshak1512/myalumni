/**
 * Topbar / Navbar Component
 * Features Theme Toggle (☀️/🌙), Notification Badge, User Profile Dropdown
 */
import { authState } from '../auth/authContext.js';
import { toggleTheme, getPreferredTheme } from '../services/theme.js';

export function renderTopbar(title = 'Dashboard', unreadNotifs = 0) {
  const user = authState.user;
  const displayName = user?.displayName || 'User';
  const role = (authState.role || 'student').toLowerCase();
  const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const themeIcon = currentTheme === 'dark' ? '☀️' : '🌙';
  const themeTooltip = currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  return `
    <header class="topbar">
      <div style="display: flex; align-items: center; gap: 14px;">
        <button type="button" class="btn btn-outline btn-sm" id="mobile-toggle-btn" style="display: none;" aria-label="Toggle navigation">
          ☰
        </button>
        <div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-heading); margin-bottom: 2px;">${escapeHtml(title)}</h2>
          <span style="font-size: 11.5px; color: var(--text-dim); text-transform: capitalize;">${role} Workspace</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 14px;">
        <!-- Theme Toggle Button -->
        <button type="button" class="theme-toggle-btn" id="theme-toggle-btn" title="${themeTooltip}" aria-label="Toggle Theme">
          ${themeIcon}
        </button>

        <!-- Notifications -->
        <a href="#/notifications" class="btn btn-outline btn-sm" style="position: relative; padding: 8px 12px;" title="Notifications">
          🔔
          ${unreadNotifs > 0 ? `<span class="badge badge-emerald" style="position: absolute; top: -6px; right: -6px; padding: 2px 6px; font-size: 10px;">${unreadNotifs}</span>` : ''}
        </a>

        <!-- User Profile Pill -->
        <a href="#/settings" style="display: flex; align-items: center; gap: 10px; padding: 6px 12px; background: var(--bg-subtle); border-radius: var(--radius-full); border: var(--glass-border); text-decoration: none;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--section-accent), var(--section-accent-secondary)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; box-shadow: 0 0 10px var(--section-glow);">
            ${displayName.charAt(0).toUpperCase()}
          </div>
          <span style="color: var(--text-heading); font-weight: 600; font-size: 13.5px;">${escapeHtml(displayName)}</span>
        </a>
      </div>
    </header>
  `;
}

// Attach listener to theme toggle button dynamically
export function initTopbarEvents() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      toggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      toggleBtn.title = newTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  }

  const mobileBtn = document.getElementById('mobile-toggle-btn');
  const sidebar = document.getElementById('app-sidebar');
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
