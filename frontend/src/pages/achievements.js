/**
 * Alumni Achievements Showcase & Submission Page
 * Supports interactive in-app certificate previews (PDF, images) and direct downloads.
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderAboutButton } from '../components/featureHelp.js';
import { createUniversalFileUploader, getFileIcon } from '../components/universalFileUploader.js';

export async function renderAchievementsPage() {
  const role = authState.role;
  const canSubmit = ['alumni', 'student', 'faculty', 'admin'].includes(role);
  const isStaff = ['faculty', 'admin'].includes(role);

  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Alumni Achievements & Success Stories</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Celebrating career promotions, awards, placements, certifications, and milestones.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          ${renderAboutButton('achievements')}
          ${isStaff ? `
            <a href="#/faculty/moderation" class="btn btn-outline" data-tooltip="Inspect and verify submitted achievements in moderation queue">
              🛡️ Moderation Queue
            </a>
          ` : ''}
          ${canSubmit ? `
            <button type="button" id="submit-achieve-btn" class="btn btn-primary" data-tooltip="Submit verified achievement with certificate for review">
              + Submit Achievement
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Tab Navigation -->
      <div style="display: flex; gap: 8px; border-bottom: var(--glass-border); margin-bottom: 24px;">
        <button type="button" class="btn btn-outline ach-tab active" data-tab="showcase" style="border-bottom: none; border-radius: var(--radius-md) var(--radius-md) 0 0;">
          🏆 Community Showcase
        </button>
        <button type="button" class="btn btn-outline ach-tab" data-tab="my-submissions" style="border-bottom: none; border-radius: var(--radius-md) var(--radius-md) 0 0;">
          📋 My Submissions & Status
        </button>
      </div>

      <!-- Community Showcase View -->
      <div id="ach-showcase-view">
        <div id="achievements-feed" style="display: flex; flex-direction: column; gap: 18px; max-width: 850px;">
          <div style="text-align: center; padding: 40px; color: var(--slate-400);">
            Loading achievements showcase...
          </div>
        </div>
      </div>

      <!-- My Submissions View -->
      <div id="ach-submissions-view" style="display: none;">
        <div id="my-submissions-feed" style="display: flex; flex-direction: column; gap: 18px; max-width: 850px;">
          <div style="text-align: center; padding: 40px; color: var(--slate-400);">
            Loading your submissions...
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initAchievementsPage() {
  const tabs = document.querySelectorAll('.ach-tab');
  const showcaseView = document.getElementById('ach-showcase-view');
  const submissionsView = document.getElementById('ach-submissions-view');
  const feed = document.getElementById('achievements-feed');
  const myFeed = document.getElementById('my-submissions-feed');
  const submitBtn = document.getElementById('submit-achieve-btn');

  const switchTab = (target) => {
    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === target) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    if (target === 'showcase') {
      showcaseView.style.display = 'block';
      submissionsView.style.display = 'none';
      loadAchievements();
    } else {
      showcaseView.style.display = 'none';
      submissionsView.style.display = 'block';
      loadMyAchievements();
    }
  };

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  const wireCertificateActions = (container) => {
    container.querySelectorAll('.view-cert-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const certUrl = btn.getAttribute('data-url');
        const certFilename = btn.getAttribute('data-filename');
        const title = btn.getAttribute('data-title');
        openCertificatePreviewModal({ certUrl, certFilename, title });
      });
    });
  };

  const loadAchievements = async () => {
    try {
      const res = await api.getAchievements();
      const achievements = res.data || [];

      if (achievements.length === 0) {
        feed.innerHTML = `
          <div class="card empty-state">
            <div class="empty-state-icon">🏆</div>
            <div class="empty-state-title">No approved achievements yet</div>
            <p>Alumni success stories and verified certifications will be showcased here.</p>
          </div>
        `;
        return;
      }

      feed.innerHTML = achievements.map(a => {
        const certUrl = a.proofUrl || a.supportingUrl;
        const certFilename = a.proofFilename || 'Certificate Document';
        const downloadUrl = certUrl ? api.getFileDownloadUrl(certUrl, false) : null;

        return `
          <div class="card" style="border: var(--glass-border); background: var(--bg-card);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 44px; height: 44px; border-radius: var(--radius-full); background: rgba(20, 184, 166, 0.15); color: var(--neon-teal, #14b8a6); border: 1px solid rgba(20, 184, 166, 0.3); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px;">
                  ${escapeHtml((a.userName || 'A').substring(0, 2).toUpperCase())}
                </div>
                <div>
                  <div style="font-weight: 700; color: var(--text-heading); font-size: 15px;">
                    ${escapeHtml(a.userName || 'Alumnus')}
                    <span style="font-size: 12px; font-weight: normal; color: var(--text-dim); margin-left: 6px;">(${escapeHtml(a.userRole || 'alumni')})</span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-dim);">
                    ${a.createdAt ? new Date(a.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                  </div>
                </div>
              </div>
              <span class="badge badge-emerald">${(a.category || 'milestone').replace('_', ' ').toUpperCase()}</span>
            </div>

            <h3 style="font-size: 17px; font-weight: 700; color: var(--text-heading); margin-bottom: 8px;">
              ${escapeHtml(a.title)}
            </h3>

            <p style="font-size: 14px; color: var(--text-body, var(--slate-300)); line-height: 1.6; margin-bottom: 14px;">
              ${escapeHtml(a.description)}
            </p>

            ${certUrl ? `
              <div style="border-top: var(--glass-border); padding-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: inline-flex; align-items: center; gap: 6px;">
                    ${getFileIcon(certFilename)}
                    ${escapeHtml(certFilename)}
                  </span>
                  ${a.fileSize ? `<span style="font-size: 11px; color: var(--text-dim);">(${Math.round(a.fileSize / 1024)} KB)</span>` : ''}
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button type="button" class="btn btn-outline btn-sm view-cert-btn"
                    data-url="${escapeHtml(certUrl)}"
                    data-filename="${escapeHtml(certFilename)}"
                    data-title="${escapeHtml(a.title)}"
                    style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); display: inline-flex; align-items: center; gap: 4px;">
                    👁️ View Certificate
                  </button>
                  <a href="${escapeHtml(downloadUrl)}"
                    download="${escapeHtml(certFilename)}"
                    class="btn btn-primary btn-sm"
                    style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                    ⬇ Download
                  </a>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      wireCertificateActions(feed);

    } catch (e) {
      console.error('Failed to load achievements showcase:', e);
      feed.innerHTML = `<div class="card" style="color: var(--color-danger);">Failed to load achievements.</div>`;
    }
  };

  const loadMyAchievements = async () => {
    try {
      const res = await api.getMyAchievements();
      const myAchievements = res.data || [];

      if (myAchievements.length === 0) {
        myFeed.innerHTML = `
          <div class="card empty-state">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-title">No submissions yet</div>
            <p>Share your professional certifications, job promotions, or academic awards for verification.</p>
          </div>
        `;
        return;
      }

      myFeed.innerHTML = myAchievements.map(a => {
        const certUrl = a.proofUrl || a.supportingUrl;
        const certFilename = a.proofFilename || 'Certificate Document';
        const downloadUrl = certUrl ? api.getFileDownloadUrl(certUrl, false) : null;
        const status = a.status || 'pending';

        const statusBadge =
          status === 'approved' ? '<span class="badge badge-emerald">✅ APPROVED & SHOWCASED</span>' :
          status === 'rejected' ? '<span class="badge badge-danger">❌ REVISION REQUIRED</span>' :
          '<span class="badge badge-warning">⏳ PENDING VERIFICATION</span>';

        return `
          <div class="card" style="border: var(--glass-border); background: var(--bg-card);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div>
                <span class="badge badge-subtle" style="margin-right: 8px;">${(a.category || 'milestone').replace('_', ' ').toUpperCase()}</span>
                ${statusBadge}
              </div>
              <div style="font-size: 12px; color: var(--text-dim);">
                Submitted: ${a.createdAt ? new Date(a.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
              </div>
            </div>

            <h3 style="font-size: 17px; font-weight: 700; color: var(--text-heading); margin-bottom: 8px;">
              ${escapeHtml(a.title)}
            </h3>

            <p style="font-size: 14px; color: var(--text-body, var(--slate-300)); line-height: 1.6; margin-bottom: 14px;">
              ${escapeHtml(a.description)}
            </p>

            ${a.reviewNotes ? `
              <div style="margin-bottom: 14px; padding: 10px 14px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; border-radius: var(--radius-sm); font-size: 13px; color: var(--text-body);">
                <strong>Reviewer Feedback:</strong> ${escapeHtml(a.reviewNotes)}
                ${a.reviewedBy ? `<span style="color: var(--text-dim); margin-left: 6px;">— ${escapeHtml(a.reviewedBy)}</span>` : ''}
              </div>
            ` : ''}

            ${certUrl ? `
              <div style="border-top: var(--glass-border); padding-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: inline-flex; align-items: center; gap: 6px;">
                    ${getFileIcon(certFilename)}
                    ${escapeHtml(certFilename)}
                  </span>
                  ${a.fileSize ? `<span style="font-size: 11px; color: var(--text-dim);">(${Math.round(a.fileSize / 1024)} KB)</span>` : ''}
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button type="button" class="btn btn-outline btn-sm view-cert-btn"
                    data-url="${escapeHtml(certUrl)}"
                    data-filename="${escapeHtml(certFilename)}"
                    data-title="${escapeHtml(a.title)}"
                    style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); display: inline-flex; align-items: center; gap: 4px;">
                    👁️ View Certificate
                  </button>
                  <a href="${escapeHtml(downloadUrl)}"
                    download="${escapeHtml(certFilename)}"
                    class="btn btn-primary btn-sm"
                    style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                    ⬇ Download
                  </a>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      wireCertificateActions(myFeed);

    } catch (e) {
      console.error('Failed to load user achievements:', e);
      myFeed.innerHTML = `<div class="card" style="color: var(--color-danger);">Failed to load your submissions.</div>`;
    }
  };

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const content = `
        <form id="achieve-form">
          <div class="form-group">
            <label class="form-label" for="ach-title">Achievement Headline <span style="color: var(--color-danger);">*</span></label>
            <input type="text" id="ach-title" class="form-control" placeholder="e.g. Promoted to Principal Architect at Tech Corp" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="ach-cat">Category <span style="color: var(--color-danger);">*</span></label>
            <select id="ach-cat" class="form-control">
              <option value="promotion">Job Promotion</option>
              <option value="job_placement">New Placement / Job Offer</option>
              <option value="certification">Professional Certification (AWS, GCP, PMP, etc.)</option>
              <option value="award">Honor / Award / Recognition</option>
              <option value="higher_education">Higher Degree Admission</option>
              <option value="business_milestone">Startup / Business Milestone</option>
              <option value="competition">Competition / Hackathon Win</option>
              <option value="success_story">Personal Success Story</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ach-desc">Description & Narrative <span style="color: var(--color-danger);">*</span></label>
            <textarea id="ach-desc" class="form-control" rows="4" placeholder="Share your journey, impact, and learnings with the community..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Certificate, Award Document or Verification Link (Optional)</label>
            <div id="ach-universal-uploader"></div>
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Upload a PDF certificate or photo proof (JPG, PNG, WEBP), or paste an external credential verification URL.</p>
          </div>
        </form>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-ach-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="submit-ach-btn">Submit for Review</button>
      `;

      const { close } = openModal({ title: 'Submit Achievement for Verification', contentHtml: content, footerHtml: footer });

      const uploader = createUniversalFileUploader({
        container: document.getElementById('ach-universal-uploader'),
        category: 'achievements',
        accept: '.pdf,.jpg,.jpeg,.png,.webp',
        multiple: false
      });

      document.getElementById('cancel-ach-btn').addEventListener('click', close);
      document.getElementById('submit-ach-btn').addEventListener('click', async () => {
        const title = document.getElementById('ach-title').value.trim();
        const category = document.getElementById('ach-cat').value;
        const description = document.getElementById('ach-desc').value.trim();
        const uploadVal = uploader ? uploader.getValue() : {};
        const certUrl = uploadVal.fileUrl || '';
        const certFilename = uploadVal.data?.originalFilename || '';
        const fileSize = uploadVal.data?.fileSize || null;

        if (!title || !description) {
          showToast('Please fill in both title and description.', 'error');
          return;
        }

        try {
          const res = await api.submitAchievement({
            title,
            category,
            description,
            supportingUrl: certUrl,
            proofUrl: certUrl,
            proofFilename: certFilename,
            fileSize
          });
          showToast(res.message || 'Achievement submitted for review!', 'success');
          close();
          // Switch to My Submissions tab so user immediately sees their record
          switchTab('my-submissions');
        } catch (err) {
          showToast(err.message || 'Failed to submit achievement.', 'error');
        }
      });
    });
  }

  // Initial load
  loadAchievements();
}

/**
 * Interactive In-App Certificate Preview Modal
 * Supports PDF iframe viewing, image inspection (JPG, PNG, WEBP), external credential links,
 * and direct download actions.
 */
