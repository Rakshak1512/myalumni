/**
 * Registration Page Component
 * Upgraded with Cinematic Glass Styling, SMTP 6-Digit OTP Verification & Theme Toggle
 * RULE: Account is staged and NOT added to database until OTP verification succeeds.
 */
import { authState } from '../auth/authContext.js';
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { toggleTheme, getPreferredTheme } from '../services/theme.js';

let resendTimerInterval = null;

export function renderRegisterPage() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const themeIcon = currentTheme === 'dark' ? '☀️' : '🌙';

  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; z-index: 1;">
      
      <!-- Top Right Floating Navigation -->
      <div style="position: absolute; top: 24px; right: 24px; display: flex; align-items: center; gap: 12px;">
        <button type="button" id="register-theme-toggle" class="theme-toggle-btn" title="Toggle Theme" aria-label="Toggle Theme">
          ${themeIcon}
        </button>
        <a href="#/" class="btn btn-outline btn-sm">← Back Home</a>
      </div>

      <div class="glass-card" style="max-width: 500px; width: 100%; padding: 40px 36px; border: var(--glass-border); box-shadow: var(--shadow-lg);">
        <div style="text-align: center; margin-bottom: 26px;">
          <a href="#/" class="brand-logo" style="justify-content: center; margin-bottom: 8px; text-decoration: none;">
            <span style="font-size: 24px; font-weight: 800;">MyAlumni</span>
            <span class="brand-badge">2.0</span>
          </a>
          <p id="reg-subtitle" style="color: var(--text-muted); font-size: 14px;">Create your verified network profile</p>
        </div>

        <!-- STEP 1: Registration Credentials Form -->
        <div id="reg-step-1">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-name">Full Name</label>
              <input type="text" id="reg-name" class="form-control" placeholder="Alex Chen" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-email">Email Address</label>
              <input type="email" id="reg-email" class="form-control" placeholder="alex.chen@university.edu" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-role">I am registering as</label>
              <select id="reg-role" class="form-control" required>
                <option value="student" selected>Student Scholar (Current Student)</option>
                <option value="alumni">Distinguished Alumni (Graduated)</option>
              </select>
            </div>

            <div class="form-group" id="student-extra-fields">
              <label class="form-label" for="reg-course">Academic Major / Degree</label>
              <input type="text" id="reg-course" class="form-control" placeholder="B.S. in Computer Science">
            </div>

            <div class="form-group" id="alumni-extra-fields" style="display: none;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" for="reg-grad-year">Graduation Year</label>
                  <input type="number" id="reg-grad-year" class="form-control" placeholder="2022">
                </div>
                <div>
                  <label class="form-label" for="reg-company">Current Company</label>
                  <input type="text" id="reg-company" class="form-control" placeholder="Apex Technologies">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-password">Secure Password</label>
              <input type="password" id="reg-password" class="form-control" placeholder="Minimum 8 characters" required minlength="8">
            </div>

            <button type="submit" id="reg-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 12px; font-size: 14.5px;">
              ✦ Continue with Email Verification
            </button>
          </form>

          <div style="margin-top: 24px; text-align: center; font-size: 13.5px; color: var(--text-muted);">
            Already have an account? <a href="#/login" style="font-weight: 600;">Sign in here</a>
          </div>
        </div>

        <!-- STEP 2: 6-Digit OTP Verification Screen -->
        <div id="reg-step-2" style="display: none;">
          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 16px; margin-bottom: 22px; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 4px;">📬</div>
            <div style="color: #38bdf8; font-weight: 700; font-size: 14.5px;">Verification Code Dispatched</div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 6px 0 0 0; line-height: 1.5;">
              Enter the 6-digit code sent to <strong id="otp-target-email" style="color: #f1f5f9;"></strong>. Your account will be created upon verification.
            </p>
          </div>

          <form id="otp-verify-form">
            <div class="form-group" style="text-align: center;">
              <label class="form-label" for="reg-otp-input" style="font-size: 13.5px; margin-bottom: 10px; display: block;">
                Enter 6-Digit Verification Code
              </label>
              <input 
                type="text" 
                id="reg-otp-input" 
                class="form-control" 
                placeholder="••••••" 
                maxlength="6" 
                pattern="[0-9]{6}" 
                required 
                style="font-size: 28px; font-weight: 800; letter-spacing: 12px; text-align: center; font-family: monospace; padding: 14px 10px;"
                autocomplete="one-time-code"
              >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 12.5px;">
                <span id="otp-timer-display" style="color: var(--neon-amber); font-weight: 600;">⏱ Expires in 5:00</span>
                <button type="button" id="reg-resend-btn" style="background: none; border: none; color: #38bdf8; cursor: pointer; text-decoration: underline; font-weight: 600; padding: 0;">
                  Resend Code
                </button>
              </div>
            </div>

            <button type="submit" id="reg-verify-btn" class="btn btn-primary" style="width: 100%; margin-top: 14px; padding: 12px; font-size: 14.5px;">
              ✦ Verify & Activate Account
            </button>
          </form>

          <div style="margin-top: 20px; text-align: center;">
            <button type="button" id="reg-back-btn" class="btn btn-outline btn-sm" style="width: 100%; font-size: 13px;">
              ← Edit Registration Details
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function initRegisterPage() {
  if (resendTimerInterval) {
    clearInterval(resendTimerInterval);
    resendTimerInterval = null;
  }

  const themeBtn = document.getElementById('register-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  const step1 = document.getElementById('reg-step-1');
  const step2 = document.getElementById('reg-step-2');
  const form = document.getElementById('register-form');
  const otpForm = document.getElementById('otp-verify-form');
  const roleSelect = document.getElementById('reg-role');
  const studentFields = document.getElementById('student-extra-fields');
  const alumniFields = document.getElementById('alumni-extra-fields');
  const submitBtn = document.getElementById('reg-submit-btn');
  const verifyBtn = document.getElementById('reg-verify-btn');
  const resendBtn = document.getElementById('reg-resend-btn');
  const backBtn = document.getElementById('reg-back-btn');
  const targetEmailSpan = document.getElementById('otp-target-email');
  const timerDisplay = document.getElementById('otp-timer-display');
  const otpInput = document.getElementById('reg-otp-input');
  const subtitle = document.getElementById('reg-subtitle');

  let currentStagedEmail = '';
  let expirySeconds = 300;

  function startCountdown() {
    if (resendTimerInterval) clearInterval(resendTimerInterval);
    expirySeconds = 300;
    resendTimerInterval = setInterval(() => {
      expirySeconds--;
      if (expirySeconds <= 0) {
        clearInterval(resendTimerInterval);
        timerDisplay.textContent = '❌ Code Expired';
        timerDisplay.style.color = '#ef4444';
      } else {
        const mins = Math.floor(expirySeconds / 60);
        const secs = expirySeconds % 60;
        timerDisplay.textContent = `⏱ Expires in ${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
    }, 1000);
  }

  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      const isAlumni = roleSelect.value === 'alumni';
      studentFields.style.display = isAlumni ? 'none' : 'block';
      alumniFields.style.display = isAlumni ? 'block' : 'none';
    });
  }

  // STEP 1: Submit Form to Stage Registration with OTP
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const role = roleSelect.value;
      const password = document.getElementById('reg-password').value;

      let extraProfile = {};
      if (role === 'student') {
        extraProfile.courseName = document.getElementById('reg-course').value.trim() || 'General Studies';
      } else {
        extraProfile.graduationYear = document.getElementById('reg-grad-year').value.trim() || '2023';
        extraProfile.company = document.getElementById('reg-company').value.trim() || 'Independent';
        extraProfile.isMentoringAvailable = false;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Verification Code...';

      try {
        const res = await authState.register(email, password, name, role, extraProfile);
        currentStagedEmail = email;
        targetEmailSpan.textContent = email;

        // Transition to Step 2
        step1.style.display = 'none';
        step2.style.display = 'block';
        subtitle.textContent = 'Verify your email to activate account';
        otpInput.value = '';
        otpInput.focus();
        startCountdown();

        showToast(res.message || 'Verification code sent to your email!', 'success');
      } catch (err) {
        console.error('Registration stage error:', err);
        showToast(err.message || 'Registration failed. Please verify your details.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✦ Continue with Email Verification';
      }
    });
  }

  // STEP 2: Verify 6-digit OTP & Commit to Database
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = otpInput.value.trim();
      if (!otp || otp.length !== 6) {
        showToast('Please enter the full 6-digit verification code.', 'error');
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying Code...';

      try {
        await authState.verifyRegistration(currentStagedEmail, otp);
        if (resendTimerInterval) clearInterval(resendTimerInterval);
        showToast('Account activated successfully! Welcome to MyAlumni.', 'success');
        window.location.hash = '#/dashboard';
      } catch (err) {
        console.error('OTP verification error:', err);
        showToast(err.message || 'Verification failed. Please check the code and try again.', 'error');
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = '✦ Verify & Activate Account';
      }
    });
  }

  // Resend OTP
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (!currentStagedEmail) return;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending...';

      try {
        const res = await api.resendRegistrationOtp(currentStagedEmail);
        startCountdown();
        showToast(res.message || 'A fresh code has been sent to your email.', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to resend code. Please wait.', 'error');
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend Code';
      }
    });
  }

  // Back Button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (resendTimerInterval) clearInterval(resendTimerInterval);
      step2.style.display = 'none';
      step1.style.display = 'block';
      subtitle.textContent = 'Create your verified network profile';
    });
  }
}
