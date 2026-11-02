/**
 * Contact Admin & Support Helpdesk Page
 */
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderAboutButton } from '../components/featureHelp.js';
import { createUniversalFileUploader, getFileIcon } from '../components/universalFileUploader.js';

export async function renderContactAdminPage() {
  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Contact Administration & Support</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Submit inquiries, report platform issues, or request official academic degree verifications.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          ${renderAboutButton('support-desk', 'About Support Desk')}
          <button type="button" id="open-ticket-modal-btn" class="btn btn-primary" data-tooltip="Open official support ticket dialog">
            + New Support Ticket
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">My Submitted Inquiries & Responses</h2>
          <span class="badge badge-info">Audited Support History</span>
        </div>
        <div id="my-tickets-container">
          <div style="color: var(--text-muted); text-align: center; padding: 30px;">Loading your tickets...</div>
        </div>
      </div>
    </div>
  `;
}

export async function initContactAdminPage() {
  const container = document.getElementById('my-tickets-container');
  const openBtn = document.getElementById('open-ticket-modal-btn');

  const loadTickets = async () => {
    try {
      const res = await api.getMyTickets();
      const tickets = res.data || [];

      if (tickets.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">✉️</div>
            <div class="empty-state-title">No support tickets found</div>
            <p>If you need assistance or profile verification, submit a ticket above.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${tickets.map(t => `
            <div style="border: var(--glass-border); border-radius: var(--radius-md); padding: 20px; background: var(--bg-card);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-heading);">${escapeHtml(t.subject)}</h3>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Category: ${escapeHtml(t.category || 'general')} • ${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</div>
                </div>
                <span class="badge ${t.status === 'resolved' ? 'badge-emerald' : t.status === 'in_progress' ? 'badge-teal' : 'badge-warning'}">
                  ${(t.status || 'open').toUpperCase()}
                </span>
              </div>

              <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6; margin-bottom: 14px; background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-sm); border: var(--glass-border);">
                ${escapeHtml(t.description)}
              </p>

              ${t.attachmentUrl ? `
                <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <a href="${api.getFileDownloadUrl(t.attachmentUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 12px; color: #38bdf8; display: inline-flex; align-items: center; gap: 6px;">
                    ${getFileIcon(t.attachmentFilename || t.attachmentUrl)}
                    ${escapeHtml(t.attachmentFilename ? `View Attachment: ${t.attachmentFilename}` : 'View Attachment / Screenshot ↗')}
                  </a>
                </div>
              ` : ''}

              ${t.adminResponse ? `
                <div style="border-left: 3px solid var(--section-accent); background: rgba(var(--section-accent-rgb, 57, 123, 255), 0.08); padding: 14px 16px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
                  <div style="font-weight: 700; font-size: 13px; color: var(--section-accent); margin-bottom: 4px;">
                    Administrator Reply (${escapeHtml(t.respondedBy || 'Admin')}):
                  </div>
                  <p style="font-size: 13px; color: var(--text-heading); line-height: 1.5; margin: 0;">${escapeHtml(t.adminResponse)}</p>
                </div>
              ` : `
                <div style="font-size: 12px; color: var(--text-dim); font-style: italic;">
                  Ticket pending administrative review. You will receive an email update via SMTP upon reply.
                </div>
              `}
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<p style="color: var(--color-danger);">Failed to load tickets: ${escapeHtml(e.message)}</p>`;
    }
  };

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="ticket-cat">Issue Category</label>
          <select id="ticket-cat" class="form-control">
            <option value="academic_verification">Degree / Transcript Verification</option>
            <option value="account">Account Access / Role Inquiry</option>
            <option value="data_correction">Alumni Data Correction</option>
            <option value="bug_report">Technical Bug Report</option>
            <option value="general_inquiry">General Inquiry</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ticket-sub">Subject</label>
          <input type="text" id="ticket-sub" class="form-control" placeholder="Brief summary of your request" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="ticket-desc">Detailed Description</label>
          <textarea id="ticket-desc" class="form-control" placeholder="Provide full context, student ID or graduation year if applicable..." required style="min-height: 120px;"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Screenshot or Diagnostic Document (Optional)</label>
          <div id="ticket-universal-uploader"></div>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-ticket-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="submit-ticket-btn">Submit Ticket</button>
      `;

      const { close } = openModal({ title: 'New Support Ticket', contentHtml: content, footerHtml: footer });

      const ticketUploader = createUniversalFileUploader({
        container: document.getElementById('ticket-universal-uploader'),
        category: 'tickets',
        isPrivate: true,
        multiple: false
      });

      document.getElementById('cancel-ticket-btn').addEventListener('click', close);
      document.getElementById('submit-ticket-btn').addEventListener('click', async () => {
        const category = document.getElementById('ticket-cat').value;
        const subject = document.getElementById('ticket-sub').value.trim();
        const description = document.getElementById('ticket-desc').value.trim();
        const upVal = ticketUploader ? ticketUploader.getValue() : {};

        if (!subject || !description) {
          showToast('Subject and description are required.', 'error');
          return;
        }

        try {
          await api.submitSupportTicket({
            category,
            subject,
            description,
            attachmentUrl: upVal.fileUrl || '',
            attachmentFilename: upVal.data?.originalFilename || ''
          });
          showToast('Support ticket dispatched to administrators!', 'success');
          close();
          loadTickets();
        } catch (e) {
          showToast(e.message || 'Failed to submit ticket.', 'error');
        }
      });
    });
  }

  // Initial load
  loadTickets();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

