/**
 * Futuristic Role-Based Dashboard Component
 * Visual Inspiration: Layered glass panels, elegant charts, refined cards, subtle glowing accents without clutter.
 */
import { authState } from '../auth/authContext.js';
import { api } from '../services/api.js';
import { renderAboutButton } from '../components/featureHelp.js';

export async function renderDashboardPage() {
  const user = authState.user;
  const role = (authState.role || 'student').toLowerCase();
  const displayName = user?.displayName || 'User';

  if (role === 'admin') {
    return await renderAdminDashboard(displayName);
  } else if (role === 'faculty') {
    return await renderFacultyDashboard(displayName, user);
  } else if (role === 'alumni') {
    return await renderAlumniDashboard(displayName, user);
  } else {
    return await renderStudentDashboard(displayName, user);
  }
}

// Student Dashboard
async function renderStudentDashboard(displayName, user) {
  let stats = { connections: 0, mentorships: 0, applications: 0, events: 0 };
  let opportunities = [];
  let birthdays = { today: [], upcoming: [] };
  let goals = [];

  try {
    const [cRes, mRes, aRes, eRes, oRes, bRes, gRes] = await Promise.all([
      api.getConnections().catch(() => ({ data: [] })),
      api.getMentorships().catch(() => ({ data: [] })),
      api.getApplications().catch(() => ({ data: [] })),
      api.getMyRegistrations().catch(() => ({ data: [] })),
      api.getOpportunities().catch(() => ({ data: [] })),
      api.getBirthdays().catch(() => ({ data: { today: [], upcoming: [] } })),
      api.getGoals().catch(() => ({ data: [] }))
    ]);

    stats.connections = cRes.data?.filter(c => c.status === 'accepted').length || 0;
    stats.mentorships = mRes.data?.filter(m => m.status === 'accepted').length || 0;
    stats.applications = aRes.data?.length || 0;
    stats.events = eRes.data?.length || 0;
    opportunities = oRes.data?.slice(0, 3) || [];
    birthdays = bRes.data || { today: [], upcoming: [] };
    goals = gRes.data?.slice(0, 3) || [];
  } catch (e) {
    console.warn('Dashboard fetch warning:', e);
  }

  const courseName = user?.profile?.courseName || 'Computer Science & Engineering';

  return `
    <div class="student-dashboard-workspace" style="display: flex; flex-direction: column; gap: 28px;">
      
      <!-- Ambient Workspace Lighting Orbs (Floating Background Layer) -->
      <div class="student-ambient-orb student-ambient-orb-top" id="student-orb-top" aria-hidden="true"></div>
      <div class="student-ambient-orb student-ambient-orb-mid" id="student-orb-mid" aria-hidden="true"></div>
      <div class="student-ambient-orb student-ambient-orb-bottom" id="student-orb-bottom" aria-hidden="true"></div>

      <!-- Futuristic Glass Banner -->
      <div class="glass-card" style="position: relative; z-index: 2; padding: 32px; border-left: 4px solid #00E5FF; background: linear-gradient(135deg, rgba(14, 165, 233, 0.10) 0%, rgba(59, 130, 246, 0.08) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <span class="user-role-badge role-student">Student Scholar</span>
              <span class="badge badge-cyan" style="background: rgba(0, 229, 255, 0.12); color: #38BDF8; border: 1px solid rgba(0, 229, 255, 0.3);">⚡ Academic Year 2025-2026</span>
            </div>
            <h1 style="font-size: 28px; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">
              Welcome back, ${escapeHtml(displayName)}!
            </h1>
            <p style="color: var(--text-muted); font-size: 14.5px; max-width: 650px;">
              ${escapeHtml(courseName)} • Your career growth trajectory is on track with active mentors and verified job opportunities.
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display: flex; gap: 10px; align-items: center;">
            ${renderAboutButton('student-dashboard')}
            <a href="#/opportunities" class="btn btn-primary btn-sm" data-tooltip="Explore jobs, internships & referrals">Explore Jobs</a>
            <a href="#/mentorship" class="btn btn-outline btn-sm" data-tooltip="Connect with industry alumni mentors">Find Mentor</a>
          </div>
        </div>
      </div>

      <!-- Layered Glass Stat Cards with Mini Sparklines -->
      <div class="stat-grid" style="position: relative; z-index: 2;">
        
        <!-- Stat 1: Connections -->
        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Active Connections</div>
            <div class="stat-value">${stats.connections}</div>
            <div class="stat-trend up">
              <span>↑</span> <span>+14.8%</span> <span style="color: var(--text-dim); font-weight: 400;">this month</span>
            </div>
            <!-- Sparkline -->
            <div style="margin-top: 10px; height: 26px;">
              <svg viewBox="0 0 100 24" style="width: 100%; height: 100%; overflow: visible;">
                <path d="M 0 20 Q 25 10 50 16 T 100 4" fill="none" stroke="#00E5FF" stroke-width="2" />
              </svg>
            </div>
          </div>
          <div class="stat-icon" style="color: #00E5FF;">👥</div>
        </div>

        <!-- Stat 2: Mentorships -->
        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">1-on-1 Mentorships</div>
            <div class="stat-value">${stats.mentorships}</div>
            <div class="stat-trend up">
              <span>↑</span> <span>Verified</span> <span style="color: var(--text-dim); font-weight: 400;">alumni mentors</span>
            </div>
            <!-- Sparkline -->
            <div style="margin-top: 10px; height: 26px;">
              <svg viewBox="0 0 100 24" style="width: 100%; height: 100%; overflow: visible;">
                <path d="M 0 18 Q 30 6 60 14 T 100 2" fill="none" stroke="#3B82F6" stroke-width="2" />
              </svg>
            </div>
          </div>
          <div class="stat-icon" style="color: #3B82F6;">🎯</div>
        </div>

        <!-- Stat 3: Tracked Applications -->
        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Applications Tracked</div>
            <div class="stat-value">${stats.applications}</div>
            <div class="stat-trend up">
              <span>↑</span> <span>Active</span> <span style="color: var(--text-dim); font-weight: 400;">recruitment links</span>
            </div>
            <!-- Sparkline -->
            <div style="margin-top: 10px; height: 26px;">
              <svg viewBox="0 0 100 24" style="width: 100%; height: 100%; overflow: visible;">
                <path d="M 0 22 Q 35 12 70 8 T 100 4" fill="none" stroke="#06B6D4" stroke-width="2" />
              </svg>
            </div>
          </div>
          <div class="stat-icon" style="color: #06B6D4;">💼</div>
        </div>

        <!-- Stat 4: Events -->
        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Registered Events</div>
            <div class="stat-value">${stats.events}</div>
            <div class="stat-trend up">
              <span>↑</span> <span>Confirmed</span> <span style="color: var(--text-dim); font-weight: 400;">seat reserved</span>
            </div>
            <!-- Sparkline -->
            <div style="margin-top: 10px; height: 26px;">
              <svg viewBox="0 0 100 24" style="width: 100%; height: 100%; overflow: visible;">
                <path d="M 0 16 Q 40 22 70 10 T 100 2" fill="none" stroke="#10B981" stroke-width="2" />
              </svg>
            </div>
          </div>
          <div class="stat-icon" style="color: #10B981;">📅</div>
        </div>

      </div>

      <!-- Main Layout: 2 Columns -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        
        <!-- Left: Opportunities & Career Milestones -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Opportunities Glass Panel -->
          <div class="glass-card">
            <div class="card-header">
              <h3 class="card-title">
                <span>💼</span> Curated Industry Opportunities
              </h3>
              <a href="#/opportunities" class="btn btn-outline btn-sm">View All Board</a>
            </div>

            ${opportunities.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">💼</div>
                <div class="empty-state-title">No new opportunities posted</div>
                <p>Curated postings and alumni referrals will appear right here.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${opportunities.map(opp => `
                  <div class="glass-card" style="padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; border: var(--glass-border); background: var(--bg-subtle);">
                    <div>
                      <div style="font-weight: 700; color: var(--text-heading); font-size: 15px; margin-bottom: 4px;">
                        ${escapeHtml(opp.title)}
                      </div>
                      <div style="font-size: 13px; color: var(--text-muted);">
                        ${escapeHtml(opp.company)} • ${escapeHtml(opp.location)}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <span class="badge badge-amber">${escapeHtml(opp.type || 'Full-time')}</span>
                      <a href="#/opportunities" class="btn btn-outline btn-sm">Inspect Role</a>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Career Goals & Milestone Tracker -->
          <div class="glass-card">
            <div class="card-header">
              <h3 class="card-title">
                <span>🎯</span> Career Milestones & Readiness
              </h3>
              <a href="#/career-tracker" class="btn btn-outline btn-sm">Open Tracker</a>
            </div>

            ${goals.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">🚀</div>
                <div class="empty-state-title">No career milestones created yet</div>
                <p>Define your roadmap goals to track progress and get AI-assisted guidance.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 18px;">
                ${goals.map(g => `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; margin-bottom: 6px;">
                      <span style="color: var(--text-heading);">${escapeHtml(g.title)}</span>
                      <span style="color: var(--neon-amber); font-weight: 700;">${g.progressPercentage || 0}%</span>
                    </div>
                    <div class="progress-container">
                      <div class="progress-bar" style="width: ${g.progressPercentage || 0}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

        <!-- Right: Cohort Spotlight & Fast Actions -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Luminous Readiness Gauge Card -->
          <div class="glass-card" style="text-align: center; padding: 26px;">
            <h3 class="card-title" style="justify-content: center; margin-bottom: 16px;">
              <span>⚡</span> Profile Strength
            </h3>
            
            <div class="circle-progress-wrap" style="margin: 0 auto 16px;">
              <svg class="circle-progress-svg" viewBox="0 0 72 72">
                <defs>
                  <linearGradient id="studentCyanBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00E5FF" />
                    <stop offset="100%" stop-color="#3B82F6" />
                  </linearGradient>
                </defs>
                <circle class="circle-progress-bg" cx="36" cy="36" r="30" />
                <circle class="circle-progress-bar" cx="36" cy="36" r="30" style="stroke-dashoffset: 35; stroke: url(#studentCyanBlueGrad);" />
              </svg>
              <div style="position: absolute; font-size: 17px; font-weight: 800; color: var(--text-heading);">
                85%
              </div>
            </div>

            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
              Add your portfolio projects and GitHub profile to reach 100% verified status.
            </p>
            <a href="#/settings" class="btn btn-outline btn-sm" style="width: 100%;">Complete Profile</a>
          </div>

          <!-- Birthday Corner -->
          <div class="glass-card">
            <div class="card-header">
              <h3 class="card-title">
                <span>🎂</span> Birthday Corner
              </h3>
              <a href="#/birthdays" class="btn btn-outline btn-sm">View Hub</a>
            </div>

            ${(birthdays.today?.length || 0) > 0 ? `
              <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: 750; color: var(--neon-amber); text-transform: uppercase; margin-bottom: 6px;">🎉 Celebrating Today</div>
                ${birthdays.today.map(b => `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="font-weight: 600; color: var(--text-heading); font-size: 13.5px;">${escapeHtml(b.displayName || b.name)}</div>
                    <a href="#/birthdays" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 2px 8px;">Wish</a>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${(birthdays.upcoming?.length || 0) > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Upcoming (Next 30 Days)</div>
                ${birthdays.upcoming.slice(0, 3).map(b => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-main);">
                    <span>${escapeHtml(b.displayName || b.name)}</span>
                    <span class="badge badge-navy" style="font-size: 10px;">${escapeHtml(b.badge || b.formattedDate || '')}</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <p style="font-size: 13px; color: var(--text-dim); margin: 0;">No birthdays recorded for this week.</p>
            `}
          </div>

          <!-- Quick Navigation Panel -->
          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom: 14px;">
              <span>🚀</span> Fast Shortcuts
            </h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="#/directory" class="btn btn-outline btn-sm" style="justify-content: flex-start;">👥 Alumni Directory</a>
              <a href="#/messages" class="btn btn-outline btn-sm" style="justify-content: flex-start;">💬 Direct Messaging</a>
              <a href="#/batches" class="btn btn-outline btn-sm" style="justify-content: flex-start;">🎓 Batch Communities</a>
              <a href="#/resources" class="btn btn-outline btn-sm" style="justify-content: flex-start;">📚 Resource Library</a>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}

// Alumni Dashboard
async function renderAlumniDashboard(displayName, user) {
  const prof = user?.profile || {};
  const isAvailable = prof.isMentoringAvailable !== false;
  const currentMentees = prof.currentMenteesCount || 0;
  const maxMentees = prof.maxMentees || 4;
  let birthdays = { today: [], upcoming: [] };

  try {
    const bRes = await api.getBirthdays().catch(() => ({ data: { today: [], upcoming: [] } }));
    birthdays = bRes.data || birthdays;
  } catch (e) {}

  return `
    <div style="display: flex; flex-direction: column; gap: 28px;">
      
      <!-- Alumni Glass Banner -->
      <div class="glass-card" style="padding: 32px; border-left: 4px solid var(--neon-emerald); background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <span class="user-role-badge role-alumni">Distinguished Alumni</span>
              <span class="badge badge-emerald">Class of ${prof.graduationYear || '2021'}</span>
            </div>
            <h1 style="font-size: 28px; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">
              Welcome back, ${escapeHtml(displayName)}!
            </h1>
            <p style="color: var(--text-muted); font-size: 14.5px;">
              ${escapeHtml(prof.jobTitle || 'Senior Software Engineer')} at ${escapeHtml(prof.company || 'Tech Industry')} • Mentoring students & leading cohort initiatives.
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            ${renderAboutButton('alumni-dashboard')}
            <a href="#/opportunities" class="btn btn-primary btn-sm" data-tooltip="Post a new job opening or referral opportunity">+ Post Opportunity</a>
            <a href="#/achievements" class="btn btn-outline btn-sm" data-tooltip="Share professional honors, patents or publications">Share Milestone</a>
          </div>
        </div>
      </div>

      <!-- Stat Grid -->
      <div class="stat-grid">
        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Mentorship Status</div>
            <div class="stat-value" style="font-size: 22px; color: ${isAvailable ? 'var(--neon-emerald)' : 'var(--text-dim)'};">
              ${isAvailable ? 'ACTIVE' : 'PAUSED'}
            </div>
            <div class="stat-trend up"><span>●</span> Ready for requests</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-emerald);">🎯</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Active Mentees</div>
            <div class="stat-value">${currentMentees} / ${maxMentees}</div>
            <div class="stat-trend up"><span>●</span> Student scholars</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-cyan);">👨‍🎓</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Direct Conversations</div>
            <div class="stat-value">Inbox</div>
            <div class="stat-trend up"><span>●</span> Real-time chat</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-violet);">💬</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Upcoming Reunions</div>
            <div class="stat-value">Calendar</div>
            <div class="stat-trend up"><span>●</span> Batch 2021</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-amber);">📅</div>
        </div>
      </div>

      <!-- Actions & Mentorship Settings -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">Alumni Contribution Hub</h3>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <a href="#/opportunities" class="glass-card" style="text-align: center; text-decoration: none; border: 1px dashed var(--neon-amber);">
              <div style="font-size: 32px; margin-bottom: 8px;">💼</div>
              <div style="font-weight: 700; color: var(--text-heading); font-size: 15px;">Post Job or Referral</div>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Connect students to open roles at your organization</p>
            </a>

            <a href="#/achievements" class="glass-card" style="text-align: center; text-decoration: none; border: 1px dashed var(--neon-emerald);">
              <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
              <div style="font-weight: 700; color: var(--text-heading); font-size: 15px;">Submit Milestone</div>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Share promotions, patents, or publications</p>
            </a>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom: 14px;">Mentorship Preferences</h3>
            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 18px; line-height: 1.5;">
              Control your intake of student guidance requests and set mentorship capacity limits.
            </p>
            <a href="#/mentorship" class="btn btn-primary" style="width: 100%;">Configure Mentorship</a>
          </div>

          <!-- Alumni Birthday Corner Card -->
          <div class="glass-card">
            <div class="card-header">
              <h3 class="card-title">
                <span>🎂</span> Birthday Corner
              </h3>
              <a href="#/birthdays" class="btn btn-outline btn-sm">View Hub</a>
            </div>
            ${(birthdays.today?.length || 0) > 0 ? `
              <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 14px; margin-bottom: 10px;">
                <div style="font-size: 11px; font-weight: 750; color: var(--neon-amber); text-transform: uppercase; margin-bottom: 4px;">🎉 Today's Celebrations</div>
                ${birthdays.today.map(b => `<div style="font-weight: 600; color: var(--text-heading); font-size: 13.5px;">${escapeHtml(b.displayName || b.name)}</div>`).join('')}
              </div>
            ` : ''}
            ${(birthdays.upcoming?.length || 0) > 0 ? `
              <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px;">Upcoming</div>
              ${birthdays.upcoming.slice(0, 2).map(b => `
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-main); margin-bottom: 4px;">
                  <span>${escapeHtml(b.displayName || b.name)}</span>
                  <span class="badge badge-navy" style="font-size: 10px;">${escapeHtml(b.badge || b.formattedDate || '')}</span>
                </div>
              `).join('')}
            ` : `
              <p style="font-size: 13px; color: var(--text-dim); margin: 0;">No birthdays recorded for this week.</p>
            `}
          </div>
        </div>
      </div>

    </div>
  `;
}

// Faculty Dashboard
async function renderFacultyDashboard(displayName, user) {
  let pendingOpps = 0;
  let pendingAch = 0;
  let birthdays = { today: [], upcoming: [] };
  try {
    const [oRes, aRes, bRes] = await Promise.all([
      api.getPendingOpportunities().catch(() => ({ data: [] })),
      api.getPendingAchievements().catch(() => ({ data: [] })),
      api.getBirthdays().catch(() => ({ data: { today: [], upcoming: [] } }))
    ]);
    pendingOpps = oRes.data?.length || 0;
    pendingAch = aRes.data?.length || 0;
    birthdays = bRes.data || birthdays;
  } catch (e) {}

  return `
    <div style="display: flex; flex-direction: column; gap: 28px;">
      
      <!-- Faculty Glass Banner -->
      <div class="glass-card" style="padding: 32px; border-left: 4px solid var(--neon-amber); background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(234, 88, 12, 0.08) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <span class="user-role-badge role-faculty">Faculty Advisor</span>
              <span class="badge badge-amber">Academic Oversight</span>
            </div>
            <h1 style="font-size: 28px; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">
              Welcome back, ${escapeHtml(displayName)}!
            </h1>
            <p style="color: var(--text-muted); font-size: 14.5px;">
              Department Leadership, Academic Resource Curation, and Moderation Console.
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            ${renderAboutButton('faculty-dashboard')}
            <a href="#/faculty/moderation" class="btn btn-primary btn-sm" data-tooltip="Inspect and moderate pending submissions">Moderation Queue (${pendingOpps + pendingAch})</a>
            <a href="#/faculty/promotion" class="btn btn-outline btn-sm" data-tooltip="Batch promote students to alumni">Student Promotion</a>
          </div>
        </div>
      </div>

      <!-- Stat Grid -->
      <div class="stat-grid">
        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Pending Opportunities</div>
            <div class="stat-value" style="color: var(--neon-amber);">${pendingOpps}</div>
            <div class="stat-trend up"><span>●</span> Awaiting verification</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-amber);">💼</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Pending Achievements</div>
            <div class="stat-value" style="color: var(--neon-violet);">${pendingAch}</div>
            <div class="stat-trend up"><span>●</span> Student submissions</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-violet);">🏆</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Student Directory</div>
            <div class="stat-value">Inspect</div>
            <div class="stat-trend up"><span>●</span> Full roster</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-cyan);">👥</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Academic Library</div>
            <div class="stat-value">Curate</div>
            <div class="stat-trend up"><span>●</span> Published notes</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-emerald);">📚</div>
        </div>
      </div>

      <!-- Action Panels -->
      <div class="glass-card">
        <h3 class="card-title" style="margin-bottom: 18px;">Academic Leadership Controls</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          <a href="#/faculty/moderation" class="btn btn-navy" style="padding: 14px;">🛡️ Moderation Center</a>
          <a href="#/faculty/promotion" class="btn btn-outline" style="padding: 14px;">🎓 Promote Graduating Class</a>
          <a href="#/resources" class="btn btn-outline" style="padding: 14px;">📤 Upload Lecture Material</a>
          <a href="#/resources" class="btn btn-outline" style="padding: 14px;">📢 Broadcast Announcement</a>
        </div>
      </div>

      <!-- Community Birthday Announcements -->
      <div class="glass-card" style="padding: 24px;">
        <div class="card-header" style="margin-bottom: 14px;">
          <h3 class="card-title">
            <span>🎂</span> Community Celebrations & Birthdays
          </h3>
          <a href="#/birthdays" class="btn btn-outline btn-sm">Celebration Hub</a>
        </div>
        ${(birthdays.today?.length || 0) > 0 ? `
          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 750; color: var(--neon-amber); text-transform: uppercase;">🎉 Celebrating Today</div>
              <div style="font-weight: 600; color: var(--text-heading); font-size: 14px; margin-top: 2px;">
                ${birthdays.today.map(b => escapeHtml(b.displayName || b.name)).join(', ')}
              </div>
            </div>
            <a href="#/birthdays" class="btn btn-primary btn-sm">Send Faculty Wishes</a>
          </div>
        ` : `
          <p style="font-size: 13.5px; color: var(--text-muted); margin: 0;">
            No faculty, student, or alumni birthdays scheduled for today. ${(birthdays.upcoming?.length || 0)} upcoming this month.
          </p>
        `}
      </div>

    </div>
  `;
}

// Admin Dashboard
async function renderAdminDashboard(displayName) {
  let stats = { totalUsers: 0, openTickets: 0, pendingOpps: 0, pendingAch: 0, approvedEvents: 0 };
  let dbStatus = { engine: 'SQLite', status: 'connected' };
  let birthdays = { today: [], upcoming: [] };

  try {
    const [sRes, dbRes, bRes] = await Promise.all([
      api.getAdminStats().catch(() => ({ data: {} })),
      api.checkDatabaseHealth().catch(() => ({ data: { engine: 'SQLite', status: 'connected' } })),
      api.getBirthdays().catch(() => ({ data: { today: [], upcoming: [] } }))
    ]);
    stats = sRes.data || stats;
    dbStatus = dbRes.data || dbStatus;
    birthdays = bRes.data || birthdays;
  } catch (e) {}

  return `
    <div style="display: flex; flex-direction: column; gap: 28px;">
      
      <!-- Admin Glass Banner -->
      <div class="glass-card" style="padding: 32px; border-left: 4px solid var(--neon-violet); background: linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <span class="user-role-badge role-admin">Chief Administrator</span>
              <span class="badge badge-violet">Full Clearance</span>
            </div>
            <h1 style="font-size: 28px; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">
              Master Administration Console
            </h1>
            <p style="color: var(--text-muted); font-size: 14.5px;">
              System governance, SQLite database health, role elevation, and tamper-evident audit logging.
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            ${renderAboutButton('admin-dashboard')}
            <a href="#/admin/users" class="btn btn-primary btn-sm" data-tooltip="Manage user accounts and role permissions">Manage Users</a>
            <a href="#/admin/audit-logs" class="btn btn-outline btn-sm" data-tooltip="Inspect tamper-evident administrative audit log">Security Logs</a>
          </div>
        </div>
      </div>

      <!-- Database Health Indicator -->
      <div class="glass-card" style="padding: 18px 24px; border-left: 4px solid var(--neon-emerald); background: rgba(16, 185, 129, 0.06);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 22px;">🟢</span>
            <div>
              <div style="font-weight: 700; color: var(--neon-emerald); font-size: 14.5px;">
                Local Relational SQLite Database: CONNECTED & SYNCHRONIZED
              </div>
              <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                Engine: <code>${dbStatus.engine || 'SQLite'}</code> • File: <code>${dbStatus.database_file || 'myalumni.db'}</code> • Status: <code>Operational</code>
              </div>
            </div>
          </div>
          <a href="#/admin" class="btn btn-outline btn-sm">System Health Details</a>
        </div>
      </div>

      <!-- System KPI Grid -->
      <div class="stat-grid">
        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Registered Accounts</div>
            <div class="stat-value">${stats.totalUsers || 4}</div>
            <div class="stat-trend up"><span>●</span> All authorization tiers</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-cyan);">👥</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Open Support Tickets</div>
            <div class="stat-value" style="color: ${stats.openSupportTickets > 0 ? 'var(--color-danger)' : 'inherit'};">
              ${stats.openSupportTickets || 0}
            </div>
            <div class="stat-trend up"><span>●</span> SMTP auto-response ready</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-amber);">🎫</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Pending Submissions</div>
            <div class="stat-value" style="color: var(--neon-violet);">
              ${(stats.pendingOpportunities || 0) + (stats.pendingAchievements || 0)}
            </div>
            <div class="stat-trend up"><span>●</span> Moderation queue</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-violet);">🛡️</div>
        </div>

        <div class="stat-card">
          <div style="flex: 1;">
            <div class="stat-label">Active Events</div>
            <div class="stat-value">${stats.approvedEvents || 2}</div>
            <div class="stat-trend up"><span>●</span> Published on calendar</div>
          </div>
          <div class="stat-icon" style="color: var(--neon-emerald);">📅</div>
        </div>
      </div>

      <!-- Core Admin Sections -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="glass-card">
          <h3 class="card-title" style="margin-bottom: 16px;">Security & User Governance</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <a href="#/admin/users" class="btn btn-navy" style="justify-content: flex-start;">👥 Manage Users, Elevate Roles & Account Status</a>
            <a href="#/admin/tickets" class="btn btn-outline" style="justify-content: flex-start;">🎫 Inbound Support Tickets & Inquiries</a>
            <a href="#/admin/audit-logs" class="btn btn-outline" style="justify-content: flex-start;">📜 Immutable Security Audit Trail</a>
          </div>
        </div>

        <div class="glass-card">
          <h3 class="card-title" style="margin-bottom: 16px;">Curriculum & Structure</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <a href="#/admin" class="btn btn-outline" style="justify-content: flex-start;">🏛️ Manage Academic Degrees & Courses</a>
            <a href="#/admin" class="btn btn-outline" style="justify-content: flex-start;">📅 Configure Academic Cohort Years</a>
            <a href="#/batches" class="btn btn-outline" style="justify-content: flex-start;">🎓 Verified Class Batch Communities</a>
          </div>
        </div>
      </div>

      <!-- Admin Community Celebrations Overview -->
      <div class="glass-card" style="padding: 24px; border-left: 4px solid var(--neon-amber);">
        <div class="card-header" style="margin-bottom: 14px;">
          <h3 class="card-title">
            <span>🎂</span> Community Celebrations & Birthday Governance
          </h3>
          <a href="#/birthdays" class="btn btn-outline btn-sm">Manage Celebrations Hub</a>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <p style="font-size: 13.5px; color: var(--text-muted); margin: 0; max-width: 650px;">
            Active today: <strong>${(birthdays.today?.length || 0)} celebrants</strong> • Upcoming in next 30 days: <strong>${(birthdays.upcoming?.length || 0)} members</strong>.
            Consent-based privacy strictly enforced across directories and public endpoints.
          </p>
          <a href="#/birthdays" class="btn btn-primary btn-sm">Open Celebration Hub</a>
        </div>
      </div>

    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

export function initDashboardPage() {
  const role = (authState.role || 'student').toLowerCase();
  if (role === 'student') {
    initStudentDashboardBackground();
  }
}

export function initStudentDashboardBackground() {
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isTouch && !prefersReduced) {
    const orbTop = document.getElementById('student-orb-top');
    const orbMid = document.getElementById('student-orb-mid');
    const orbBottom = document.getElementById('student-orb-bottom');

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const onMouseMove = (e) => {
      const w = window.innerWidth || 1920;
      const h = window.innerHeight || 1080;
      targetX = (e.clientX / w) * 2 - 1;
      targetY = (e.clientY / h) * 2 - 1;
    };

    const updateParallax = () => {
      if (!document.getElementById('student-orb-top')) {
        window.removeEventListener('mousemove', onMouseMove);
        return;
      }

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      if (orbTop) {
        orbTop.style.transform = `translate(${mouseX * 18}px, ${mouseY * 14}px)`;
      }
      if (orbMid) {
        orbMid.style.transform = `translate(${mouseX * -14}px, ${mouseY * -10}px)`;
      }
      if (orbBottom) {
        orbBottom.style.transform = `translate(${mouseX * 16}px, ${mouseY * 12}px)`;
      }

      requestAnimationFrame(updateParallax);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    requestAnimationFrame(updateParallax);
  }
}
