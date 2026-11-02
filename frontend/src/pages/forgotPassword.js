/**
 * Forgot Password Page Component
 * Upgraded with 3-Step SMTP 6-Digit OTP Verification & Secure Password Reset
 */
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { toggleTheme, getPreferredTheme } from '../services/theme.js';

let forgotTimerInterval = null;

export function renderForgotPasswordPage() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const themeIcon = currentTheme === 'dark' ? '☀️' : '🌙';

  return `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; z-index: 1;">
      
      <!-- Top Right Floating Navigation -->
      <div style="position: absolute; top: 24px; right: 24px; display: flex; align-items: center; gap: 12px;">
        <button type="button" id="forgot-theme-toggle" class="theme-toggle-btn" title="Toggle Theme" aria-label="Toggle Theme">
          ${themeIcon}
        </button>
        <a href="#/login" class="btn btn-outline btn-sm">← Back to Sign In</a>
      </div>

      <div class="glass-card" style="max-width: 460px; width: 100%; padding: 40px 36px; border: var(--glass-border); box-shadow: var(--shadow-lg);">
        <div style="text-align: center; margin-bottom: 26px;">
          <a href="#/" class="brand-logo" style="justify-content: center; margin-bottom: 8px; text-decoration: none;">
            <span style="font-size: 24px; font-weight: 800;">MyAlumni</span>
            <span class="brand-badge">2.0</span>
          </a>
          <h2 id="fp-title" style="font-size: 20px; font-weight: 700; color: var(--text-heading); margin-top: 10px;">Reset Password</h2>
          <p id="fp-subtitle" style="color: var(--text-muted); font-size: 13.5px; margin-top: 4px;">
            Enter your account email to receive a 6-digit verification code.
          </p>
        </div>

        <!-- STEP 1: Email Input Form -->
        <div id="fp-step-1">
          <form id="fp-email-form">
            <div class="form-group">
              <label class="form-label" for="fp-email">Account Email Address</label>
              <input type="email" id="fp-email" class="form-control" placeholder="name@domain.com" required autocomplete="email">
            </div>

            <button type="submit" id="fp-email-submit-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 14.5px;">
              ✦ Send 6-Digit Code
            </button>
          </form>
        </div>

        <!-- STEP 2: 6-Digit OTP Verification Form -->
        <div id="fp-step-2" style="display: none;">
          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 14px; margin-bottom: 20px; text-align: center;">
            <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              Verification code sent to <strong id="fp-display-email" style="color: #f1f5f9;"></strong>.
            </p>
          </div>

          <form id="fp-otp-form">
            <div class="form-group" style="text-align: center;">
              <label class="form-label" for="fp-otp-input" style="font-size: 13.5px; margin-bottom: 8px; display: block;">
                Enter 6-Digit Passcode
              </label>
              <input 
                type="text" 
                id="fp-otp-input" 
                class="form-control" 
                placeholder="••••••" 
                maxlength="6" 
                pattern="[0-9]{6}" 
                required 
                style="font-size: 26px; font-weight: 800; letter-spacing: 10px; text-align: center; font-family: monospace; padding: 12px 10px;"
                autocomplete="one-time-code"
              >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 12.5px;">
                <span id="fp-timer-display" style="color: var(--neon-amber); font-weight: 600;">⏱ Expires in 5:00</span>
                <button type="button" id="fp-resend-btn" style="background: none; border: none; color: #38bdf8; cursor: pointer; text-decoration: underline; font-weight: 600; padding: 0;">
                  Resend Code
                </button>
              </div>
            </div>

            <button type="submit" id="fp-otp-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 12px; padding: 12px; font-size: 14.5px;">
              ✦ Verify Code
            </button>
          </form>

          <div style="margin-top: 16px; text-align: center;">
            <button type="button" id="fp-back-to-email-btn" class="btn btn-outline btn-sm" style="width: 100%; font-size: 13px;">
              ← Re-enter Email
            </button>
          </div>
        </div>

        <!-- STEP 3: New Password Form -->
        <div id="fp-step-3" style="display: none;">
          <form id="fp-new-password-form">
            <div class="form-group">
              <label class="form-label" for="fp-new-password">New Password</label>
              <input type="password" id="fp-new-password" class="form-control" placeholder="Minimum 8 characters" required minlength="8" autocomplete="new-password">
            </div>

            <div class="form-group">
              <label class="form-label" for="fp-confirm-password">Confirm New Password</label>
              <input type="password" id="fp-confirm-password" class="form-control" placeholder="Re-enter password" required minlength="8" autocomplete="new-password">
            </div>

            <button type="submit" id="fp-password-submit-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 14.5px;">
              ✦ Reset and Save Password
            </button>
          </form>
        </div>

        <!-- STEP 4: Success Message -->
        <div id="fp-step-4" style="display: none; text-align: center;">
          <div style="font-size: 38px; margin-bottom: 12px;">✅</div>
          <h3 style="color: var(--neon-emerald); font-size: 18px; font-weight: 700; margin-bottom: 8px;">Password Reset Successfully!</h3>
          <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;">
            Your account credentials have been updated. You can now sign in using your new password.
          </p>
          <a href="#/login" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 14.5px; text-decoration: none; display: inline-block;">
            ✦ Proceed to Sign In
          </a>
        </div>

        <div id="fp-footer-nav" style="margin-top: 24px; text-align: center; font-size: 13.5px; color: var(--text-muted);">
          Remembered your password? <a href="#/login" style="font-weight: 600;">Back to sign in</a>
        </div>
      </div>
    </div>
  `;
}