export function openCertificatePreviewModal({ certUrl, certFilename, title }) {
  if (!certUrl) {
    showToast('No certificate file is attached to this achievement claim.', 'info');
    return;
  }

  const cleanUrl = certUrl.trim();
  const filename = certFilename || 'Certificate Document';
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const isPdf = ext === 'pdf' || cleanUrl.toLowerCase().includes('.pdf');
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || cleanUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
  const isExternal = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://');
  const isInternalUpload = cleanUrl.includes('/api/v1/static/uploads') || cleanUrl.includes('/api/v1/files/download') || cleanUrl.includes('/static/uploads');

  const inlinePreviewUrl = api.getFileDownloadUrl(cleanUrl, true);
  const directDownloadUrl = api.getFileDownloadUrl(cleanUrl, false);

  let bodyHtml = '';

  if (isExternal && !isInternalUpload) {
    // External credential authority (e.g. Credly, Coursera, LinkedIn)
    bodyHtml = `
      <div style="text-align: center; padding: 28px 16px; background: rgba(15, 23, 42, 0.6); border-radius: 8px;">
        <div style="font-size: 40px; margin-bottom: 12px;">🔗</div>
        <h4 style="color: var(--text-heading); font-size: 16px; margin-bottom: 8px;">External Credential Verification</h4>
        <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6; max-width: 520px; margin: 0 auto 16px auto;">
          This achievement is authenticated through a third-party certification portal or academic issuer.
        </p>
        <div style="background: rgba(30, 41, 59, 0.85); padding: 10px 14px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #38bdf8; word-break: break-all; margin: 0 auto 20px auto; max-width: 540px; border: 1px solid rgba(56, 189, 248, 0.2);">
          ${escapeHtml(cleanUrl)}
        </div>
        <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
          Open Verification Portal ↗
        </a>
      </div>
    `;
  } else if (isPdf) {
    // Native embedded PDF viewer
    bodyHtml = `
      <div>
        <div style="position: relative; width: 100%; height: 520px; background: #0f172a; border-radius: 8px; overflow: hidden; border: 1px solid rgba(56, 189, 248, 0.25);">
          <iframe
            src="${escapeHtml(inlinePreviewUrl)}"
            style="width: 100%; height: 100%; border: none; background: #ffffff;"
            title="${escapeHtml(filename)}"
          ></iframe>
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-dim); flex-wrap: wrap; gap: 8px;">
          <span>📄 Document: <strong>${escapeHtml(filename)}</strong></span>
          <span>In-app PDF viewer • Zoom, page navigation and printing enabled</span>
        </div>
      </div>
    `;
  } else if (isImage) {
    // High-resolution image certificate preview
    bodyHtml = `
      <div>
        <div style="text-align: center; padding: 16px; background: rgba(15, 23, 42, 0.7); border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.25); min-height: 250px; display: flex; align-items: center; justify-content: center;">
          <img
            src="${escapeHtml(inlinePreviewUrl)}"
            alt="${escapeHtml(filename)}"
            style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"
            onerror="this.parentElement.innerHTML='<div style=\"color: var(--color-danger); padding: 20px; text-align: center;\"><strong>Certificate image unavailable</strong><p style=\"font-size: 12px; margin-top: 6px;\">The file could not be loaded from storage.</p></div>'"
          />
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: var(--text-dim); text-align: center;">
          🖼️ <strong>${escapeHtml(filename)}</strong> • Verified Credential Badge
        </div>
      </div>
    `;
  } else {
    // Other file types
    bodyHtml = `
      <div style="text-align: center; padding: 32px 16px; background: rgba(15, 23, 42, 0.6); border-radius: 8px;">
        <div style="font-size: 42px; margin-bottom: 12px;">📁</div>
        <h4 style="color: var(--text-heading); font-size: 16px; margin-bottom: 8px;">${escapeHtml(filename)}</h4>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">
          This document type can be inspected by downloading it directly.
        </p>
        <a href="${escapeHtml(directDownloadUrl)}" download="${escapeHtml(filename)}" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
          ⬇ Download Certificate File
        </a>
      </div>
    `;
  }

  const footerHtml = `
    <div style="display: flex; gap: 10px; justify-content: flex-end; width: 100%; flex-wrap: wrap;">
      ${(!isExternal || isInternalUpload) ? `
        <a href="${escapeHtml(directDownloadUrl)}" download="${escapeHtml(filename)}" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
          ⬇ Download Certificate
        </a>
        <a href="${escapeHtml(inlinePreviewUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
          Open in New Tab ↗
        </a>
      ` : ''}
      <button type="button" class="btn btn-outline btn-sm" id="close-cert-modal-btn">Close</button>
    </div>
  `;

  const { close } = openModal({
    title: `Certificate Preview: ${escapeHtml(title || filename)}`,
    contentHtml: bodyHtml,
    footerHtml
  });

  document.getElementById('close-cert-modal-btn')?.addEventListener('click', close);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
