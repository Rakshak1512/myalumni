/**
 * Unauthorized Access Page Component
 * Displayed when a user accesses a route without the required role permissions.
 */
export function renderUnauthorizedPage(currentRole = 'alumni', requiredRoles = ['admin']) {
  return `
    <div style="min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="card" style="max-width: 520px; width: 100%; text-align: center; padding: 44px 32px; box-shadow: var(--shadow-lg);">
        <div style="font-size: 56px; margin-bottom: 18px;">🛡️</div>
        <span class="badge badge-warning" style="margin-bottom: 14px; font-size: 12px; padding: 5px 12px;">
          PERMISSION DENIED
        </span>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--navy-900); margin-bottom: 12px;">
          Restricted Console Access
        </h2>
        <p style="color: var(--slate-600); font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
          Access to this management console is strictly restricted to system administrators.<br>
          You are currently signed in with the role <strong style="color: var(--teal-700); text-transform: uppercase;">${escapeHtml(currentRole)}</strong>.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <a href="#/dashboard" class="btn btn-primary" style="padding: 10px 24px;">
            ← Return to ${escapeHtml(currentRole.toUpperCase())} Dashboard
          </a>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