export function initForgotPasswordPage() {
  if (forgotTimerInterval) {
    clearInterval(forgotTimerInterval);
    forgotTimerInterval = null;
  }

  const themeBtn = document.getElementById('forgot-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  const step1 = document.getElementById('fp-step-1');
  const step2 = document.getElementById('fp-step-2');
  const step3 = document.getElementById('fp-step-3');
  const step4 = document.getElementById('fp-step-4');
  const footerNav = document.getElementById('fp-footer-nav');

  const title = document.getElementById('fp-title');
  const subtitle = document.getElementById('fp-subtitle');
  const displayEmail = document.getElementById('fp-display-email');
  const timerDisplay = document.getElementById('fp-timer-display');

  const emailForm = document.getElementById('fp-email-form');
  const emailInput = document.getElementById('fp-email');
  const emailSubmitBtn = document.getElementById('fp-email-submit-btn');

  const otpForm = document.getElementById('fp-otp-form');
  const otpInput = document.getElementById('fp-otp-input');
  const otpSubmitBtn = document.getElementById('fp-otp-submit-btn');
  const resendBtn = document.getElementById('fp-resend-btn');
  const backToEmailBtn = document.getElementById('fp-back-to-email-btn');

  const pwForm = document.getElementById('fp-new-password-form');
  const newPwInput = document.getElementById('fp-new-password');
  const confirmPwInput = document.getElementById('fp-confirm-password');
  const pwSubmitBtn = document.getElementById('fp-password-submit-btn');

  let currentResetEmail = '';
  let verifiedResetToken = '';
  let expirySeconds = 300;

  function startCountdown() {
    if (forgotTimerInterval) clearInterval(forgotTimerInterval);
    expirySeconds = 300;
    forgotTimerInterval = setInterval(() => {
      expirySeconds--;
      if (expirySeconds <= 0) {
        clearInterval(forgotTimerInterval);
        timerDisplay.textContent = '❌ Code Expired';
        timerDisplay.style.color = '#ef4444';
      } else {
        const mins = Math.floor(expirySeconds / 60);
        const secs = expirySeconds % 60;
        timerDisplay.textContent = `⏱ Expires in ${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
    }, 1000);
  }

  // STEP 1: Request OTP
  if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!email) return;

      emailSubmitBtn.disabled = true;
      emailSubmitBtn.textContent = 'Sending Code...';

      try {
        const res = await api.forgotPassword(email);
        currentResetEmail = email;
        displayEmail.textContent = email;

        step1.style.display = 'none';
        step2.style.display = 'block';
        title.textContent = 'Verify Security Code';
        subtitle.textContent = 'Enter the 6-digit code dispatched to your email address.';
        otpInput.value = '';
        otpInput.focus();
        startCountdown();

        showToast(res.message || 'Verification code sent to your email!', 'success');
      } catch (err) {
        console.error('Forgot password error:', err);
        showToast(err.message || 'Unable to process request.', 'error');
      } finally {
        emailSubmitBtn.disabled = false;
        emailSubmitBtn.textContent = '✦ Send 6-Digit Code';
      }
    });
  }

  // STEP 2: Verify OTP
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = otpInput.value.trim();
      if (!otp || otp.length !== 6) {
        showToast('Please enter the full 6-digit code.', 'error');
        return;
      }

      otpSubmitBtn.disabled = true;
      otpSubmitBtn.textContent = 'Verifying...';

      try {
        const res = await api.verifyForgotPasswordOtp({ email: currentResetEmail, otp });
        verifiedResetToken = res.data.resetToken;
        if (forgotTimerInterval) clearInterval(forgotTimerInterval);

        step2.style.display = 'none';
        step3.style.display = 'block';
        title.textContent = 'Create New Password';
        subtitle.textContent = 'Choose a strong password with at least 8 characters.';
        newPwInput.value = '';
        confirmPwInput.value = '';
        newPwInput.focus();

        showToast('Code verified! Please create your new password.', 'success');
      } catch (err) {
        console.error('Verify OTP error:', err);
        showToast(err.message || 'Invalid or expired code.', 'error');
      } finally {
        otpSubmitBtn.disabled = false;
        otpSubmitBtn.textContent = '✦ Verify Code';
      }
    });
  }

  // Resend OTP
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (!currentResetEmail) return;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending...';

      try {
        const res = await api.forgotPassword(currentResetEmail);
        startCountdown();
        showToast(res.message || 'Fresh code dispatched!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to resend code.', 'error');
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend Code';
      }
    });
  }

  // Back to Email
  if (backToEmailBtn) {
    backToEmailBtn.addEventListener('click', () => {
      if (forgotTimerInterval) clearInterval(forgotTimerInterval);
      step2.style.display = 'none';
      step1.style.display = 'block';
      title.textContent = 'Reset Password';
      subtitle.textContent = 'Enter your account email to receive a 6-digit verification code.';
    });
  }

  // STEP 3: Reset Password
  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = newPwInput.value;
      const p2 = confirmPwInput.value;

      if (!p1 || p1.length < 8) {
        showToast('Password must be at least 8 characters long.', 'error');
        return;
      }
      if (p1 !== p2) {
        showToast('Passwords do not match. Please re-enter carefully.', 'error');
        return;
      }

      pwSubmitBtn.disabled = true;
      pwSubmitBtn.textContent = 'Updating Password...';

      try {
        await api.resetPassword({ resetToken: verifiedResetToken, newPassword: p1 });
        step3.style.display = 'none';
        step4.style.display = 'block';
        title.style.display = 'none';
        subtitle.style.display = 'none';
        footerNav.style.display = 'none';
        showToast('Password updated successfully!', 'success');
      } catch (err) {
        console.error('Reset password error:', err);
        showToast(err.message || 'Failed to reset password. Session may have expired.', 'error');
      } finally {
        pwSubmitBtn.disabled = false;
        pwSubmitBtn.textContent = '✦ Reset and Save Password';
      }
    });
  }
}
