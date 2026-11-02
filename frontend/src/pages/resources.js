/**
 * Academic Resources & Announcements Page
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { createUniversalFileUploader, getFileIcon } from '../components/universalFileUploader.js';

export async function renderResourcesPage() {
  const isPrivileged = ['faculty', 'admin'].includes(authState.role);

  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 14px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--navy-900);">Academic Resources & Official Notices</h1>
          <p style="color: var(--slate-500); font-size: 14px;">Course notes, previous examination papers, and departmental announcements.</p>
        </div>
        ${isPrivileged ? `
          <div style="display: flex; gap: 8px;">
            <button type="button" id="upload-res-btn" class="btn btn-primary">+ Upload Resource</button>
            <button type="button" id="post-ann-btn" class="btn btn-navy">+ Broadcast Notice</button>
          </div>
        ` : ''}
      </div>

      <!-- Tab: Announcements / Academic Resources -->
      <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px;">
        <button type="button" class="btn btn-outline res-tab active" data-tab="announcements">
          Official Announcements
        </button>
        <button type="button" class="btn btn-outline res-tab" data-tab="materials">
          Study Materials & Question Papers
        </button>
      </div>

      <!-- Announcements View -->
      <div id="announcements-view">
        <div id="announcements-feed" style="display: flex; flex-direction: column; gap: 16px; max-width: 840px;">
          <div style="color: var(--slate-400); padding: 30px; text-align: center;">Loading announcements...</div>
        </div>
      </div>

      <!-- Study Materials View -->
      <div id="materials-view" style="display: none;">
        <div id="resources-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
          <div style="color: var(--slate-400); padding: 30px; text-align: center; grid-column: 1 / -1;">Loading study resources...</div>
        </div>
      </div>
    </div>
  `;
}

export async function initResourcesPage() {
  const tabs = document.querySelectorAll('.res-tab');
  const annView = document.getElementById('announcements-view');
  const matView = document.getElementById('materials-view');
  const annFeed = document.getElementById('announcements-feed');
  const resGrid = document.getElementById('resources-grid');
  const uploadBtn = document.getElementById('upload-res-btn');
  const postAnnBtn = document.getElementById('post-ann-btn');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      annView.style.display = target === 'announcements' ? 'block' : 'none';
      matView.style.display = target === 'materials' ? 'block' : 'none';
      if (target === 'materials') loadResources();
    });
  });

  const loadAnnouncements = async () => {
    try {
      const res = await api.getAnnouncements();
      const announcements = res.data || [];

      if (announcements.length === 0) {
        annFeed.innerHTML = `
          <div class="card empty-state">
            <div class="empty-state-icon">📢</div>
            <div class="empty-state-title">No announcements</div>
            <p>Important notices from faculty and administrators will appear here.</p>
          </div>
        `;
        return;
      }

      annFeed.innerHTML = announcements.map(a => `
        <div class="card" style="border-left: 4px solid ${
          a.priority === 'urgent' ? 'var(--color-danger)' :
          a.priority === 'high' ? 'var(--color-warning)' : 'var(--teal-600)'
        };">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <h3 style="font-size: 17px; font-weight: 700; color: var(--navy-900);">${escapeHtml(a.title)}</h3>
            <span class="badge ${a.priority === 'urgent' ? 'badge-danger' : 'badge-teal'}">
              ${(a.priority || 'NORMAL').toUpperCase()}
            </span>
          </div>
          <div style="font-size: 12px; color: var(--slate-400); margin-bottom: 12px;">
            Published by <strong>${escapeHtml(a.publishedByName || 'Staff')}</strong> • Target: ${(a.targetRole || 'all').toUpperCase()}
          </div>
          <p style="font-size: 14px; color: var(--slate-700); line-height: 1.6;">
            ${escapeHtml(a.content)}
          </p>
        </div>
      `).join('');
    } catch (e) {
      annFeed.innerHTML = `<p style="color: var(--color-danger);">Failed to load announcements.</p>`;
    }
  };

  const loadResources = async () => {
    try {
      const res = await api.getResources();
      const resources = res.data || [];

      if (resources.length === 0) {
        resGrid.innerHTML = `
          <div class="card empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">📚</div>
            <div class="empty-state-title">No study materials found</div>
            <p>Faculty will upload notes and previous examination papers here.</p>
          </div>
        `;
        return;
      }

      resGrid.innerHTML = resources.map(r => `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span class="badge badge-navy">${(r.category || 'resource').replace('_', ' ').toUpperCase()}</span>
              <span style="font-size: 12px; color: var(--slate-400);">${escapeHtml(r.fileSize || '')}</span>
            </div>

            <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px;">
              <div style="flex-shrink: 0; padding-top: 2px;">
                ${getFileIcon(r.originalFilename || r.fileUrl || '', r.mimeType || '')}
              </div>
              <div>
                <h3 style="font-size: 16px; font-weight: 700; color: var(--navy-900); margin-bottom: 4px;">
                  ${escapeHtml(r.title)}
                </h3>
                ${r.originalFilename ? `
                  <div style="font-size: 11px; color: #38bdf8; font-weight: 500; margin-bottom: 4px;">
                    📎 ${escapeHtml(r.originalFilename)}
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="font-size: 12px; font-weight: 600; color: var(--teal-700); margin-bottom: 10px;">
              ${escapeHtml(r.targetCourseName || 'All Courses')}
            </div>

            <p style="font-size: 13px; color: var(--slate-600); line-height: 1.5; margin-bottom: 14px;">
              ${escapeHtml(r.description)}
            </p>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; gap: 8px;">
            ${r.fileUrl ? `
              <a href="${escapeHtml(r.fileUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="flex: 1; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                View / Download ↗
              </a>
            ` : (r.externalUrl ? `
              <a href="${escapeHtml(r.externalUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="flex: 1; text-align: center;">
                Open Resource ↗
              </a>
            ` : '')}
            ${isPrivileged ? `
              <button class="btn btn-danger btn-sm del-res-btn" data-id="${r.id}" title="Delete resource">
                Delete
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (e) {
      resGrid.innerHTML = `<p style="color: var(--color-danger); grid-column: 1 / -1;">Failed to load resources.</p>`;
    }
  };

  // Upload Resource Modal
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="res-title">Document Title</label>
          <input type="text" id="res-title" class="form-control" placeholder="e.g. Distributed Systems Exam Archive" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="res-cat">Category</label>
          <select id="res-cat" class="form-control">
            <option value="study_materials">Study Materials & Handbooks</option>
            <option value="previous_question_papers">Previous Question Papers</option>
            <option value="pdf_notes">PDF Lecture Notes</option>
            <option value="lab_resources">Lab Manuals</option>
            <option value="career_prep">Career Preparation Resource</option>
            <option value="external_link">Curated External Web Link</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="res-course">Target Course</label>
          <input type="text" id="res-course" class="form-control" placeholder="e.g. B.S. in Computer Science">
        </div>
        <div class="form-group">
          <label class="form-label">Resource Document or File Attachment</label>
          <div id="res-universal-uploader"></div>
        </div>
        <div class="form-group">
          <label class="form-label" for="res-desc">Description</label>
          <textarea id="res-desc" class="form-control" placeholder="Summarize the contents, syllabus coverage, or author notes..." required></textarea>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-res-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="submit-res-btn">Publish Resource</button>
      `;

      const { close } = openModal({ title: 'Publish Academic Resource', contentHtml: content, footerHtml: footer });

      const uploader = createUniversalFileUploader({
        container: document.getElementById('res-universal-uploader'),
        category: 'resources',
        multiple: false
      });

      document.getElementById('cancel-res-btn').addEventListener('click', close);
      document.getElementById('submit-res-btn').addEventListener('click', async () => {
        const title = document.getElementById('res-title').value.trim();
        const category = document.getElementById('res-cat').value;
        const targetCourseName = document.getElementById('res-course').value.trim();
        const description = document.getElementById('res-desc').value.trim();
        const uploadVal = uploader ? uploader.getValue() : {};
        const url = uploadVal.fileUrl || '';
        const originalFilename = uploadVal.data?.originalFilename || '';
        const fileSize = uploadVal.data?.fileSizeFormatted || '';
        const mimeType = uploadVal.data?.mimeType || 'application/pdf';

        if (!title || !description) {
          showToast('Please provide both title and description.', 'error');
          return;
        }

        try {
          await api.createResource({
            title, category, targetCourseName,
            fileUrl: url, externalUrl: url, description,
            originalFilename, fileSize, mimeType
          });
          showToast('Academic resource published successfully!', 'success');
          close();
          if (matView.style.display === 'block') loadResources();
        } catch (e) {
          showToast(e.message || 'Failed to upload resource.', 'error');
        }
      });
    });
  }

  // Broadcast Notice Modal
  if (postAnnBtn) {
    postAnnBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="ann-title">Announcement Headline</label>
          <input type="text" id="ann-title" class="form-control" placeholder="e.g. 2026 Campus Placement Registration Deadline" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label" for="ann-role">Target Audience</label>
            <select id="ann-role" class="form-control">
              <option value="all">All Community Members</option>
              <option value="student">Students Only</option>
              <option value="alumni">Alumni Only</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ann-priority">Priority</label>
            <select id="ann-priority" class="form-control">
              <option value="normal">Normal</option>
              <option value="high">High Importance</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="ann-content">Notice Content</label>
          <textarea id="ann-content" class="form-control" placeholder="Write the full announcement..." required style="min-height: 120px;"></textarea>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-ann-btn">Cancel</button>
        <button type="button" class="btn btn-navy" id="submit-ann-btn">Publish Notice</button>
      `;

      const { close } = openModal({ title: 'Broadcast Department Notice', contentHtml: content, footerHtml: footer });

      document.getElementById('cancel-ann-btn').addEventListener('click', close);
      document.getElementById('submit-ann-btn').addEventListener('click', async () => {
        const title = document.getElementById('ann-title').value.trim();
        const targetRole = document.getElementById('ann-role').value;
        const priority = document.getElementById('ann-priority').value;
        const contentText = document.getElementById('ann-content').value.trim();

        if (!title || !contentText) {
          showToast('Title and content are required.', 'error');
          return;
        }

        try {
          await api.createAnnouncement({ title, targetRole, priority, content: contentText });
          showToast('Announcement broadcasted!', 'success');
          close();
          loadAnnouncements();
        } catch (e) {
          showToast(e.message || 'Failed to broadcast announcement.', 'error');
        }
      });
    });
  }

  // Initial load
  loadAnnouncements();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

