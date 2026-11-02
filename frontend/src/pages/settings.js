/**
 * Profile & Account Settings Page
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { createUniversalFileUploader } from '../components/universalFileUploader.js';

export async function renderSettingsPage() {
  const user = authState.user;
  const role = authState.role || 'student';
  const prof = user?.profile || {};

  return `
    <div>
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 800; color: var(--navy-900);">Account & Profile Settings</h1>
        <p style="color: var(--slate-500); font-size: 14px;">Manage your public directory presence, career skills, and privacy preferences.</p>
      </div>

      <div class="card" style="max-width: 640px;">
        <!-- Profile Photo / Avatar Section -->
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
          <div style="position: relative; width: 80px; height: 80px; border-radius: var(--radius-full); overflow: hidden; background: var(--teal-50); border: 2px solid var(--teal-500); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img id="settings-avatar-img" src="${escapeHtml(user?.avatarUrl || '')}" alt="${escapeHtml(user?.displayName || 'User')}" style="width: 100%; height: 100%; object-fit: cover; display: ${user?.avatarUrl ? 'block' : 'none'};" onerror="this.style.display='none'; document.getElementById('settings-avatar-fallback').style.display='flex';" />
            <div id="settings-avatar-fallback" style="display: ${user?.avatarUrl ? 'none' : 'flex'}; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: var(--teal-700);">
              ${(user?.displayName || 'U').substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div>
            <label class="form-label" style="margin-bottom: 4px;">Profile Photo</label>
            <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 8px;">Upload JPEG, PNG, or WebP image (max 5 MB).</p>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <label class="btn btn-outline btn-sm" style="cursor: pointer; margin-bottom: 0;">
                <span>Choose Photo</span>
                <input type="file" id="settings-avatar-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display: none;">
              </label>
              <button type="button" id="upload-avatar-btn" class="btn btn-primary btn-sm" disabled>Upload Photo</button>
            </div>
            <div id="avatar-upload-status" style="font-size: 12px; margin-top: 6px;"></div>
          </div>
        </div>

        <form id="settings-form">
          <div class="form-group">
            <label class="form-label" for="set-name">Display Name</label>
            <input type="text" id="set-name" class="form-control" value="${escapeHtml(user?.displayName || '')}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address (Verified Account)</label>
            <input type="email" class="form-control" value="${escapeHtml(user?.email || '')}" disabled style="background: var(--slate-100);">
          </div>

          <div class="form-group">
            <label class="form-label" for="set-bio">Professional Bio</label>
            <textarea id="set-bio" class="form-control" placeholder="Introduce yourself to students and alumni...">${escapeHtml(user?.bio || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="set-phone">Phone Number (Optional)</label>
            <input type="text" id="set-phone" class="form-control" value="${escapeHtml(user?.phone || '')}" placeholder="+1 (555) 000-0000">
          </div>

          <!-- Common Birthday & Celebration Privacy Section for Students & Alumni -->
          ${(role === 'student' || role === 'alumni') ? `
            <div style="border-top: 1px solid var(--border-color); padding-top: 18px; margin-top: 18px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="font-size: 20px;">🎂</span>
                <div>
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--text-heading); margin: 0;">Date of Birth & Celebration Privacy</h3>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Control community celebrations and privacy settings.</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label" for="set-dob">Date of Birth</label>
                  <input type="date" id="set-dob" class="form-control" value="${escapeHtml(prof.dateOfBirth || prof.dob || '')}">
                  <span style="font-size: 11px; color: var(--text-dim); display: block; margin-top: 4px;">
                    🔒 Birth year is strictly confidential and never displayed publicly.
                  </span>
                </div>

                <div class="form-group">
                  <label class="form-label" for="set-bday-visibility">Celebration Visibility</label>
                  <select id="set-bday-visibility" class="form-control">
                    <option value="visible" ${(prof.birthdayVisibility !== 'hidden' && prof.birthday?.isPublic !== false) ? 'selected' : ''}>
                      Visible to Community (Celebrate day & month)
                    </option>
                    <option value="hidden" ${(prof.birthdayVisibility === 'hidden' || prof.birthday?.isPublic === false) ? 'selected' : ''}>
                      Hidden from Community (Private)
                    </option>
                  </select>
                  <span style="font-size: 11px; color: var(--text-dim); display: block; margin-top: 4px;">
                    When hidden, your birthday will never appear in celebrations.
                  </span>
                </div>
              </div>
            </div>
          ` : ''}

          ${role === 'alumni' ? `
            <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
              <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--navy-900);">Alumni Professional Details</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label" for="set-company">Current Company</label>
                  <input type="text" id="set-company" class="form-control" value="${escapeHtml(prof.company || '')}">
                </div>
                <div class="form-group">
                  <label class="form-label" for="set-role">Job Title</label>
                  <input type="text" id="set-role" class="form-control" value="${escapeHtml(prof.jobTitle || '')}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="set-skills">Skills (Comma separated)</label>
                <input type="text" id="set-skills" class="form-control" value="${escapeHtml((prof.skills || []).join(', '))}">
              </div>
            </div>
          ` : ''}

          ${role === 'student' ? `
            <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
              <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--navy-900);">Student Academic Details</h3>
              <div class="form-group">
                <label class="form-label" for="set-skills">Key Skills & Interests (Comma separated)</label>
                <input type="text" id="set-skills" class="form-control" value="${escapeHtml((prof.skills || []).join(', '))}">
              </div>
              <div class="form-group">
                <label class="form-label" for="set-github">GitHub Profile URL</label>
                <input type="text" id="set-github" class="form-control" value="${escapeHtml(prof.githubUrl || '')}" placeholder="https://github.com/username">
              </div>
            </div>
          ` : ''}

          ${['student', 'alumni'].includes(role) ? `
            <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
              <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 6px; color: var(--navy-900);">Resume / Curriculum Vitae (CV)</h3>
              <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Attach your official PDF or Word resume. Recruiters and alumni mentors will be able to review your qualifications.</p>
              <div id="settings-resume-uploader"></div>
            </div>
          ` : ''}

          <button type="submit" id="save-settings-btn" class="btn btn-primary" style="margin-top: 10px;">
            Save Profile Changes
          </button>
        </form>
      </div>
    </div>
  `;
}

export function initSettingsPage() {
  const form = document.getElementById('settings-form');
  const saveBtn = document.getElementById('save-settings-btn');
  const role = authState.role || 'student';

  const avatarInput = document.getElementById('settings-avatar-input');
  const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
  const avatarImg = document.getElementById('settings-avatar-img');
  const avatarFallback = document.getElementById('settings-avatar-fallback');
  const uploadStatus = document.getElementById('avatar-upload-status');
  let selectedAvatarFile = null;

  // Initialize Resume / CV Uploader
  let resumeUploader = null;
  const resumeContainer = document.getElementById('settings-resume-uploader');
  if (resumeContainer) {
    const prof = authState.user?.profile || {};
    resumeUploader = createUniversalFileUploader({
      container: resumeContainer,
      category: 'resumes',
      isPrivate: true,
      initialUrl: prof.resumeUrl || '',
      initialFilename: prof.resumeFilename || '',
      multiple: false
    });
  }

  if (avatarInput && uploadAvatarBtn) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        showToast('Please select a valid image (JPEG, PNG, WebP).', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size exceeds 5MB limit.', 'error');
        return;
      }

      selectedAvatarFile = file;
      uploadAvatarBtn.disabled = false;
      uploadStatus.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
      uploadStatus.style.color = 'var(--teal-700)';

      const reader = new FileReader();
      reader.onload = (re) => {
        avatarImg.src = re.target.result;
        avatarImg.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    uploadAvatarBtn.addEventListener('click', async () => {
      if (!selectedAvatarFile) return;

      uploadAvatarBtn.disabled = true;
      uploadAvatarBtn.textContent = 'Uploading...';
      uploadStatus.textContent = 'Uploading image...';

      try {
        const res = await api.uploadAvatar(selectedAvatarFile);
        const newUrl = res.data?.avatarUrl;
        if (newUrl) {
          if (authState.user) {
            authState.user.avatarUrl = newUrl;
          }
          avatarImg.src = newUrl;
          avatarImg.style.display = 'block';
          if (avatarFallback) avatarFallback.style.display = 'none';

          // Update sidebar avatar if present
          const sidebarAvatarImg = document.querySelector('.user-avatar-mini img');
          const sidebarAvatarFallback = document.querySelector('.user-avatar-mini div');
          if (sidebarAvatarImg) {
            sidebarAvatarImg.src = newUrl;
            sidebarAvatarImg.style.display = 'block';
            if (sidebarAvatarFallback) sidebarAvatarFallback.style.display = 'none';
          }
          showToast('Profile photo updated successfully!', 'success');
          uploadStatus.textContent = '✓ Profile photo uploaded and saved';
          uploadStatus.style.color = 'var(--emerald-600)';
        }
      } catch (err) {
        console.error('Avatar upload failed:', err);
        showToast(err.message || 'Failed to upload photo.', 'error');
        uploadStatus.textContent = 'Upload failed. Please try again.';
        uploadStatus.style.color = 'var(--color-danger)';
      } finally {
        uploadAvatarBtn.disabled = false;
        uploadAvatarBtn.textContent = 'Upload Photo';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('set-name').value.trim();
      const bio = document.getElementById('set-bio').value.trim();
      const phone = document.getElementById('set-phone').value.trim();

      let profileData = {};
      const skillsInput = document.getElementById('set-skills');
      if (skillsInput) {
        profileData.skills = skillsInput.value.split(',').map(s => s.trim()).filter(Boolean);
      }

      // Process Date of Birth and Birthday Visibility for Student and Alumni
      const dobInput = document.getElementById('set-dob');
      const bdayVisSelect = document.getElementById('set-bday-visibility');
      if (dobInput && dobInput.value) {
        const dobVal = dobInput.value.trim();
        const dobDate = new Date(dobVal);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(dobDate.getTime())) {
          showToast('Please enter a valid calendar date of birth.', 'error');
          return;
        }

        if (dobDate >= today) {
          showToast('Date of birth cannot be in the future or today.', 'error');
          return;
        }

        profileData.dateOfBirth = dobVal;
        profileData.birthdayVisibility = bdayVisSelect ? bdayVisSelect.value : 'visible';
      } else if (bdayVisSelect) {
        profileData.birthdayVisibility = bdayVisSelect.value;
      }

      if (role === 'alumni') {
        const company = document.getElementById('set-company')?.value.trim();
        const jobTitle = document.getElementById('set-role')?.value.trim();
        if (company) profileData.company = company;
        if (jobTitle) profileData.jobTitle = jobTitle;
      } else if (role === 'student') {
        const githubUrl = document.getElementById('set-github')?.value.trim();
        if (githubUrl) profileData.githubUrl = githubUrl;
      }

      if (resumeUploader) {
        const rVal = resumeUploader.getValue();
        profileData.resumeUrl = rVal.fileUrl || '';
        profileData.resumeFilename = rVal.data?.originalFilename || '';
        profileData.resumeUpdatedAt = new Date().toISOString();
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const res = await api.updateProfile({ displayName, bio, phone, profile: profileData });
        authState.setUser(res.data);
        showToast('Profile updated successfully!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to update profile.', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile Changes';
      }
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

