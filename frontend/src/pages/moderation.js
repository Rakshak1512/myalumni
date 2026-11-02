/**
 * Faculty Moderation Queue Page
 */
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { renderAboutButton } from '../components/featureHelp.js';
import { openCertificatePreviewModal } from './achievements.js';

export async function renderModerationPage() {
  return `
    <div>
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Faculty Moderation Desk</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Review submitted alumni opportunities, success stories, and proposed campus events.</p>
        </div>
        ${renderAboutButton('moderation-queue')}
      </div>

      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Opportunities Review -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Pending Opportunity Submissions</h2>
            <span class="badge badge-warning">Queue Inspection</span>
          </div>
          <div id="mod-opps-container">
            <div style="color: var(--text-muted);">Loading pending opportunities...</div>
          </div>
        </div>

        <!-- Achievements Review -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Pending Alumni Achievements</h2>
            <span class="badge badge-warning">Verification Queue</span>
          </div>
          <div id="mod-achieve-container">
            <div style="color: var(--text-muted);">Loading pending achievements...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initModerationPage() {
  const oppsContainer = document.getElementById('mod-opps-container');
  const achieveContainer = document.getElementById('mod-achieve-container');

  const loadAll = async () => {
    try {
      const [oRes, aRes] = await Promise.all([
        api.getPendingOpportunities().catch(() => ({ data: [] })),
        api.getPendingAchievements().catch(() => ({ data: [] }))
      ]);

      const opps = oRes.data || [];
      const achieve = aRes.data || [];

      // Render Opps
      if (opps.length === 0) {
        oppsContainer.innerHTML = `<p style="font-size: 13px; color: var(--slate-400);">No pending opportunities in review queue.</p>`;
      } else {
        oppsContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${opps.map(o => `
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; background: #ffffff;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="color: var(--navy-900); font-size: 15px;">${escapeHtml(o.title)}</strong>
                  <span class="badge badge-warning">PENDING REVIEW</span>
                </div>
                <div style="font-size: 13px; color: var(--teal-700); font-weight: 600; margin-bottom: 8px;">
                  ${escapeHtml(o.company)} • ${escapeHtml(o.location)} • Posted by ${escapeHtml(o.postedByName || 'Alumnus')}
                </div>
                <p style="font-size: 13px; color: var(--slate-600); line-height: 1.5; margin-bottom: 12px;">
                  ${escapeHtml(o.description)}
                </p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                  <button type="button" class="btn btn-outline btn-sm reject-opp-btn" data-id="${o.id}" data-tooltip="Decline unverified posting" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">Reject</button>
                  <button type="button" class="btn btn-primary btn-sm approve-opp-btn" data-id="${o.id}" data-tooltip="Publish verified opportunity to campus board">Approve & Publish</button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Render Achievements
      if (achieve.length === 0) {
        achieveContainer.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); padding: 12px 0;">No pending achievements in review queue.</p>`;
      } else {
        achieveContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${achieve.map(a => {
              const certUrl = a.proofUrl || a.supportingUrl;
              return `
                <div style="border: var(--glass-border); border-radius: var(--radius-md); padding: 18px; background: var(--bg-card);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                    <strong style="color: var(--text-heading); font-size: 15px;">${escapeHtml(a.title)}</strong>
                    <span class="badge badge-warning">PENDING REVIEW</span>
                  </div>
                  <div style="font-size: 13px; color: var(--text-dim); margin-bottom: 8px;">
                    Submitted by <strong>${escapeHtml(a.userName || 'Alumnus')}</strong> (${(a.category || 'general').replace('_', ' ').toUpperCase()})
                  </div>
                  <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px;">
                    ${escapeHtml(a.description)}
                  </p>
                  ${certUrl ? `
                    <div style="margin-bottom: 14px; padding: 10px 14px; background: rgba(56, 189, 248, 0.08); border-radius: var(--radius-sm); border: 1px solid rgba(56, 189, 248, 0.2); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span>📜</span>
                        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9;">
                          ${escapeHtml(a.proofFilename || 'Certificate Proof Document')}
                        </span>
                        ${a.fileSize ? `<span style="font-size: 11px; color: var(--text-dim);">(${Math.round(a.fileSize / 1024)} KB)</span>` : ''}
                      </div>
                      <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn btn-outline btn-sm inspect-cert-btn"
                          data-url="${escapeHtml(certUrl)}"
                          data-filename="${escapeHtml(a.proofFilename || 'Certificate Proof')}"
                          data-title="${escapeHtml(a.title)}"
                          style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); display: inline-flex; align-items: center; gap: 4px;">
                          👁️ Inspect Certificate
                        </button>
                        <a href="${escapeHtml(api.getFileDownloadUrl(certUrl, false))}"
                          download="${escapeHtml(a.proofFilename || 'certificate')}"
                          class="btn btn-primary btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                          ⬇ Download
                        </a>
                      </div>
                    </div>
                  ` : `
                    <div style="margin-bottom: 12px; font-size: 12px; color: var(--text-dim); font-style: italic;">
                      No certificate document attached to this claim.
                    </div>
                  `}
                  <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-outline btn-sm reject-ach-btn" data-id="${a.id}" data-tooltip="Decline achievement claim" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">Reject</button>
                    <button type="button" class="btn btn-primary btn-sm approve-ach-btn" data-id="${a.id}" data-tooltip="Verify and publish achievement story">Approve & Showcase</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      // Wire opp buttons
      document.querySelectorAll('.approve-opp-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await api.reviewOpportunity(id, 'approved', 'Approved by faculty.');
          showToast('Opportunity approved and published!', 'success');
          loadAll();
        });
      });
      document.querySelectorAll('.reject-opp-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await api.reviewOpportunity(id, 'rejected', 'Did not meet criteria.');
          showToast('Opportunity rejected.', 'info');
          loadAll();
        });
      });

      // Wire ach buttons
      document.querySelectorAll('.inspect-cert-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const certUrl = btn.getAttribute('data-url');
          const certFilename = btn.getAttribute('data-filename');
          const title = btn.getAttribute('data-title');
          openCertificatePreviewModal({ certUrl, certFilename, title });
        });
      });

      document.querySelectorAll('.approve-ach-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await api.reviewAchievement(id, 'approved', 'Verified and approved.');
          showToast('Achievement approved!', 'success');
          loadAll();
        });
      });
      document.querySelectorAll('.reject-ach-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await api.reviewAchievement(id, 'rejected', 'Submission requires revision.');
          showToast('Achievement rejected.', 'info');
          loadAll();
        });
      });

    } catch (e) {
      oppsContainer.innerHTML = `<p style="color: var(--color-danger);">Error loading moderation queue.</p>`;
    }
  };

  // Initial load
  loadAll();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

