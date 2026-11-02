/**
 * ALUMNI BIRTHDAY & CELEBRATION HUB
 * Strictly adheres to privacy: does not expose birth year or sensitive data.
 * NEXUS 2.0 Cinematic Dark Mystery theme with refined celebratory accents.
 */
import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderAboutButton } from '../components/featureHelp.js';

export async function renderBirthdaysPage() {
  return `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      
      <!-- Luminous Hub Banner -->
      <div class="glass-card" style="padding: 28px 32px; border-left: 4px solid var(--neon-amber); background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(168, 85, 247, 0.08) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <span class="badge badge-amber">🎂 Alumni Birthday & Celebration Hub</span>
              <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-muted); font-size: 11px;">Privacy-First Standards</span>
            </div>
            <h1 style="font-size: 26px; font-weight: 800; color: var(--text-heading); margin-bottom: 6px;">
              Community Celebrations & Greetings
            </h1>
            <p style="color: var(--text-muted); font-size: 14px; max-width: 680px; margin: 0;">
              Celebrate milestones with students and alumni. Send personalized greetings while keeping birth years strictly private.
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            ${renderAboutButton('birthdays')}
            <button type="button" id="open-my-bday-modal-btn" class="btn btn-primary btn-sm" data-tooltip="Add or manage your birthday and privacy setting">
              ⚙️ My Birthday Settings
            </button>
          </div>
        </div>
      </div>

      <!-- Optional Profile Completion Reminder Card (Shown when DOB is missing) -->
      <div id="bday-dob-prompt" class="glass-card" style="display: none; padding: 20px 24px; border: 1px dashed rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.05); align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 32px;">🎁</div>
          <div>
            <div style="font-weight: 750; color: var(--neon-amber); font-size: 15px;">Your birthday is missing!</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              Complete your profile by adding your birthday so your alumni community can celebrate with you.
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" id="prompt-add-bday-btn" class="btn btn-primary btn-sm">Add My Birthday</button>
          <button type="button" id="prompt-dismiss-bday-btn" class="btn btn-outline btn-sm">Maybe Later</button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 10px; border-bottom: var(--glass-border); padding-bottom: 12px; overflow-x: auto;">
        <button type="button" class="btn btn-outline bday-nav-tab active" data-tab="tab-today" style="display: flex; align-items: center; gap: 8px;">
          <span>🎉 Today's Birthdays</span>
          <span id="badge-today-count" class="badge badge-amber" style="display: none; font-size: 11px;">0</span>
        </button>
        <button type="button" class="btn btn-outline bday-nav-tab" data-tab="tab-upcoming" style="display: flex; align-items: center; gap: 8px;">
          <span>🗓️ Upcoming (30 Days)</span>
          <span id="badge-upcoming-count" class="badge badge-navy" style="display: none; font-size: 11px;">0</span>
        </button>
        <button type="button" class="btn btn-outline bday-nav-tab" data-tab="tab-celebrations" style="display: flex; align-items: center; gap: 8px;">
          <span>🥂 Community Celebrations</span>
        </button>
        <button type="button" class="btn btn-outline bday-nav-tab" data-tab="tab-my-greetings" style="display: flex; align-items: center; gap: 8px;">
          <span>💌 Received Greetings</span>
          <span id="badge-unread-count" class="badge badge-emerald" style="display: none; font-size: 11px;">0</span>
        </button>
      </div>

      <!-- TAB 1: Today's Birthdays -->
      <div id="tab-today" class="bday-tab-pane">
        <div class="glass-card" style="padding: 24px;">
          <div class="card-header" style="margin-bottom: 18px;">
            <h3 class="card-title" style="color: var(--neon-amber);">
              <span>🎉</span> Celebrating Today
            </h3>
            <span style="font-size: 13px; color: var(--text-dim);">Asia/Kolkata Local Session</span>
          </div>
          <div id="today-bdays-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 18px;">
            <div style="color: var(--text-dim); padding: 20px;">Checking today's community birthdays...</div>
          </div>
        </div>
      </div>

      <!-- TAB 2: Upcoming Birthdays (Next 30 Days) -->
      <div id="tab-upcoming" class="bday-tab-pane" style="display: none;">
        <div class="glass-card" style="padding: 24px;">
          <div class="card-header" style="margin-bottom: 18px;">
            <h3 class="card-title">
              <span>🗓️</span> Upcoming Community Birthdays (Next 30 Days)
            </h3>
            <span style="font-size: 13px; color: var(--text-dim);">Strictly day & month only</span>
          </div>
          <div id="upcoming-bdays-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 18px;">
            <div style="color: var(--text-dim); padding: 20px;">Checking upcoming birthdays...</div>
          </div>
        </div>
      </div>

      <!-- TAB 3: Community Celebrations Feed -->
      <div id="tab-celebrations" class="bday-tab-pane" style="display: none;">
        <div class="glass-card" style="padding: 24px;">
          <div class="card-header" style="margin-bottom: 18px;">
            <h3 class="card-title">
              <span>🥂</span> Active Celebration Stream
            </h3>
            <span style="font-size: 13px; color: var(--text-dim);">Warm community wishes</span>
          </div>
          <div id="celebrations-feed-container" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="color: var(--text-dim); padding: 20px;">Loading celebration stream...</div>
          </div>
        </div>
      </div>

      <!-- TAB 4: Received Greetings Inbox -->
      <div id="tab-my-greetings" class="bday-tab-pane" style="display: none;">
        <div class="glass-card" style="padding: 24px;">
          <div class="card-header" style="margin-bottom: 18px;">
            <h3 class="card-title">
              <span>💌</span> My Received Greetings Inbox
            </h3>
            <span style="font-size: 13px; color: var(--text-dim);">Private to your account</span>
          </div>
          <div id="greetings-list-container" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="color: var(--text-dim); padding: 20px;">Loading received greetings...</div>
          </div>
        </div>
      </div>

    </div>
  `;
}

