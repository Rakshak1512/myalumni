/**
 * Opportunities (Jobs, Internships, Referrals) & Career Application Tracker
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderAboutButton } from '../components/featureHelp.js';
import { createUniversalFileUploader } from '../components/universalFileUploader.js';

export async function renderOpportunitiesPage() {
  const role = authState.role;
  const canPost = ['alumni', 'faculty', 'admin'].includes(role);

  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Jobs, Internships & Referrals</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Explore curated opportunities directly verified by alumni and faculty.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          ${renderAboutButton('opportunities')}
          ${canPost ? `
            <button type="button" id="post-opp-btn" class="btn btn-primary" data-tooltip="Post new job, internship or referral listing">
              + Post Opportunity
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Tab Navigation -->
      <div style="display: flex; gap: 8px; border-bottom: var(--glass-border); margin-bottom: 24px;">
        <button type="button" class="btn btn-outline opp-tab active" data-tab="catalog" style="border-bottom: none; border-radius: var(--radius-md) var(--radius-md) 0 0;">
          All Opportunities
        </button>
        <button type="button" class="btn btn-outline opp-tab" data-tab="tracker" style="border-bottom: none; border-radius: var(--radius-md) var(--radius-md) 0 0;">
          My Application Tracker
        </button>
        <button type="button" class="btn btn-outline opp-tab" data-tab="saved" style="border-bottom: none; border-radius: var(--radius-md) var(--radius-md) 0 0;">
          Saved Bookmarks
        </button>
      </div>

      <!-- Tab Contents -->
      <div id="opp-catalog-view">
        <div id="opp-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
          <div style="text-align: center; padding: 40px; color: var(--slate-400); grid-column: 1 / -1;">
            Loading opportunities...
          </div>
        </div>
      </div>

      <div id="opp-tracker-view" style="display: none;">
        <div class="card" style="margin-bottom: 20px;">
          <h3 class="card-title" style="margin-bottom: 8px;">Private Career Application Tracker</h3>
          <p style="font-size: 13px; color: var(--slate-600);">Keep private records of roles you have bookmarked, applied to, or interviewed for.</p>
        </div>
        <div id="tracker-table-container">
          <div style="text-align: center; padding: 30px; color: var(--slate-400);">Loading application tracker...</div>
        </div>
      </div>

      <div id="opp-saved-view" style="display: none;">
        <div id="saved-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
          <div style="text-align: center; padding: 40px; color: var(--slate-400); grid-column: 1 / -1;">
            Loading saved bookmarks...
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initOpportunitiesPage() {
  const tabs = document.querySelectorAll('.opp-tab');
  const catalogView = document.getElementById('opp-catalog-view');
  const trackerView = document.getElementById('opp-tracker-view');
  const savedView = document.getElementById('opp-saved-view');
  const oppGrid = document.getElementById('opp-grid');
  const trackerContainer = document.getElementById('tracker-table-container');
  const savedGrid = document.getElementById('saved-grid');
  const postBtn = document.getElementById('post-opp-btn');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');

      catalogView.style.display = target === 'catalog' ? 'block' : 'none';
      trackerView.style.display = target === 'tracker' ? 'block' : 'none';
      savedView.style.display = target === 'saved' ? 'block' : 'none';

      if (target === 'tracker') loadTracker();
      if (target === 'saved') loadSaved();
    });
  });

  const loadCatalog = async () => {
    try {
      const res = await api.getOpportunities();
      const opps = res.data || [];

      if (opps.length === 0) {
        oppGrid.innerHTML = `
          <div class="card empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">💼</div>
            <div class="empty-state-title">No approved opportunities yet</div>
            <p>Check back soon or post a new referral opportunity.</p>
          </div>
        `;
        return;
      }

      oppGrid.innerHTML = opps.map(o => renderOpportunityCard(o)).join('');
      attachCardListeners();
    } catch (e) {
      console.error('Failed to load opportunities:', e);
      oppGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; border-left: 4px solid var(--color-danger);">
          <h3 style="color: var(--color-danger); font-size: 16px; margin-bottom: 6px;">Failed to load opportunities</h3>
          <p style="color: var(--slate-600); font-size: 13px; margin-bottom: 12px;">${escapeHtml(e.message || 'The server could not process the request.')}</p>
          <button type="button" class="btn btn-outline btn-sm" id="retry-opps-btn">↻ Retry Loading</button>
        </div>
      `;
      document.getElementById('retry-opps-btn')?.addEventListener('click', loadCatalog);
    }
  };

  const loadSaved = async () => {
    try {
      const res = await api.getSavedOpportunities();
      const saved = res.data || [];

      if (saved.length === 0) {
        savedGrid.innerHTML = `
          <div class="card empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🔖</div>
            <div class="empty-state-title">No saved bookmarks</div>
            <p>Click "Save" on any opportunity card to bookmark it here.</p>
          </div>
        `;
        return;
      }

      savedGrid.innerHTML = saved.map(o => renderOpportunityCard(o)).join('');
      attachCardListeners();
    } catch (e) {
      console.error('Failed to load bookmarks:', e);
      savedGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; border-left: 4px solid var(--color-danger);">
          <h3 style="color: var(--color-danger); font-size: 16px; margin-bottom: 6px;">Failed to load bookmarks</h3>
          <p style="color: var(--slate-600); font-size: 13px; margin-bottom: 12px;">${escapeHtml(e.message || 'Error loading saved items.')}</p>
          <button type="button" class="btn btn-outline btn-sm" id="retry-saved-btn">↻ Retry Loading</button>
        </div>
      `;
      document.getElementById('retry-saved-btn')?.addEventListener('click', loadSaved);
    }
  };

  const loadTracker = async () => {
    try {
      const res = await api.getApplications();
      const apps = res.data || [];

      if (apps.length === 0) {
        trackerContainer.innerHTML = `
          <div class="card empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No tracked applications</div>
            <p>Click "Track Application" on any job or internship card to manage your interview progress.</p>
          </div>
        `;
        return;
      }

      trackerContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Company</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${apps.map(a => `
                <tr>
                  <td><strong>${escapeHtml(a.opportunityTitle || 'Opportunity')}</strong></td>
                  <td>${escapeHtml(a.company || 'N/A')}</td>
                  <td>
                    <span class="badge ${a.status === 'offered' ? 'badge-emerald' :
          a.status === 'interviewing' ? 'badge-teal' :
            a.status === 'not_selected' ? 'badge-danger' : 'badge-navy'
        }">
                      ${a.status.toUpperCase()}
                    </span>
                  </td>
                  <td>${a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : 'N/A'}</td>
                  <td style="max-width: 250px; font-size: 13px; color: var(--slate-600);">${escapeHtml(a.notes || 'No private notes added.')}</td>
                  <td>
                    <button type="button" class="btn btn-outline btn-sm edit-track-btn" data-id="${a.opportunityId}" data-status="${a.status}" data-notes="${escapeHtml(a.notes || '')}">
                      Update
                    </button>
                    ${(a.resumeUrl || a.resume_url) ? `
                      <a href="${escapeHtml(api.getFileDownloadUrl(a.resumeUrl || a.resume_url))}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="margin-left: 6px; text-decoration: none;" title="Download attached resume">
                        📄 Resume ↗
                      </a>
                    ` : ''}
                    ${(a.applicationUrl && !a.applicationUrl.includes('.example')) ? `
                      <a href="${escapeHtml(a.applicationUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="margin-left: 6px; text-decoration: none;">
                        Apply Link ↗
                      </a>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      document.querySelectorAll('.edit-track-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const oppId = btn.getAttribute('data-id');
          const currentStatus = btn.getAttribute('data-status');
          const currentNotes = btn.getAttribute('data-notes');
          openTrackModal(oppId, 'Update Application', currentStatus, currentNotes);
        });
      });

    } catch (e) {
      trackerContainer.innerHTML = `<div class="card" style="color: var(--color-danger);">Failed to load tracker: ${escapeHtml(e.message)}</div>`;
    }
  };

  const DEFAULT_APPLY_URL = 'https://tinyurl.com/hcl-fresher-recruitment';

  const renderOpportunityCard = (o) => {
    const rawUrl = (o.applicationUrl || o.application_url || '').trim();
    const applyUrl = (rawUrl && !rawUrl.includes('.example') && !rawUrl.includes('.invalid'))
      ? rawUrl
      : (rawUrl ? rawUrl : '');
    const rawJd = (o.attachmentUrl || o.attachment_url || '').trim();
    const jdDownloadUrl = rawJd ? api.getFileDownloadUrl(rawJd) : null;
    const jdFilename = o.attachmentFilename || o.attachment_filename || 'Job Spec';

    return `
      <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <span class="badge badge-amber">${(o.type || 'JOB').toUpperCase()}</span>
            <button type="button" class="btn btn-outline btn-sm save-opp-btn" data-id="${o.id}" data-tooltip="Bookmark opportunity" style="padding: 4px 8px;" title="Bookmark">
              🔖
            </button>
          </div>

          <h3 style="font-size: 17px; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
            ${escapeHtml(o.title)}
          </h3>
          <div style="font-size: 13px; font-weight: 600; color: var(--neon-amber); margin-bottom: 8px;">
            ${escapeHtml(o.company)} • ${escapeHtml(o.location || 'Remote')} ${o.isRemote ? '(Remote)' : ''}
          </div>

          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.5; min-height: 50px;">
            ${escapeHtml(o.description)}
          </p>

          <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 14px; border-top: var(--glass-border); padding-top: 10px;">
            Posted by <strong>${escapeHtml(o.postedByName || o.posted_by_user_name || 'Alumni')}</strong> (${escapeHtml(o.postedByRole || 'Alumni')})
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-top: var(--glass-border); padding-top: 12px; flex-wrap: wrap;">
          ${jdDownloadUrl ? `
            <a href="${escapeHtml(jdDownloadUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" data-tooltip="Download job specification (${escapeHtml(jdFilename)})" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
              📄 Job Spec ↗
            </a>
          ` : ''}
          ${applyUrl ? `
            <a href="${escapeHtml(applyUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" data-tooltip="Navigate to verified recruiter portal" style="flex: 1; min-width: 110px; text-align: center; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
              Apply Now ↗
            </a>
          ` : ''}
          <button type="button" class="btn btn-outline btn-sm track-opp-btn" data-id="${o.id}" data-title="${escapeHtml(o.title)}" data-tooltip="Record private interview stage & notes">
            Track Role
          </button>
        </div>
      </div>
    `;
  };

  const attachCardListeners = () => {
    document.querySelectorAll('.save-opp-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const res = await api.toggleSaveOpportunity(id);
          showToast(res.message, 'success');
        } catch (e) {
          showToast(e.message || 'Error updating bookmark', 'error');
        }
      });
    });

    document.querySelectorAll('.track-opp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        openTrackModal(id, title);
      });
    });
  };

  const openTrackModal = (oppId, title, currentStatus = 'applied', currentNotes = '') => {
    const content = `
      <p style="font-size: 14px; color: var(--slate-600); margin-bottom: 14px;">
        Track application status for <strong>${escapeHtml(title)}</strong>:
      </p>
      <div class="form-group">
        <label class="form-label" for="track-status">Application Status</label>
        <select id="track-status" class="form-control">
          <option value="interested" ${currentStatus === 'interested' ? 'selected' : ''}>Interested</option>
          <option value="applied" ${currentStatus === 'applied' ? 'selected' : ''}>Applied</option>
          <option value="interviewing" ${currentStatus === 'interviewing' ? 'selected' : ''}>Interviewing</option>
          <option value="offered" ${currentStatus === 'offered' ? 'selected' : ''}>Offered</option>
          <option value="not_selected" ${currentStatus === 'not_selected' ? 'selected' : ''}>Not Selected</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="track-notes">Private Notes</label>
        <textarea id="track-notes" class="form-control" placeholder="Add interview dates, recruiter contact, interview feedback...">${escapeHtml(currentNotes)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Attach Resume / CV Document</label>
        <div id="track-resume-uploader"></div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-outline" id="cancel-track-btn">Cancel</button>
      <button type="button" class="btn btn-primary" id="save-track-btn">Save to Tracker</button>
    `;

    const { close } = openModal({ title: 'Application Tracker', contentHtml: content, footerHtml: footer });

    const trackUploader = createUniversalFileUploader({
      container: document.getElementById('track-resume-uploader'),
      category: 'resumes',
      isPrivate: true,
      multiple: false
    });

    document.getElementById('cancel-track-btn').addEventListener('click', close);
    document.getElementById('save-track-btn').addEventListener('click', async () => {
      const status = document.getElementById('track-status').value;
      const notes = document.getElementById('track-notes').value.trim();
      const rVal = trackUploader ? trackUploader.getValue() : {};

      try {
        await api.trackApplication(
          oppId,
          status,
          notes,
          rVal.fileUrl || null,
          rVal.data?.originalFilename || null
        );
        showToast('Application tracker updated successfully!', 'success');
        close();
        if (trackerView.style.display === 'block') loadTracker();
      } catch (e) {
        showToast(e.message || 'Failed to update application tracker.', 'error');
      }
    });
  };

  // Post Opportunity Modal
  if (postBtn) {
    postBtn.addEventListener('click', () => {
      const content = `
        <form id="create-opp-form">
          <div class="form-group">
            <label class="form-label" for="opp-title">Job / Internship Title <span style="color: var(--color-danger);">*</span></label>
            <input type="text" id="opp-title" class="form-control" placeholder="e.g. Graduate Cloud Engineer" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="opp-company">Company Name <span style="color: var(--color-danger);">*</span></label>
            <input type="text" id="opp-company" class="form-control" placeholder="e.g. Apex Technologies" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="opp-type">Opportunity Type</label>
              <select id="opp-type" class="form-control">
                <option value="job">Full-Time Job</option>
                <option value="internship">Internship</option>
                <option value="referral">Internal Referral</option>
                <option value="graduate_trainee">Graduate Trainee</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="opp-location">Location</label>
              <input type="text" id="opp-location" class="form-control" placeholder="Seattle / Remote">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="opp-desc">Role Description <span style="color: var(--color-danger);">*</span></label>
            <textarea id="opp-desc" class="form-control" rows="3" placeholder="Describe the team, core responsibilities, and qualifications..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="opp-apply-url">Application Portal / Recruiter Link (Optional)</label>
            <input type="url" id="opp-apply-url" class="form-control" placeholder="https://company.com/careers/apply or mailto:recruiter@company.com">
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">External application portal or recruiter contact email for candidates to apply directly.</p>
          </div>
          <div class="form-group">
            <label class="form-label">Job Description Attachment (Optional)</label>
            <div id="opp-jd-uploader"></div>
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Upload job specification document (PDF, DOCX, TXT) for applicants to download.</p>
          </div>
        </form>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-opp-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="submit-opp-btn">Submit Opportunity</button>
      `;

      const { close } = openModal({ title: 'Post New Opportunity', contentHtml: content, footerHtml: footer });

      const jdUploader = createUniversalFileUploader({
        container: document.getElementById('opp-jd-uploader'),
        category: 'resources',
        accept: '.pdf,.doc,.docx,.txt',
        multiple: false
      });

      document.getElementById('cancel-opp-btn').addEventListener('click', close);
      document.getElementById('submit-opp-btn').addEventListener('click', async () => {
        const title = document.getElementById('opp-title').value.trim();
        const company = document.getElementById('opp-company').value.trim();
        const type = document.getElementById('opp-type').value;
        const location = document.getElementById('opp-location').value.trim() || 'Remote';
        const description = document.getElementById('opp-desc').value.trim();
        const applicationUrl = document.getElementById('opp-apply-url').value.trim() || null;
        const jdVal = jdUploader ? jdUploader.getValue() : {};
        const attachmentUrl = jdVal.fileUrl || null;
        const attachmentFilename = jdVal.data?.originalFilename || null;

        if (!title || !company || !description) {
          showToast('Please fill in all required fields.', 'error');
          return;
        }

        try {
          const res = await api.postOpportunity({
            title,
            company,
            type,
            location,
            description,
            applicationUrl,
            attachmentUrl,
            attachmentFilename
          });
          showToast(res.message || 'Opportunity submitted!', 'success');
          close();
          loadCatalog();
        } catch (err) {
          showToast(err.message || 'Failed to submit opportunity.', 'error');
        }
      });
    });
  }

  // Initial load
  loadCatalog();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

