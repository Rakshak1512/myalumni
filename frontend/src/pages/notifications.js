/**
 * Notifications Center Page
 */
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';

export async function renderNotificationsPage() {
  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 14px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--navy-900);">Notifications Center</h1>
          <p style="color: var(--slate-500); font-size: 14px;">Stay informed on connection requests, mentorship decisions, and events.</p>
        </div>
        <button type="button" id="mark-all-read-btn" class="btn btn-outline btn-sm">
          ✓ Mark All as Read
        </button>
      </div>

      <div class="card" style="padding: 0; overflow: hidden; max-width: 800px;">
        <div id="notifications-stream" style="display: flex; flex-direction: column;">
          <div style="padding: 30px; text-align: center; color: var(--slate-400);">Loading notifications...</div>
        </div>
      </div>
    </div>
  `;
}

export async function initNotificationsPage() {
  const stream = document.getElementById('notifications-stream');
  const markAllBtn = document.getElementById('mark-all-read-btn');

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      const notifs = res.data || [];

      if (notifs.length === 0) {
        stream.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔔</div>
            <div class="empty-state-title">No notifications</div>
            <p>You are completely caught up!</p>
          </div>
        `;
        return;
      }

      stream.innerHTML = notifs.map(n => `
        <div class="notif-row" data-id="${n.id}" data-link="${escapeHtml(n.link || '')}" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: ${n.isRead ? '#ffffff' : 'var(--teal-50)'}; cursor: pointer; transition: background var(--transition-fast);">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="color: var(--navy-900); font-size: 14px;">${escapeHtml(n.title)}</strong>
              ${!n.isRead ? `<span class="badge badge-emerald" style="font-size: 10px;">NEW</span>` : ''}
            </div>
            <p style="font-size: 13px; color: var(--slate-600); line-height: 1.4;">${escapeHtml(n.message)}</p>
            <div style="font-size: 11px; color: var(--slate-400); margin-top: 4px;">
              ${n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
            </div>
          </div>
          ${!n.isRead ? `
            <button type="button" class="btn btn-outline btn-sm mark-single-read-btn" data-id="${n.id}" style="padding: 4px 8px; font-size: 11px;">
              Mark Read
            </button>
          ` : ''}
        </div>
      `).join('');

      document.querySelectorAll('.mark-single-read-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          await api.markNotificationAsRead(id);
          loadNotifications();
        });
      });

      document.querySelectorAll('.notif-row').forEach(row => {
        row.addEventListener('click', async () => {
          const id = row.getAttribute('data-id');
          const link = row.getAttribute('data-link');
          await api.markNotificationAsRead(id).catch(() => null);
          if (link) window.location.hash = link;
          else loadNotifications();
        });
      });

    } catch (e) {
      stream.innerHTML = `<p style="padding: 20px; color: var(--color-danger);">Failed to load notifications.</p>`;
    }
  };

  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        await api.markAllNotificationsAsRead();
        showToast('All notifications marked as read.', 'success');
        loadNotifications();
      } catch (e) {
        showToast(e.message || 'Error marking notifications', 'error');
      }
    });
  }

  // Initial load
  loadNotifications();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

