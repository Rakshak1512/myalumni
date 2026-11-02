/**
 * Alumni Directory & Mentorship Search Page
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderAboutButton } from '../components/featureHelp.js';

export async function renderDirectoryPage() {
  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Alumni Directory & Mentorship Network</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Discover, connect, and receive guidance from verified university graduates.</p>
        </div>
        ${renderAboutButton('directory')}
      </div>

      <!-- Search & Filters -->
      <div class="card" style="margin-bottom: 24px;">
        <form id="directory-filter-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
          <div>
            <label class="form-label" for="filter-name">Alumnus Name</label>
            <input type="text" id="filter-name" class="form-control" placeholder="Search name...">
          </div>

          <div>
            <label class="form-label" for="filter-company">Company</label>
            <input type="text" id="filter-company" class="form-control" placeholder="Apex Tech, Google...">
          </div>

          <div>
            <label class="form-label" for="filter-role">Job Title</label>
            <input type="text" id="filter-role" class="form-control" placeholder="Cloud Engineer...">
          </div>

          <div>
            <label class="form-label" for="filter-skills">Skill</label>
            <input type="text" id="filter-skills" class="form-control" placeholder="Python, Kubernetes...">
          </div>

          <div>
            <label class="form-label" for="filter-year">Grad Year</label>
            <input type="text" id="filter-year" class="form-control" placeholder="2021">
          </div>

          <div>
            <label class="form-label" for="filter-mentor">Mentorship Status</label>
            <select id="filter-mentor" class="form-control">
              <option value="">All Alumni</option>
              <option value="true">Available Mentors Only</option>
            </select>
          </div>

          <div style="display: flex; align-items: flex-end; gap: 8px;">
            <button type="submit" class="btn btn-primary" style="flex: 1; padding: 10px;">Apply Filters</button>
            <button type="button" id="reset-filters-btn" class="btn btn-outline" style="padding: 10px;">Reset</button>
          </div>
        </form>
      </div>

      <!-- Alumni Cards Grid -->
      <div id="alumni-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        <div style="text-align: center; padding: 40px; color: var(--slate-500); grid-column: 1 / -1;">
          Loading verified alumni directory...
        </div>
      </div>
    </div>
  `;
}

export async function initDirectoryPage() {
  const grid = document.getElementById('alumni-grid');
  const form = document.getElementById('directory-filter-form');
  const resetBtn = document.getElementById('reset-filters-btn');

  const fetchAndRender = async (params = {}) => {
    try {
      const res = await api.searchAlumni(params);
      const alumni = res.data || [];

      if (alumni.length === 0) {
        grid.innerHTML = `
          <div class="card empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No alumni found</div>
            <p>Try broadening your search keywords or resetting filters.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = alumni.map(u => {
        const p = u.profile || {};
        const isMentor = p.isMentoringAvailable;
        const currentUid = authState.user?.uid;
        const isSelf = (u.id === currentUid);

        return `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; gap: 12px; align-items: center;">
                  <div style="width: 44px; height: 44px; border-radius: var(--radius-full); background: var(--teal-50); color: var(--teal-600); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; overflow: hidden; position: relative; flex-shrink: 0;">
                    ${u.avatarUrl ? `<img src="${escapeHtml(u.avatarUrl)}" alt="${escapeHtml(u.displayName)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
                    <div style="display: ${u.avatarUrl ? 'none' : 'flex'}; width: 100%; height: 100%; align-items: center; justify-content: center;">
                      ${(u.displayName || 'A').substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <h3 style="font-size: 16px; font-weight: 700; color: var(--navy-900);">${escapeHtml(u.displayName)}</h3>
                    <div style="font-size: 12px; color: var(--slate-500);">${escapeHtml(p.jobTitle || 'Alumnus')}</div>
                  </div>
                </div>
                ${isMentor ? `<span class="badge badge-emerald">Mentor</span>` : ''}
              </div>

              <div style="font-size: 13px; color: var(--slate-700); margin-bottom: 12px;">
                <strong>${escapeHtml(p.company || 'Enterprise')}</strong> • Class of ${p.graduationYear || 'N/A'}
              </div>

              <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 14px; line-height: 1.5; min-height: 40px;">
                ${escapeHtml(u.bio || 'Experienced graduate offering career mentorship and industry networking.')}
              </p>

              ${p.skills && p.skills.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
                  ${p.skills.slice(0, 4).map(s => `<span class="badge badge-navy">${escapeHtml(s)}</span>`).join('')}
                </div>
              ` : ''}
            </div>

            <div style="border-top: var(--glass-border); padding-top: 14px; display: flex; gap: 8px;">
              ${!isSelf ? `
                <button type="button" class="btn btn-outline btn-sm connect-btn" data-uid="${u.id}" data-name="${escapeHtml(u.displayName)}" data-tooltip="Send professional connection invitation" style="flex: 1;">
                  Connect
                </button>
                ${isMentor ? `
                  <button type="button" class="btn btn-primary btn-sm mentor-btn" data-uid="${u.id}" data-name="${escapeHtml(u.displayName)}" data-tooltip="Send personalized mentorship request" style="flex: 1;">
                    Request Mentor
                  </button>
                ` : `
                  <a href="#/messages?recipientId=${u.uid || u.id}" class="btn btn-primary btn-sm" data-tooltip="Initiate direct peer chat" style="flex: 1; text-align: center;">Message</a>
                `}
              ` : `
                <span class="badge badge-teal" style="width: 100%; justify-content: center; padding: 6px;">Your Profile</span>
              `}
            </div>
          </div>
        `;
      }).join('');

      // Wire up Connect buttons
      document.querySelectorAll('.connect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetUid = btn.getAttribute('data-uid');
          const targetName = btn.getAttribute('data-name');
          openConnectModal(targetUid, targetName);
        });
      });

      // Wire up Request Mentor buttons
      document.querySelectorAll('.mentor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetUid = btn.getAttribute('data-uid');
          const targetName = btn.getAttribute('data-name');
          openMentorModal(targetUid, targetName);
        });
      });

    } catch (e) {
      grid.innerHTML = `<div class="card" style="grid-column: 1 / -1; color: var(--color-danger);">Failed to load alumni: ${escapeHtml(e.message)}</div>`;
    }
  };

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      fetchAndRender({
        name: document.getElementById('filter-name').value.trim(),
        company: document.getElementById('filter-company').value.trim(),
        jobTitle: document.getElementById('filter-role').value.trim(),
        skills: document.getElementById('filter-skills').value.trim(),
        graduationYear: document.getElementById('filter-year').value.trim(),
        isMentoringAvailable: document.getElementById('filter-mentor').value
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      fetchAndRender();
    });
  }

  // Initial load
  fetchAndRender();
}

function openConnectModal(targetUid, targetName) {
  const content = `
    <p style="font-size: 14px; color: var(--slate-600); margin-bottom: 14px;">
      Send a professional connection request to <strong>${escapeHtml(targetName)}</strong>.
    </p>
    <div class="form-group">
      <label class="form-label" for="connect-msg">Introduction Message (Optional)</label>
      <textarea id="connect-msg" class="form-control" placeholder="Hi ${escapeHtml(targetName)}, I would like to connect with you on MyAlumni to learn more about your career..."></textarea>
    </div>
  `;

  const footer = `
    <button type="button" class="btn btn-outline" id="cancel-connect-btn">Cancel</button>
    <button type="button" class="btn btn-primary" id="confirm-connect-btn">Send Connection Request</button>
  `;

  const { close } = openModal({ title: 'Send Connection Request', contentHtml: content, footerHtml: footer });

  document.getElementById('cancel-connect-btn').addEventListener('click', close);
  document.getElementById('confirm-connect-btn').addEventListener('click', async () => {
    const msg = document.getElementById('connect-msg').value.trim();
    try {
      await api.sendConnectionRequest(targetUid, msg);
      showToast('Connection request dispatched successfully!', 'success');
      close();
    } catch (err) {
      showToast(err.message || 'Failed to send connection request.', 'error');
    }
  });
}

function openMentorModal(targetUid, targetName) {
  const content = `
    <p style="font-size: 14px; color: var(--slate-600); margin-bottom: 14px;">
      Request 1-on-1 career mentorship from <strong>${escapeHtml(targetName)}</strong>.
    </p>
    <div class="form-group">
      <label class="form-label" for="mentor-goals">Primary Career Goals & Expectations</label>
      <input type="text" id="mentor-goals" class="form-control" placeholder="e.g. Systems design interview prep, resume audit" required>
    </div>
    <div class="form-group">
      <label class="form-label" for="mentor-msg">Personal Message</label>
      <textarea id="mentor-msg" class="form-control" placeholder="Describe your background and what you hope to achieve under their guidance..."></textarea>
    </div>
  `;

  const footer = `
    <button type="button" class="btn btn-outline" id="cancel-mentor-btn">Cancel</button>
    <button type="button" class="btn btn-primary" id="confirm-mentor-btn">Submit Mentorship Request</button>
  `;

  const { close } = openModal({ title: 'Request 1-on-1 Mentorship', contentHtml: content, footerHtml: footer });

  document.getElementById('cancel-mentor-btn').addEventListener('click', close);
  document.getElementById('confirm-mentor-btn').addEventListener('click', async () => {
    const goals = document.getElementById('mentor-goals').value.trim();
    const msg = document.getElementById('mentor-msg').value.trim();
    if (!goals) {
      showToast('Please state your primary career goals.', 'error');
      return;
    }
    try {
      await api.requestMentorship(targetUid, goals, msg);
      showToast('Mentorship request submitted to mentor!', 'success');
      close();
    } catch (err) {
      showToast(err.message || 'Failed to submit mentorship request.', 'error');
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

