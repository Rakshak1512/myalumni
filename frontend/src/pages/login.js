/**
 * Login Page Component
 * Upgraded with Cinematic Glass Styling, Test User SMTP OTP Authentication & Password Login
 */
import { authState } from '../auth/authContext.js';
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { toggleTheme, getPreferredTheme } from '../services/theme.js';

let testUserOtpTimer = null;

export function renderLoginPage() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const themeIcon = currentTheme === 'dark' ? '☀️' : '🌙';

  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; z-index: 1;">
      
      <!-- Top Right Floating Navigation -->
      <div style="position: absolute; top: 24px; right: 24px; display: flex; align-items: center; gap: 12px;">
        <button type="button" id="login-theme-toggle" class="theme-toggle-btn" title="Toggle Theme" aria-label="Toggle Theme">
          ${themeIcon}
        </button>
        <a href="#/" class="btn btn-outline btn-sm">← Back Home</a>
      </div>

      <!-- Glass Auth Card -->
      <div class="glass-card" style="max-width: 470px; width: 100%; padding: 40px 36px; border: var(--glass-border); box-shadow: var(--shadow-lg);">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="#/" class="brand-logo" style="justify-content: center; margin-bottom: 8px; text-decoration: none;">
            <span style="font-size: 24px; font-weight: 800;">MyAlumni</span>
            <span class="brand-badge">2.0</span>
          </a>
          <p style="color: var(--text-muted); font-size: 14px;">
            Sign in to access your role-tailored workspace
          </p>
        </div>

        <!-- Mode Toggle Tabs: Password vs Test Account OTP -->
        <div style="display: flex; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 10px; padding: 4px; margin-bottom: 22px;">
          <button type="button" id="tab-password-mode" style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 7px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; cursor: pointer; transition: all 0.2s;">
            🔐 Password Sign In
          </button>
          <button type="button" id="tab-otp-mode" style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 7px; background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.2s;">
            ⚡ Test User OTP
          </button>
        </div>

        <!-- MODE 1: Standard Password Sign In Form -->
        <div id="login-password-section">
          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="login-email">Email Address</label>
              <input type="email" id="login-email" class="form-control" placeholder="name@domain.com" required autocomplete="email">
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="login-password" style="margin-bottom: 0;">Password</label>
                <a href="#/forgot-password" style="font-size: 12.5px; font-weight: 600;">Forgot password?</a>
              </div>
              <div style="position: relative;">
                <input type="password" id="login-password" class="form-control" placeholder="••••••••••••" required autocomplete="current-password" style="padding-right: 44px;">
                <button type="button" id="toggle-password-btn" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 14px;" aria-label="Toggle password visibility">
                  👁
                </button>
              </div>
            </div>

            <button type="submit" id="login-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 12px; font-size: 14.5px;">
              ✦ Sign In to Workspace
            </button>
          </form>
        </div>

        <!-- MODE 2: Test User 6-Digit OTP Sign In -->
        <div id="login-otp-section" style="display: none;">
          <!-- Sub-step 1: Select/Enter Test Email -->
          <div id="test-otp-step-1">
            <form id="test-otp-request-form">
              <div class="form-group">
                <label class="form-label" for="test-otp-email">Test Account Email</label>
                <select id="test-otp-select" class="form-control" style="margin-bottom: 8px;">
                  <option value="student@myalumni.edu">👨‍🎓 student@myalumni.edu (Alex Chen - Student)</option>
                  <option value="alumni@myalumni.edu">💼 alumni@myalumni.edu (Elena Rostova - Alumni)</option>
                  <option value="faculty@myalumni.edu">🎓 faculty@myalumni.edu (Prof. Marcus Vance - Faculty)</option>
                  <option value="admin@myalumni.edu">🛡️ admin@myalumni.edu (Dr. Sarah Admin - Admin)</option>
                  <option value="custom">✏️ Enter other test email...</option>
                </select>
                <input type="email" id="test-otp-email" class="form-control" value="student@myalumni.edu" style="display: none;" placeholder="test.account@myalumni.edu">
              </div>

              <button type="submit" id="test-otp-send-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 14.5px;">
                ✦ Send 6-Digit Security Code
              </button>
            </form>
          </div>

          <!-- Sub-step 2: Enter 6-digit OTP -->
          <div id="test-otp-step-2" style="display: none;">
            <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 12px; margin-bottom: 16px; text-align: center;">
              <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                Security passcode dispatched to <strong id="test-otp-target-display" style="color: #f1f5f9;"></strong>.
              </p>
            </div>

            <form id="test-otp-login-form">
              <div class="form-group" style="text-align: center;">
                <label class="form-label" for="test-otp-code-input" style="font-size: 13px; margin-bottom: 8px; display: block;">
                  Enter 6-Digit Test Passcode
                </label>
                <input 
                  type="text" 
                  id="test-otp-code-input" 
                  class="form-control" 
                  placeholder="••••••" 
                  maxlength="6" 
                  pattern="[0-9]{6}" 
                  required 
                  style="font-size: 26px; font-weight: 800; letter-spacing: 10px; text-align: center; font-family: monospace; padding: 12px 10px;"
                  autocomplete="one-time-code"
                >
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 12px;">
                  <span id="test-timer-display" style="color: var(--neon-amber); font-weight: 600;">⏱ Expires in 5:00</span>
                  <button type="button" id="test-resend-btn" style="background: none; border: none; color: #38bdf8; cursor: pointer; text-decoration: underline; font-weight: 600; padding: 0;">
                    Resend Code
                  </button>
                </div>
              </div>

              <button type="submit" id="test-otp-verify-btn" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 12px; font-size: 14.5px;">
                ✦ Verify Passcode & Sign In
              </button>
            </form>

            <div style="margin-top: 14px; text-align: center;">
              <button type="button" id="test-otp-back-btn" class="btn btn-outline btn-sm" style="width: 100%; font-size: 12.5px;">
                ← Change Test Account
              </button>
            </div>
          </div>
        </div>

        <!-- Quick 1-Click Instant Demo Persona Selector -->
        <div style="margin-top: 26px; border-top: var(--glass-border); padding-top: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--neon-amber); text-transform: uppercase; margin-bottom: 10px; text-align: center; letter-spacing: 0.5px;">
            ⚡ Quick 1-Click Demo Accounts (Localhost Testing)
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="btn btn-navy btn-sm demo-login-btn" data-role="student">
              👨‍🎓 Student
            </button>
            <button type="button" class="btn btn-navy btn-sm demo-login-btn" data-role="alumni">
              💼 Alumni
            </button>
            <button type="button" class="btn btn-navy btn-sm demo-login-btn" data-role="faculty">
              🎓 Faculty
            </button>
            <button type="button" class="btn btn-navy btn-sm demo-login-btn" data-role="admin">
              🛡️ Admin
            </button>
          </div>
        </div>

        <div style="margin-top: 22px; text-align: center; font-size: 13.5px; color: var(--text-muted);">
          Don't have an account yet? <a href="#/register" style="font-weight: 600;">Register here</a>
        </div>
      </div>
    </div>
  `;
}

export function initLoginPage() {
  if (testUserOtpTimer) {
    clearInterval(testUserOtpTimer);
    testUserOtpTimer = null;
  }

  const themeBtn = document.getElementById('login-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  // Tab switching
  const tabPassword = document.getElementById('tab-password-mode');
  const tabOtp = document.getElementById('tab-otp-mode');
  const sectionPassword = document.getElementById('login-password-section');
  const sectionOtp = document.getElementById('login-otp-section');

  tabPassword.addEventListener('click', () => {
    tabPassword.style.background = 'rgba(56, 189, 248, 0.15)';
    tabPassword.style.color = '#38bdf8';
    tabOtp.style.background = 'transparent';
    tabOtp.style.color = 'var(--text-muted)';
    sectionPassword.style.display = 'block';
    sectionOtp.style.display = 'none';
  });

  tabOtp.addEventListener('click', () => {
    tabOtp.style.background = 'rgba(56, 189, 248, 0.15)';
    tabOtp.style.color = '#38bdf8';
    tabPassword.style.background = 'transparent';
    tabPassword.style.color = 'var(--text-muted)';
    sectionOtp.style.display = 'block';
    sectionPassword.style.display = 'none';
  });

  // Password visibility
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('toggle-password-btn');
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = passwordInput.type === 'password';
      passwordInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? '🔒' : '👁';
    });
  }

  // 1-Click Instant Demo Login
  document.querySelectorAll('.demo-login-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const role = btn.getAttribute('data-role');
      btn.disabled = true;
      btn.textContent = 'Signing In...';
      try {
        await authState.demoLogin(role);
        showToast(`Signed in as ${role.toUpperCase()} Demo!`, 'success');
        window.location.hash = '#/dashboard';
      } catch (err) {
        showToast(err.message || 'Demo login failed.', 'error');
        btn.disabled = false;
        btn.textContent = `${role.toUpperCase()}`;
      }
    });
  });

  // Standard Password Form Submit
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const submitBtn = document.getElementById('login-submit-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      try {
        await authState.login(email, password);
        showToast('Authentication successful. Welcome!', 'success');
        window.location.hash = '#/dashboard';
      } catch (err) {
        console.error('Login error:', err);
        showToast(err.message || 'Authentication failed. Please check your credentials.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✦ Sign In to Workspace';
      }
    });
  }

  // Test User OTP Handlers
  const testSelect = document.getElementById('test-otp-select');
  const testEmailInput = document.getElementById('test-otp-email');
  const testOtpReqForm = document.getElementById('test-otp-request-form');
  const testOtpSendBtn = document.getElementById('test-otp-send-btn');

  const testStep1 = document.getElementById('test-otp-step-1');
  const testStep2 = document.getElementById('test-otp-step-2');
  const testTargetDisplay = document.getElementById('test-otp-target-display');
  const testTimerDisplay = document.getElementById('test-timer-display');
  const testOtpCodeInput = document.getElementById('test-otp-code-input');
  const testOtpLoginForm = document.getElementById('test-otp-login-form');
  const testOtpVerifyBtn = document.getElementById('test-otp-verify-btn');
  const testResendBtn = document.getElementById('test-resend-btn');
  const testBackBtn = document.getElementById('test-otp-back-btn');

  let activeTestEmail = '';
  let testExpirySeconds = 300;

  function startTestTimer() {
    if (testUserOtpTimer) clearInterval(testUserOtpTimer);
    testExpirySeconds = 300;
    testUserOtpTimer = setInterval(() => {
      testExpirySeconds--;
      if (testExpirySeconds <= 0) {
        clearInterval(testUserOtpTimer);
        testTimerDisplay.textContent = '❌ Code Expired';
        testTimerDisplay.style.color = '#ef4444';
      } else {
        const mins = Math.floor(testExpirySeconds / 60);
        const secs = testExpirySeconds % 60;
        testTimerDisplay.textContent = `⏱ Expires in ${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
    }, 1000);
  }

  if (testSelect) {
    testSelect.addEventListener('change', () => {
      if (testSelect.value === 'custom') {
        testEmailInput.style.display = 'block';
        testEmailInput.value = '';
        testEmailInput.focus();
      } else {
        testEmailInput.style.display = 'none';
        testEmailInput.value = testSelect.value;
      }
    });
  }

  // Request Test OTP
  if (testOtpReqForm) {
    testOtpReqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (testSelect.value === 'custom' ? testEmailInput.value : testSelect.value).trim().toLowerCase();
      if (!email) {
        showToast('Please select or enter a test account email.', 'error');
        return;
      }

      testOtpSendBtn.disabled = true;
      testOtpSendBtn.textContent = 'Dispatching Code...';

      try {
        const res = await api.testUserOtpRequest(email);
        activeTestEmail = email;
        testTargetDisplay.textContent = email;

        testStep1.style.display = 'none';
        testStep2.style.display = 'block';
        testOtpCodeInput.value = '';
        testOtpCodeInput.focus();
        startTestTimer();

        showToast(res.message || 'Passcode dispatched! Check your email.', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to dispatch test passcode.', 'error');
      } finally {
        testOtpSendBtn.disabled = false;
        testOtpSendBtn.textContent = '✦ Send 6-Digit Security Code';
      }
    });
  }

  // Verify Test OTP & Log In
  if (testOtpLoginForm) {
    testOtpLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = testOtpCodeInput.value.trim();
      if (!otp || otp.length !== 6) {
        showToast('Please enter the full 6-digit passcode.', 'error');
        return;
      }

      testOtpVerifyBtn.disabled = true;
      testOtpVerifyBtn.textContent = 'Verifying Passcode...';

      try {
        await authState.testUserOtpLogin(activeTestEmail, otp);
        if (testUserOtpTimer) clearInterval(testUserOtpTimer);
        showToast('Passcode verified! Welcome to MyAlumni.', 'success');
        window.location.hash = '#/dashboard';
      } catch (err) {
        showToast(err.message || 'Invalid or expired passcode.', 'error');
      } finally {
        testOtpVerifyBtn.disabled = false;
        testOtpVerifyBtn.textContent = '✦ Verify Passcode & Sign In';
      }
    });
  }

  // Resend Test OTP
  if (testResendBtn) {
    testResendBtn.addEventListener('click', async () => {
      if (!activeTestEmail) return;
      testResendBtn.disabled = true;
      testResendBtn.textContent = 'Sending...';

      try {
        const res = await api.testUserOtpRequest(activeTestEmail);
        startTestTimer();
        showToast(res.message || 'Fresh code dispatched!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to resend code.', 'error');
      } finally {
        testResendBtn.disabled = false;
        testResendBtn.textContent = 'Resend Code';
      }
    });
  }

  // Back Button for Test OTP
  if (testBackBtn) {
    testBackBtn.addEventListener('click', () => {
      if (testUserOtpTimer) clearInterval(testUserOtpTimer);
      testStep2.style.display = 'none';
      testStep1.style.display = 'block';
    });
  }
}