export async function initBirthdaysPage() {
  const tabs = document.querySelectorAll('.bday-nav-tab');
  const panes = document.querySelectorAll('.bday-tab-pane');
  const todayContainer = document.getElementById('today-bdays-container');
  const upcomingContainer = document.getElementById('upcoming-bdays-container');
  const celebrationsContainer = document.getElementById('celebrations-feed-container');
  const greetingsContainer = document.getElementById('greetings-list-container');
  const dobPrompt = document.getElementById('bday-dob-prompt');

  // Check URL query param for default tab (e.g. ?tab=my-greetings)
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const initialTab = urlParams.get('tab');

  // Tab switcher
  const switchTab = (tabId) => {
    tabs.forEach(t => {
      const isTarget = t.getAttribute('data-tab') === tabId;
      t.classList.toggle('active', isTarget);
      if (isTarget) {
        t.style.borderColor = 'var(--neon-amber)';
        t.style.color = 'var(--neon-amber)';
      } else {
        t.style.borderColor = '';
        t.style.color = '';
      }
    });
    panes.forEach(p => {
      p.style.display = (p.id === tabId) ? 'block' : 'none';
    });

    if (tabId === 'tab-my-greetings') {
      loadGreetings();
    }
  };

  tabs.forEach(t => {
    t.addEventListener('click', () => switchTab(t.getAttribute('data-tab')));
  });

  if (initialTab && document.getElementById(initialTab)) {
    switchTab(initialTab);
  }

  // Load All Birthday Data
  const loadBirthdays = async () => {
    try {
      const res = await api.getBirthdays();
      const { today = [], upcoming = [], celebrations = [], myDob = {} } = res.data || {};

      // Check Profile Completion Prompt
      const isDismissed = sessionStorage.getItem('dismiss_bday_prompt') === 'true';
      if (!myDob.hasDob && !isDismissed && dobPrompt) {
        dobPrompt.style.display = 'flex';
      }

      // Update Tab Badges
      const badgeToday = document.getElementById('badge-today-count');
      if (badgeToday) {
        badgeToday.textContent = today.length;
        badgeToday.style.display = today.length > 0 ? 'inline-block' : 'none';
      }
      const badgeUpcoming = document.getElementById('badge-upcoming-count');
      if (badgeUpcoming) {
        badgeUpcoming.textContent = upcoming.length;
        badgeUpcoming.style.display = upcoming.length > 0 ? 'inline-block' : 'none';
      }

      // 1. Render Today's Birthdays
      if (today.length === 0) {
        todayContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
            <div class="empty-state-icon">🎂</div>
            <div class="empty-state-title">No community birthdays today</div>
            <p>Check the Upcoming tab to see who is celebrating in the next 30 days!</p>
          </div>
        `;
      } else {
        todayContainer.innerHTML = today.map(b => renderCelebrantCard(b, true)).join('');
      }

      // 2. Render Upcoming Birthdays
      if (upcoming.length === 0) {
        upcomingContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
            <div class="empty-state-icon">🗓️</div>
            <div class="empty-state-title">No upcoming birthdays in the next 30 days</div>
            <p>As community members update their profiles, upcoming dates will appear here.</p>
          </div>
        `;
      } else {
        upcomingContainer.innerHTML = upcoming.map(b => renderCelebrantCard(b, false)).join('');
      }

      // 3. Render Celebrations Stream
      if (celebrations.length === 0) {
        celebrationsContainer.innerHTML = `
          <div class="empty-state" style="padding: 40px 20px;">
            <div class="empty-state-icon">🥂</div>
            <div class="empty-state-title">No active celebration milestones</div>
            <p>Active celebrations will appear here as birthdays occur.</p>
          </div>
        `;
      } else {
        celebrationsContainer.innerHTML = celebrations.map(c => `
          <div class="glass-card" style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; border: var(--glass-border); background: var(--bg-card);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 44px; height: 44px; border-radius: var(--radius-full); overflow: hidden; background: rgba(245, 158, 11, 0.15); border: 2px solid var(--neon-amber); display: flex; align-items: center; justify-content: center; font-weight: 750; color: var(--neon-amber); flex-shrink: 0;">
                ${c.avatarUrl ? `<img src="${escapeHtml(c.avatarUrl)}" alt="${escapeHtml(c.displayName)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />` : (c.displayName || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="color: var(--text-heading); font-size: 15px;">${escapeHtml(c.displayName)}</strong>
                  <span class="badge ${c.isToday ? 'badge-amber' : 'badge-navy'}" style="font-size: 11px;">
                    ${c.isToday ? '🎉 Today!' : c.badge}
                  </span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                  ${escapeHtml(c.roleLabel)} • ${escapeHtml(c.formattedDate)}
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="font-size: 12.5px; color: var(--text-dim); display: flex; align-items: center; gap: 6px;">
                <span>💌</span> <strong>${c.greetingsCount || 0}</strong> wishes received
              </div>
              <button type="button" class="btn btn-primary btn-sm send-wish-btn" data-id="${c.userId}" data-name="${escapeHtml(c.displayName)}" data-role="${escapeHtml(c.roleLabel)}">
                Send Wish
              </button>
            </div>
          </div>
        `).join('');
      }

      attachCardEventListeners();
    } catch (err) {
      todayContainer.innerHTML = `<p style="color: var(--color-danger);">Failed to load celebrations: ${escapeHtml(err.message)}</p>`;
    }
  };

  // Load Received Greetings Inbox
  const loadGreetings = async () => {
    try {
      const res = await api.getMyGreetings();
      const greetings = res.data || [];

      // Update Unread Count Badge
      const unreadCount = greetings.filter(g => !g.isRead).length;
      const unreadBadge = document.getElementById('badge-unread-count');
      if (unreadBadge) {
        unreadBadge.textContent = unreadCount;
        unreadBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
      }

      if (greetings.length === 0) {
        greetingsContainer.innerHTML = `
          <div class="empty-state" style="padding: 40px 20px;">
            <div class="empty-state-icon">💌</div>
            <div class="empty-state-title">No greetings in your inbox yet</div>
            <p>When peers and mentors send you birthday greetings, they will arrive in this private inbox.</p>
          </div>
        `;
        return;
      }

      greetingsContainer.innerHTML = greetings.map(g => `
        <div class="glass-card" style="padding: 18px 22px; border-left: 4px solid ${g.isRead ? 'rgba(255,255,255,0.1)' : 'var(--neon-emerald)'}; background: ${g.isRead ? 'var(--bg-card)' : 'rgba(16, 185, 129, 0.05)'}; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
          <div style="display: flex; gap: 14px; flex: 1; min-width: 260px;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-full); overflow: hidden; background: rgba(59, 130, 246, 0.15); border: 2px solid var(--neon-cyan); display: flex; align-items: center; justify-content: center; font-weight: 750; color: var(--neon-cyan); flex-shrink: 0;">
              ${g.senderAvatarUrl ? `<img src="${escapeHtml(g.senderAvatarUrl)}" alt="${escapeHtml(g.senderName || 'Peer')}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />` : (g.senderName || 'P').substring(0, 2).toUpperCase()}
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <strong style="color: var(--text-heading); font-size: 14.5px;">${escapeHtml(g.senderName || 'Peer')}</strong>
                ${!g.isRead ? '<span class="badge badge-emerald" style="font-size: 10px;">NEW</span>' : ''}
              </div>
              <p style="font-size: 13.5px; color: var(--text-main); line-height: 1.6; margin: 0 0 8px 0;">
                "${escapeHtml(g.greetingText)}"
              </p>
              <div style="font-size: 11.5px; color: var(--text-dim);">
                Received ${g.createdAt ? new Date(g.createdAt).toLocaleString() : 'Recently'}
              </div>
            </div>
          </div>

          <div>
            ${!g.isRead ? `
              <button type="button" class="btn btn-outline btn-sm mark-read-btn" data-id="${g.id}" style="font-size: 11.5px; padding: 4px 10px;">
                Mark Read
              </button>
            ` : `
              <span style="font-size: 12px; color: var(--text-dim);">✓ Read</span>
            `}
          </div>
        </div>
      `).join('');

      // Attach mark-read handlers
      document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          try {
            await api.markGreetingAsRead(id);
            showToast('Greeting marked as read.', 'info');
            loadGreetings();
          } catch (e) {
            showToast(e.message || 'Error updating status.', 'error');
          }
        });
      });

    } catch (e) {
      greetingsContainer.innerHTML = `<p style="color: var(--color-danger);">Error loading greetings inbox: ${escapeHtml(e.message)}</p>`;
    }
  };

  // Render Single Celebrant Card
  const renderCelebrantCard = (b, isToday) => {
    return `
      <div class="glass-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid ${isToday ? 'var(--neon-amber)' : 'rgba(255,255,255,0.1)'}; background: ${isToday ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)' : 'var(--bg-card)'};">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="width: 48px; height: 48px; border-radius: var(--radius-full); overflow: hidden; background: rgba(245, 158, 11, 0.15); border: 2px solid ${isToday ? 'var(--neon-amber)' : 'var(--border-color)'}; display: flex; align-items: center; justify-content: center; font-weight: 750; color: var(--neon-amber); flex-shrink: 0;">
                ${b.avatarUrl ? `<img src="${escapeHtml(b.avatarUrl)}" alt="${escapeHtml(b.displayName)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />` : (b.displayName || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <strong style="color: var(--text-heading); font-size: 15px; display: block;">${escapeHtml(b.displayName)}</strong>
                <span class="user-role-badge role-${b.role}" style="font-size: 11px; padding: 2px 8px; margin-top: 3px; display: inline-block;">
                  ${escapeHtml(b.roleLabel)}
                </span>
              </div>
            </div>
            
            <span class="badge ${isToday ? 'badge-amber' : 'badge-navy'}" style="font-size: 11px;">
              ${isToday ? '🎉 Today!' : b.badge}
            </span>
          </div>

          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">
            ${escapeHtml(b.company || b.courseName || 'Alumni Network')} ${b.jobTitle ? `• ${escapeHtml(b.jobTitle)}` : ''}
          </div>

          <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 16px; display: flex; align-items: center; gap: 6px;">
            <span>🗓️</span> Celebrating: <strong>${escapeHtml(b.formattedDate)}</strong>
          </div>
        </div>

        <button type="button" class="btn ${isToday ? 'btn-primary' : 'btn-outline'} btn-sm send-wish-btn" data-id="${b.userId}" data-name="${escapeHtml(b.displayName)}" data-role="${escapeHtml(b.roleLabel)}" style="width: 100%;" data-tooltip="Dispatch personal birthday greeting">
          💌 ${isToday ? 'Send Birthday Wish' : 'Prepare Birthday Wish'}
        </button>
      </div>
    `;
  };

  // Card Event Listeners
  const attachCardEventListeners = () => {
    document.querySelectorAll('.send-wish-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        openGreetingComposerModal(uid, name);
      });
    });
  };

  // Modal 1: Send Birthday Wish Composer Modal
  const openGreetingComposerModal = (targetUid, targetName) => {
    const templates = [
      "Wishing you a very Happy Birthday! May your year be filled with happiness and success.",
      "Happy Birthday! Sending you warm wishes and hoping you achieve everything you dream of.",
      "Wishing you a wonderful birthday and an amazing year ahead!"
    ];

    const content = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-md); padding: 14px 18px; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 28px;">🎂</span>
          <div>
            <div style="font-size: 11px; font-weight: 750; color: var(--neon-amber); text-transform: uppercase;">Honoring Peer</div>
            <div style="font-weight: 700; color: var(--text-heading); font-size: 16px;">${escapeHtml(targetName)}</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Select Warm Template</label>
          <select id="greeting-template-picker" class="form-control">
            <option value="">-- Choose an institutional template --</option>
            ${templates.map((t, idx) => `<option value="${escapeHtml(t)}">Template ${idx + 1}: ${escapeHtml(t.substring(0, 52))}...</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" for="custom-greeting-text" style="margin: 0;">Personal Birthday Greeting</label>
            <span id="char-counter" style="font-size: 11.5px; color: var(--text-dim);">0 / 300</span>
          </div>
          <textarea id="custom-greeting-text" class="form-control" maxlength="300" placeholder="Write your personalized greeting (max 300 characters)..." style="min-height: 110px;">${escapeHtml(templates[0])}</textarea>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-outline" id="cancel-greet-btn">Cancel</button>
      <button type="button" class="btn btn-primary" id="confirm-greet-btn">Send Birthday Wish</button>
    `;

    const { close } = openModal({ title: `Send Birthday Wish: ${targetName}`, contentHtml: content, footerHtml: footer });

    const picker = document.getElementById('greeting-template-picker');
    const textarea = document.getElementById('custom-greeting-text');
    const charCounter = document.getElementById('char-counter');
    const sendBtn = document.getElementById('confirm-greet-btn');

    const updateCounter = () => {
      const len = textarea.value.length;
      charCounter.textContent = `${len} / 300`;
      charCounter.style.color = len >= 290 ? 'var(--color-danger)' : 'var(--text-dim)';
    };

    updateCounter();
    textarea.addEventListener('input', updateCounter);

    picker.addEventListener('change', () => {
      if (picker.value) {
        textarea.value = picker.value;
        updateCounter();
      }
    });

    document.getElementById('cancel-greet-btn').addEventListener('click', close);
    sendBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) {
        showToast('Greeting message cannot be empty.', 'error');
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';

      try {
        await api.sendBirthdayGreeting(targetUid, text);
        showToast(`Birthday greeting delivered to ${targetName}!`, 'success');
        close();
        loadBirthdays();
      } catch (err) {
        showToast(err.message || 'Failed to dispatch greeting.', 'error');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Birthday Wish';
      }
    });
  };

  // Modal 2: Manage My Birthday & Privacy Settings Modal
  const openMyBirthdayModal = async () => {
    let currentDob = '';
    let currentVis = 'visible';

    try {
      const bRes = await api.getBirthdays();
      const myDob = bRes.data?.myDob;
      if (myDob) {
        currentDob = myDob.dob || '';
        currentVis = myDob.visibility || 'visible';
      }
    } catch (e) {}

    const content = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5;">
          Specify your Date of Birth to celebrate with your community. Your birth year is stored securely and is strictly confidential.
        </div>

        <div class="form-group">
          <label class="form-label" for="modal-set-dob">Date of Birth</label>
          <input type="date" id="modal-set-dob" class="form-control" value="${escapeHtml(currentDob)}" required>
          <span style="font-size: 11.5px; color: var(--text-dim); display: block; margin-top: 4px;">
            🔒 Only day and month are shown in celebrations. Year is strictly hidden.
          </span>
        </div>

        <div class="form-group">
          <label class="form-label" for="modal-set-vis">Community Celebration Visibility</label>
          <select id="modal-set-vis" class="form-control">
            <option value="visible" ${currentVis !== 'hidden' ? 'selected' : ''}>
              Visible to Alumni Community (Day & month celebrated)
            </option>
            <option value="hidden" ${currentVis === 'hidden' ? 'selected' : ''}>
              Hidden from Community (Private; never celebrated)
            </option>
          </select>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-outline" id="cancel-dob-btn">Cancel</button>
      <button type="button" class="btn btn-primary" id="save-dob-btn">Save Celebration Settings</button>
    `;

    const { close } = openModal({ title: 'Birthday & Celebration Settings', contentHtml: content, footerHtml: footer });

    document.getElementById('cancel-dob-btn').addEventListener('click', close);
    document.getElementById('save-dob-btn').addEventListener('click', async () => {
      const dobVal = document.getElementById('modal-set-dob').value.trim();
      const visVal = document.getElementById('modal-set-vis').value;

      if (!dobVal) {
        showToast('Please select a valid date of birth.', 'error');
        return;
      }

      const d = new Date(dobVal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(d.getTime()) || d >= today) {
        showToast('Date of birth cannot be in the future or today.', 'error');
        return;
      }

      try {
        await api.updateMyDob({ dateOfBirth: dobVal, birthdayVisibility: visVal });
        showToast('Birthday preferences saved successfully!', 'success');
        if (dobPrompt) dobPrompt.style.display = 'none';
        close();
        loadBirthdays();
      } catch (err) {
        showToast(err.message || 'Error updating birthday.', 'error');
      }
    });
  };

  // Header "My Birthday Settings" button
  const openModalBtn = document.getElementById('open-my-bday-modal-btn');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', openMyBirthdayModal);
  }

  // Profile Prompt handlers
  const promptAddBtn = document.getElementById('prompt-add-bday-btn');
  if (promptAddBtn) {
    promptAddBtn.addEventListener('click', openMyBirthdayModal);
  }

  const promptDismissBtn = document.getElementById('prompt-dismiss-bday-btn');
  if (promptDismissBtn) {
    promptDismissBtn.addEventListener('click', () => {
      sessionStorage.setItem('dismiss_bday_prompt', 'true');
      if (dobPrompt) dobPrompt.style.display = 'none';
      showToast('Reminder dismissed for this session.', 'info');
    });
  }

  // Initial Data Load
  loadBirthdays();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
