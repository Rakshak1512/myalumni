/**
 * Admin Console & Governance Page
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderUnauthorizedPage } from './unauthorized.js';
import { renderAboutButton } from '../components/featureHelp.js';

export async function renderAdminConsolePage() {
  if (authState.role !== 'admin') {
    return renderUnauthorizedPage(authState.role, ['admin']);
  }

  return `
    <div>
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Administration & Governance Console</h1>
          <p style="color: var(--text-muted); font-size: 14px;">User authorization, role elevation, academic curriculum, and system audit logs.</p>
        </div>
        ${renderAboutButton('user-management', 'Governance Guide')}
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; flex-wrap: wrap;">
        <button type="button" class="btn btn-outline admin-tab active" data-tab="users" data-tooltip="Manage users, verify roles & account clearance">Users & Roles</button>
        <button type="button" class="btn btn-outline admin-tab" data-tab="tickets" data-tooltip="Inspect and resolve inbound support tickets">Support Desk</button>
        <button type="button" class="btn btn-outline admin-tab" data-tab="curriculum" data-tooltip="Configure accredited courses and cohorts">Curriculum & Cohorts</button>
        <button type="button" class="btn btn-outline admin-tab" data-tab="audit" data-tooltip="Inspect immutable security audit trail">Security Audit Trail</button>
      </div>

      <!-- Users & Roles View -->
      <div id="admin-users-view">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">User Accounts & Authorization</h2>
            ${renderAboutButton('user-management')}
          </div>
          <div id="admin-users-table-container">
            <div style="text-align: center; padding: 30px; color: var(--slate-400);">Loading registered users...</div>
          </div>
        </div>
      </div>

      <!-- Tickets View -->
      <div id="admin-tickets-view" style="display: none;">
        <div class="card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 class="card-title">All Support Requests (SMTP Email Dispatch)</h2>
              <span id="ticket-total-count" class="badge badge-subtle"></span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <select id="admin-ticket-status-filter" class="form-control" style="width: auto; font-size: 13px; padding: 6px 12px;">
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button type="button" id="refresh-tickets-btn" class="btn btn-outline btn-sm" title="Refresh Tickets">↻ Refresh</button>
              ${renderAboutButton('support-desk')}
            </div>
          </div>
          <div id="admin-tickets-table-container">
            <div style="text-align: center; padding: 30px; color: var(--slate-400);">Loading support requests...</div>
          </div>
        </div>
      </div>

      <!-- Curriculum View -->
      <div id="admin-curriculum-view" style="display: none;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Academic Courses</h3>
              <button type="button" id="add-course-btn" class="btn btn-primary btn-sm" data-tooltip="Provision accredited curriculum degree">+ Course</button>
            </div>
            <div id="admin-courses-list"><p style="color: var(--slate-400);">Loading courses...</p></div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Academic Years</h3>
              <div style="display: flex; gap: 8px; align-items: center;">
                ${renderAboutButton('academic-years', 'About Cohorts')}
                <button type="button" id="add-year-btn" class="btn btn-primary btn-sm" data-tooltip="Register official university cohort">+ Year</button>
              </div>
            </div>
            <div id="admin-years-list"><p style="color: var(--slate-400);">Loading academic years...</p></div>
          </div>
        </div>
      </div>

      <!-- Audit Logs View -->
      <div id="admin-audit-view" style="display: none;">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Immutable Security Audit Logs</h2>
            ${renderAboutButton('audit-trail')}
          </div>
          <div id="admin-audit-container">
            <div style="text-align: center; padding: 30px; color: var(--slate-400);">Loading audit logs...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initAdminConsolePage() {
  if (authState.role !== 'admin') {
    return;
  }

  const tabs = document.querySelectorAll('.admin-tab');
  const usersView = document.getElementById('admin-users-view');
  const ticketsView = document.getElementById('admin-tickets-view');
  const curriculumView = document.getElementById('admin-curriculum-view');
  const auditView = document.getElementById('admin-audit-view');

  const usersContainer = document.getElementById('admin-users-table-container');
  const ticketsContainer = document.getElementById('admin-tickets-table-container');
  const coursesList = document.getElementById('admin-courses-list');
  const yearsList = document.getElementById('admin-years-list');
  const auditContainer = document.getElementById('admin-audit-container');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');

      usersView.style.display = target === 'users' ? 'block' : 'none';
      ticketsView.style.display = target === 'tickets' ? 'block' : 'none';
      curriculumView.style.display = target === 'curriculum' ? 'block' : 'none';
      auditView.style.display = target === 'audit' ? 'block' : 'none';

      if (target === 'users') loadUsers();
      if (target === 'tickets') loadTickets();
      if (target === 'curriculum') loadCurriculum();
      if (target === 'audit') loadAudit();
    });
  });

  const loadUsers = async () => {
    try {
      const res = await api.getAdminUsers();
      const users = res.data || [];

      usersContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${escapeHtml(u.displayName || 'User')}</strong></td>
                  <td>${escapeHtml(u.email || '')}</td>
                  <td>
                    ${(u.id === 'demo_admin_uid' || (u.id === authState.user?.uid && u.role === 'admin')) ? `
                      <span class="badge badge-emerald" style="padding: 4px 8px; font-weight: 700;">ADMIN</span>
                    ` : `
                      <select class="form-control role-select" data-id="${u.id}" style="padding: 4px 8px; font-size: 13px; width: 110px;">
                        <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="alumni" ${u.role === 'alumni' ? 'selected' : ''}>Alumni</option>
                        <option value="faculty" ${u.role === 'faculty' ? 'selected' : ''}>Faculty</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                      </select>
                    `}
                  </td>
                  <td>
                    <span class="badge ${u.accountStatus === 'active' ? 'badge-emerald' : 'badge-danger'}">
                      ${(u.accountStatus || 'active').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    ${u.id === 'demo_admin_uid' ? '<span style="color: var(--slate-400); font-size: 12px; font-style: italic;">Protected</span>' : `
                      <button type="button" class="btn btn-outline btn-sm toggle-status-btn" data-id="${u.id}" data-status="${u.accountStatus || 'active'}">
                        ${u.accountStatus === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Role changes
      document.querySelectorAll('.role-select').forEach(sel => {
        sel.addEventListener('change', async () => {
          const id = sel.getAttribute('data-id');
          const newRole = sel.value;
          try {
            await api.updateUserRole(id, newRole);
            showToast(`User role elevated to ${newRole}`, 'success');
          } catch (e) {
            showToast(e.message || 'Error updating role', 'error');
            loadUsers();
          }
        });
      });

      // Status toggle
      document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const curr = btn.getAttribute('data-status');
          const next = curr === 'suspended' ? 'active' : 'suspended';
          try {
            await api.updateUserStatus(id, next);
            showToast(`User status set to ${next}`, 'info');
            loadUsers();
          } catch (e) {
            showToast(e.message || 'Error updating status', 'error');
          }
        });
      });

    } catch (e) {
      usersContainer.innerHTML = `<p style="color: var(--color-danger);">Failed to load users: ${escapeHtml(e.message)}</p>`;
    }
  };

  let currentTicketFilter = 'all';

  const loadTickets = async (filterStatus = currentTicketFilter) => {
    currentTicketFilter = filterStatus;
    const filterSelect = document.getElementById('admin-ticket-status-filter');
    if (filterSelect && filterSelect.value !== filterStatus) {
      filterSelect.value = filterStatus;
    }

    try {
      ticketsContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--slate-400);">
          <div style="font-size: 20px; margin-bottom: 8px;">⏳</div>
          Loading support requests...
        </div>
      `;

      const statusParam = (filterStatus && filterStatus !== 'all') ? filterStatus : null;
      const res = await api.getAllTickets(statusParam);
      const tickets = res.data || [];

      const countBadge = document.getElementById('ticket-total-count');
      if (countBadge) {
        countBadge.textContent = `${tickets.length} total`;
      }

      if (tickets.length === 0) {
        ticketsContainer.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: var(--slate-400);">
            <div style="font-size: 32px; margin-bottom: 8px;">📬</div>
            <div style="font-weight: 600; color: var(--text-heading); font-size: 15px;">No support tickets found</div>
            <p style="font-size: 13px; margin-top: 4px;">There are no support inquiries matching the current filter (${escapeHtml(filterStatus)}).</p>
          </div>
        `;
        return;
      }

      ticketsContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Requester</th>
                <th>Category</th>
                <th>Subject & Inquiry</th>
                <th>Attachment</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.map((t, idx) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(t.requesterName || 'User')}</strong>
                    <span class="badge badge-subtle" style="font-size: 10px; margin-left: 4px; text-transform: uppercase;">
                      ${escapeHtml(t.requesterRole || t.userRole || 'User')}
                    </span>
                    <br>
                    <span style="font-size: 11px; color: var(--slate-400);">${escapeHtml(t.requesterEmail || '')}</span>
                  </td>
                  <td>
                    <span class="badge badge-subtle" style="font-size: 11px;">
                      ${escapeHtml((t.category || 'general').replace(/_/g, ' '))}
                    </span>
                  </td>
                  <td>
                    <strong>${escapeHtml(t.subject)}</strong>
                    <div style="font-size: 12px; color: var(--slate-400); margin-top: 2px; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(t.description || t.message || '')}">
                      ${escapeHtml(t.description || t.message || '')}
                    </div>
                  </td>
                  <td>
                    ${t.attachmentUrl ? `
                      <a href="${api.getFileDownloadUrl(t.attachmentUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 11px; color: #38bdf8; display: inline-flex; align-items: center; gap: 4px;" title="${escapeHtml(t.attachmentFilename || 'View File')}">
                        📎 ${escapeHtml(t.attachmentFilename ? (t.attachmentFilename.length > 15 ? t.attachmentFilename.slice(0, 15) + '...' : t.attachmentFilename) : 'Attachment')}
                      </a>
                    ` : '<span style="color: var(--slate-500); font-size: 11px;">None</span>'}
                  </td>
                  <td>
                    <span class="badge ${t.status === 'resolved' ? 'badge-emerald' : t.status === 'in_progress' ? 'badge-teal' : 'badge-warning'}">
                      ${(t.status || 'open').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style="font-size: 12px; white-space: nowrap;">
                      ${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-primary btn-sm reply-ticket-btn" data-ticket-index="${idx}">
                      ${t.adminResponse ? 'View / Update' : 'Respond'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      document.querySelectorAll('.reply-ticket-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-ticket-index'), 10);
          if (!isNaN(idx) && tickets[idx]) {
            openReplyModal(tickets[idx]);
          }
        });
      });

    } catch (e) {
      ticketsContainer.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 20px;">Failed to load tickets: ${escapeHtml(e.message || 'Error communicating with backend.')}</p>`;
    }
  };

  const openReplyModal = (ticket) => {
    const isAttachment = Boolean(ticket.attachmentUrl);
    const attachmentDownloadUrl = isAttachment ? api.getFileDownloadUrl(ticket.attachmentUrl) : '';

    const content = `
      <div style="background: var(--bg-subtle, rgba(255,255,255,0.04)); border: var(--glass-border, 1px solid rgba(255,255,255,0.1)); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong style="color: var(--text-heading); font-size: 14px;">${escapeHtml(ticket.requesterName || 'User')}</strong>
            <span class="badge badge-subtle" style="font-size: 11px; margin-left: 6px; text-transform: uppercase;">${escapeHtml(ticket.requesterRole || ticket.userRole || 'User')}</span>
            <div style="font-size: 12px; color: var(--slate-400);">${escapeHtml(ticket.requesterEmail || '')}</div>
          </div>
          <div style="text-align: right;">
            <span class="badge ${ticket.status === 'resolved' ? 'badge-emerald' : ticket.status === 'in_progress' ? 'badge-teal' : 'badge-warning'}">
              ${(ticket.status || 'open').toUpperCase()}
            </span>
            <div style="font-size: 11px; color: var(--slate-400); margin-top: 4px;">
              ${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ''}
            </div>
          </div>
        </div>

        <div style="margin-top: 8px; font-size: 13px; color: var(--text-heading); line-height: 1.5;">
          <strong>Subject:</strong> ${escapeHtml(ticket.subject)}
        </div>
        <div style="margin-top: 6px; font-size: 13px; color: var(--text-muted); line-height: 1.5; white-space: pre-wrap; background: var(--bg-dark, rgba(0,0,0,0.2)); padding: 10px; border-radius: 6px;">
          ${escapeHtml(ticket.description || ticket.message || '')}
        </div>

        ${isAttachment ? `
          <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">
            <a href="${escapeHtml(attachmentDownloadUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 12px; color: #38bdf8; display: inline-flex; align-items: center; gap: 6px;">
              📎 View Attachment (${escapeHtml(ticket.attachmentFilename || 'File')}) ↗
            </a>
          </div>
        ` : ''}

        ${ticket.adminResponse ? `
          <div style="margin-top: 12px; border-left: 3px solid #10b981; padding-left: 10px; background: rgba(16, 185, 129, 0.08); padding: 8px 10px; border-radius: 0 4px 4px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #10b981;">Previous Admin Response (${escapeHtml(ticket.respondedBy || 'Admin')}):</div>
            <div style="font-size: 12px; color: var(--text-heading); margin-top: 2px;">${escapeHtml(ticket.adminResponse)}</div>
          </div>
        ` : ''}
      </div>

      <div class="form-group">
        <label class="form-label" for="ticket-reply-text">Administrator Response</label>
        <textarea id="ticket-reply-text" class="form-control" placeholder="Write the response that will be emailed to the requester via SMTP..." required style="min-height: 110px;">${escapeHtml(ticket.adminResponse || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label" for="ticket-next-status">Update Ticket Status</label>
        <select id="ticket-next-status" class="form-control">
          <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-outline" id="cancel-reply-btn">Cancel</button>
      <button type="button" class="btn btn-primary" id="send-reply-btn">Dispatch Response</button>
    `;

    const { close } = openModal({ title: `Support Ticket: ${escapeHtml(ticket.subject)}`, contentHtml: content, footerHtml: footer });

    document.getElementById('cancel-reply-btn').addEventListener('click', close);
    document.getElementById('send-reply-btn').addEventListener('click', async () => {
      const responseText = document.getElementById('ticket-reply-text').value.trim();
      const status = document.getElementById('ticket-next-status').value;

      if (!responseText) {
        showToast('Response message is required.', 'error');
        return;
      }

      try {
        await api.respondToTicket(ticket.id, responseText, status);
        showToast('Response dispatched and user notified via SMTP!', 'success');
        close();
        loadTickets();
      } catch (e) {
        showToast(e.message || 'Error responding to ticket.', 'error');
      }
    });
  };

  const loadCurriculum = async () => {
    try {
      const [cRes, yRes] = await Promise.all([
        api.getCourses().catch(() => ({ data: [] })),
        api.getAcademicYears().catch(() => ({ data: [] }))
      ]);

      const courses = cRes.data || [];
      const years = yRes.data || [];

      coursesList.innerHTML = courses.map(c => `
        <div style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${escapeHtml(c.name)}</strong> <span class="badge badge-navy" style="font-size: 11px;">${escapeHtml(c.code)}</span>
            <div style="font-size: 12px; color: var(--slate-500); margin-top: 2px;">${escapeHtml(c.department || 'General')} • ${c.durationYears || 4} Years (${escapeHtml(c.degreeType || 'Undergraduate')})</div>
          </div>
          <button type="button" class="btn btn-outline btn-sm delete-course-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3); padding: 4px 8px;">
            Delete
          </button>
        </div>
      `).join('') || '<p style="color: var(--slate-400); padding: 10px;">No courses found.</p>';

      yearsList.innerHTML = years.map(y => `
        <div style="border: 1px solid var(--border-color); padding: 14px 16px; border-radius: var(--radius-sm); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: var(--bg-card);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="color: var(--text-heading); font-size: 15px;">${escapeHtml(y.name)}</strong>
              ${y.isCurrent ? '<span class="badge badge-emerald" style="font-size: 11px;">CURRENT SESSION</span>' : ''}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
              ${y.startDate || 'N/A'} to ${y.endDate || 'N/A'}
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${!y.isCurrent ? `
              <button type="button" class="btn btn-outline btn-sm set-current-year-btn" data-id="${y.id}" data-name="${escapeHtml(y.name)}" data-tooltip="Set as active university academic session" style="color: var(--color-success); border-color: rgba(16, 185, 129, 0.4); padding: 4px 10px; font-size: 12px;">
                Make Current
              </button>
            ` : ''}
            <button type="button" class="btn btn-outline btn-sm edit-year-btn" data-id="${y.id}" data-name="${escapeHtml(y.name)}" data-start="${y.startDate || ''}" data-end="${y.endDate || ''}" data-current="${y.isCurrent ? 'true' : 'false'}" data-tooltip="Edit cohort dates & details" style="padding: 4px 10px; font-size: 12px;">
              Edit
            </button>
            <button type="button" class="btn btn-outline btn-sm delete-year-btn" data-id="${y.id}" data-name="${escapeHtml(y.name)}" data-tooltip="Safely retire academic cohort" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3); padding: 4px 10px; font-size: 12px;">
              Delete
            </button>
          </div>
        </div>
      `).join('') || '<p style="color: var(--slate-400); padding: 10px;">No academic years found.</p>';

      // Set Current Year handler
      document.querySelectorAll('.set-current-year-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          try {
            await api.updateAcademicYear(id, { isCurrent: true });
            showToast(`Academic year "${name}" is now the active current session.`, 'success');
            loadCurriculum();
          } catch (err) {
            showToast(err.message || 'Error updating academic year.', 'error');
          }
        });
      });

      // Edit Year handler
      document.querySelectorAll('.edit-year-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          const start = btn.getAttribute('data-start');
          const end = btn.getAttribute('data-end');
          const isCurr = btn.getAttribute('data-current') === 'true';

          const editContent = `
            <div class="form-group">
              <label class="form-label" for="edit-year-name">Academic Year Name</label>
              <input type="text" id="edit-year-name" class="form-control" value="${escapeHtml(name)}" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="edit-year-start">Start Date</label>
                <input type="date" id="edit-year-start" class="form-control" value="${start}">
              </div>
              <div class="form-group">
                <label class="form-label" for="edit-year-end">End Date</label>
                <input type="date" id="edit-year-end" class="form-control" value="${end}">
              </div>
            </div>
            <div class="form-group" style="margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                <input type="checkbox" id="edit-year-current" ${isCurr ? 'checked' : ''}>
                <span>Mark as Current Academic Year</span>
              </label>
            </div>
          `;

          const editFooter = `
            <button type="button" class="btn btn-outline" id="cancel-edit-year">Cancel</button>
            <button type="button" class="btn btn-primary" id="save-edit-year">Save Changes</button>
          `;

          const { close } = openModal({ title: `Edit Academic Year: ${name}`, contentHtml: editContent, footerHtml: editFooter });
          document.getElementById('cancel-edit-year').addEventListener('click', close);
          document.getElementById('save-edit-year').addEventListener('click', async () => {
            const newName = document.getElementById('edit-year-name').value.trim();
            const newStart = document.getElementById('edit-year-start').value;
            const newEnd = document.getElementById('edit-year-end').value;
            const newCurr = document.getElementById('edit-year-current').checked;

            if (!newName) {
              showToast('Please provide an academic year name.', 'error');
              return;
            }
            if (newStart && newEnd && newStart >= newEnd) {
              showToast('End Date must be after Start Date.', 'error');
              return;
            }

            try {
              await api.updateAcademicYear(id, {
                name: newName,
                startDate: newStart,
                endDate: newEnd,
                isCurrent: newCurr
              });
              showToast(`Academic year "${newName}" updated successfully!`, 'success');
              close();
              loadCurriculum();
            } catch (err) {
              showToast(err.message || 'Error updating academic year.', 'error');
            }
          });
        });
      });

      // Delete course handler
      document.querySelectorAll('.delete-course-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (confirm(`Are you sure you want to delete the course "${name}"?`)) {
            try {
              await api.deleteCourse(id);
              showToast(`Course "${name}" deleted successfully.`, 'info');
              loadCurriculum();
            } catch (err) {
              showToast(err.message || 'Error deleting course.', 'error');
            }
          }
        });
      });

      // Delete year handler
      document.querySelectorAll('.delete-year-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (confirm(`Are you sure you want to delete academic year "${name}"?`)) {
            try {
              await api.deleteAcademicYear(id);
              showToast(`Academic year "${name}" deleted successfully.`, 'info');
              loadCurriculum();
            } catch (err) {
              showToast(err.message || 'Error deleting academic year.', 'error');
            }
          }
        });
      });

    } catch (e) {
      coursesList.innerHTML = `<p style="color: var(--color-danger);">Failed to load courses.</p>`;
      yearsList.innerHTML = `<p style="color: var(--color-danger);">Failed to load academic years.</p>`;
    }
  };

  // Attach Add Course and Add Year Modal Handlers
  const addCourseBtn = document.getElementById('add-course-btn');
  if (addCourseBtn) {
    addCourseBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="new-course-name">Course Name</label>
          <input type="text" id="new-course-name" class="form-control" placeholder="e.g. B.S. in Software Engineering" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="new-course-code">Course Code</label>
          <input type="text" id="new-course-code" class="form-control" placeholder="e.g. SE-101" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="new-course-dept">Department</label>
          <input type="text" id="new-course-dept" class="form-control" placeholder="e.g. Computer Science & Engineering" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label" for="new-course-years">Duration (Years)</label>
            <input type="number" id="new-course-years" class="form-control" value="4" min="1" max="6">
          </div>
          <div class="form-group">
            <label class="form-label" for="new-course-degree">Degree Level</label>
            <select id="new-course-degree" class="form-control">
              <option value="Undergraduate">Undergraduate</option>
              <option value="Postgraduate">Postgraduate</option>
              <option value="Doctorate">Doctorate</option>
            </select>
          </div>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-course-modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-course-modal">Create Course</button>
      `;

      const { close } = openModal({ title: 'Add Academic Course', contentHtml: content, footerHtml: footer });
      document.getElementById('cancel-course-modal').addEventListener('click', close);
      document.getElementById('save-course-modal').addEventListener('click', async () => {
        const name = document.getElementById('new-course-name').value.trim();
        const code = document.getElementById('new-course-code').value.trim();
        const dept = document.getElementById('new-course-dept').value.trim();
        const duration = parseInt(document.getElementById('new-course-years').value) || 4;
        const degree = document.getElementById('new-course-degree').value;

        if (!name || !code) {
          showToast('Please provide course name and code.', 'error');
          return;
        }

        try {
          await api.createCourse({
            name,
            code,
            department: dept,
            durationYears: duration,
            degreeType: degree,
            isActive: true
          });
          showToast(`Course "${name}" created successfully!`, 'success');
          close();
          loadCurriculum();
        } catch (err) {
          showToast(err.message || 'Failed to create course.', 'error');
        }
      });
    });
  }

  const addYearBtn = document.getElementById('add-year-btn');
  if (addYearBtn) {
    addYearBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="new-year-name">Academic Year Name</label>
          <input type="text" id="new-year-name" class="form-control" placeholder="e.g. 2026-2027" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label" for="new-year-start">Start Date</label>
            <input type="date" id="new-year-start" class="form-control" value="2026-09-01">
          </div>
          <div class="form-group">
            <label class="form-label" for="new-year-end">End Date</label>
            <input type="date" id="new-year-end" class="form-control" value="2027-06-30">
          </div>
        </div>
        <div class="form-group" style="margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
            <input type="checkbox" id="new-year-current">
            <span>Mark as Current Academic Year</span>
          </label>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-year-modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-year-modal">Create Academic Year</button>
      `;

      const { close } = openModal({ title: 'Add Academic Year', contentHtml: content, footerHtml: footer });
      document.getElementById('cancel-year-modal').addEventListener('click', close);
      document.getElementById('save-year-modal').addEventListener('click', async () => {
        const name = document.getElementById('new-year-name').value.trim();
        const startDate = document.getElementById('new-year-start').value;
        const endDate = document.getElementById('new-year-end').value;
        const isCurrent = document.getElementById('new-year-current').checked;

        if (!name) {
          showToast('Please enter an academic year name.', 'error');
          return;
        }

        if (startDate && endDate && startDate >= endDate) {
          showToast('End Date must be after Start Date.', 'error');
          return;
        }

        try {
          await api.createAcademicYear({
            name,
            startDate,
            endDate,
            isCurrent
          });
          showToast(`Academic Year "${name}" created successfully!`, 'success');
          close();
          loadCurriculum();
        } catch (err) {
          showToast(err.message || 'Failed to create academic year.', 'error');
        }
      });
    });
  }

  const loadAudit = async () => {
    try {
      const res = await api.getAuditLogs(50);
      const logs = res.data || [];

      auditContainer.innerHTML = `
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor Email</th>
                <th>Role</th>
                <th>Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td style="font-size: 12px; color: var(--slate-500);">${l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}</td>
                  <td><code>${escapeHtml(l.action || '')}</code></td>
                  <td>${escapeHtml(l.actorEmail || l.actorId || 'system')}</td>
                  <td><span class="user-role-badge role-${l.actorRole || 'admin'}">${l.actorRole || 'admin'}</span></td>
                  <td>${escapeHtml(l.targetType || '')}:${escapeHtml(l.targetId || '')}</td>
                  <td><span class="badge ${l.status === 'SUCCESS' ? 'badge-emerald' : 'badge-danger'}">${l.status || 'SUCCESS'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      auditContainer.innerHTML = `<p style="color: var(--color-danger);">Failed to load audit trail.</p>`;
    }
  };

  // Ticket Filter and Refresh Handlers
  const ticketFilterSelect = document.getElementById('admin-ticket-status-filter');
  if (ticketFilterSelect) {
    ticketFilterSelect.addEventListener('change', (e) => {
      loadTickets(e.target.value);
    });
  }

  const refreshTicketsBtn = document.getElementById('refresh-tickets-btn');
  if (refreshTicketsBtn) {
    refreshTicketsBtn.addEventListener('click', () => {
      loadTickets(currentTicketFilter);
    });
  }

  // Initial load based on sub-route
  const hash = window.location.hash || '';
  if (hash.includes('/tickets')) {
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'tickets'));
    usersView.style.display = 'none';
    ticketsView.style.display = 'block';
    curriculumView.style.display = 'none';
    auditView.style.display = 'none';
    loadTickets();
  } else if (hash.includes('/audit-logs')) {
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'audit'));
    usersView.style.display = 'none';
    ticketsView.style.display = 'none';
    curriculumView.style.display = 'none';
    auditView.style.display = 'block';
    loadAudit();
  } else if (hash.includes('/curriculum')) {
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'curriculum'));
    usersView.style.display = 'none';
    ticketsView.style.display = 'none';
    curriculumView.style.display = 'block';
    auditView.style.display = 'none';
    loadCurriculum();
  } else {
    loadUsers();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

