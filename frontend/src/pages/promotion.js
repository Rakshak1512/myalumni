/**
 * Student-to-Alumni Promotion Tool (Faculty & Admin)
 */
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { renderAboutButton } from '../components/featureHelp.js';

export async function renderPromotionPage() {
  return `
    <div>
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Student-to-Alumni Promotion Desk</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Authorize graduating seniors for promotion into the verified Alumni network.</p>
        </div>
        ${renderAboutButton('student-promotion')}
      </div>

      <div class="card" style="max-width: 620px;">
        <div class="card-header">
          <h2 class="card-title">Promote Student to Alumni Status</h2>
          <span class="badge badge-emerald">Graduation Engine</span>
        </div>
        <form id="promotion-form">
          <div class="form-group">
            <label class="form-label" for="promo-student-id">Select Student Scholar</label>
            <select id="promo-student-id" class="form-control" required data-tooltip="Select eligible graduating senior">
              <option value="">-- Choose registered student --</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="promo-year">Graduation Year</label>
            <input type="number" id="promo-year" class="form-control" value="2026" required data-tooltip="Official graduating cohort year">
          </div>

          <div class="form-group">
            <label class="form-label" for="promo-company">Placed Company / Organization</label>
            <input type="text" id="promo-company" class="form-control" placeholder="e.g. Apex Technologies">
          </div>

          <div class="form-group">
            <label class="form-label" for="promo-role">Job Title / Designation</label>
            <input type="text" id="promo-role" class="form-control" placeholder="e.g. Associate Cloud Engineer">
          </div>

          <button type="submit" id="promo-submit-btn" class="btn btn-primary" data-tooltip="Transition scholar to verified alumnus and enroll in batch" style="width: 100%; margin-top: 14px; padding: 12px;">
            ✦ Confirm Promotion to Alumni
          </button>
        </form>
      </div>
    </div>
  `;
}

export async function initPromotionPage() {
  const form = document.getElementById('promotion-form');
  const studentSelect = document.getElementById('promo-student-id');
  const submitBtn = document.getElementById('promo-submit-btn');

  // Load students
  try {
    const res = await api.getStudents();
    const students = res.data || [];

    studentSelect.innerHTML = `
      <option value="">-- Choose registered student (${students.length} found) --</option>
      ${students.map(s => `
        <option value="${s.id}">${escapeHtml(s.displayName || 'Student')} (${escapeHtml(s.email || '')})</option>
      `).join('')}
    `;
  } catch (e) {
    studentSelect.innerHTML = `<option value="">Failed to load students: ${escapeHtml(e.message || 'Access error')}</option>`;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = studentSelect.value;
      const graduationYear = document.getElementById('promo-year').value;
      const company = document.getElementById('promo-company').value.trim();
      const jobTitle = document.getElementById('promo-role').value.trim();

      if (!studentId || !graduationYear) {
        showToast('Please select a student and graduation year.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Promotion...';

      try {
        await api.promoteToAlumni({ studentId, graduationYear, company, jobTitle });
        showToast('Student successfully promoted to Alumni network!', 'success');
        form.reset();
      } catch (err) {
        showToast(err.message || 'Promotion failed.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Promotion to Alumni';
      }
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

