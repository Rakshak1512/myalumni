/**
 * BATCHVERSE — PHASE 1: WHERE CLASSMATES STAY CONNECTED
 * MyAlumni 2.0 | Complete Cohort Community Platform
 * Features:
 * 1. Main Dashboard: My Batches, Available Batch Communities, Highlights, Quick Actions
 * 2. Verified Academic Membership: Strict eligibility enforcement (Course & Grad Year)
 * 3. Batch Community Page: Responsive Overview, Members Directory, Discussions
 * 4. Members Directory: Real-time search, role filtering, privacy sanitization
 * 5. Discussions & Interactions: 5 categories, image attachments, like toggle, threaded comments
 * 6. Community Moderation: User reporting, Admin post/comment deletion
 * 7. NEXUS 2.0 Cinematic Dark Mystery UI with Pearl Light Mode compatibility
 */

import { api } from '../services/api.js';
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderAboutButton } from '../components/featureHelp.js';
import { createUniversalFileUploader } from '../components/universalFileUploader.js';

export async function renderBatchesPage() {
  return `
    <div style="min-height: 100vh; display: flex; flex-direction: column; gap: 28px; position: relative; z-index: 1;">
      <div id="batchverse-root">
        <div style="text-align: center; padding: 60px 20px; color: var(--text-dim);">
          <div style="font-size: 36px; margin-bottom: 12px; animation: pulse 1.5s infinite;">🎓</div>
          <div style="font-size: 16px; font-weight: 600; color: var(--text-heading);">Loading BatchVerse Cohort Network...</div>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Synchronizing verified academic records and community feeds.</p>
        </div>
      </div>
    </div>
  `;
}

export async function initBatchesPage() {
  const root = document.getElementById('batchverse-root');
  if (!root) return;

  const user = authState.user;
  const currentRole = (authState.role || 'student').toLowerCase();
  const currentUserId = user?.uid;

  // State
  let allBatches = [];
  let myBatches = [];
  let eligibleBatches = [];
  let highlights = { recentDiscussions: [], activeMembersCount: 0, totalDiscussionsCount: 0 };
  let activeBatchId = null;
  let activeBatch = null;
  let activeTab = 'overview'; // 'overview' | 'members' | 'discussions' | 'events' | 'announcements' | 'polls'
  let batchMembers = [];
  let memberSearch = '';
  let memberRoleFilter = 'all';
  let memberSort = 'name';
  let batchPosts = [];
  let postCategoryFilter = 'all';
  let openCommentsPostIds = new Set();
  let commentsCache = new Map(); // postId -> comments[]
  let batchEvents = [];
  let eventFilter = 'all'; // 'all' | 'upcoming' | 'completed' | 'cancelled'
  let batchAnnouncements = [];
  let batchPolls = [];
  let pollFilter = 'all'; // 'all' | 'active' | 'closed'
  // Phase 3: Memories Gallery
  let batchMemories = [];
  let memorySubTab = 'all'; // 'all' | 'albums' | 'timeline' | 'moderation'
  let memoryEventFilter = 'all';
  let memoryYearFilter = 'all';
  let batchAlbums = [];
  let memoryTimeline = [];
  let memoryReports = [];
  let openCommentsMemoryIds = new Set();
  let memoryCommentsCache = new Map();

  // Parse URL query parameters e.g. #/batches?batchId=...&tab=...
  const parseQueryParams = () => {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const searchParams = new URLSearchParams(hash.substring(qIndex));
      return {
        batchId: searchParams.get('batchId'),
        tab: searchParams.get('tab') || 'overview'
      };
    }
    return { batchId: null, tab: 'overview' };
  };

  const setUrlQuery = (batchId, tab) => {
    if (batchId) {
      window.location.hash = `#/batches?batchId=${batchId}&tab=${tab || 'overview'}`;
    } else {
      window.location.hash = `#/batches`;
    }
  };

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [batchesRes, myBatchesRes, eligibleRes, highlightsRes] = await Promise.all([
        api.getBatches().catch(() => ({ data: [] })),
        api.getMyBatches().catch(() => ({ data: [] })),
        api.getEligibleBatches().catch(() => ({ data: [] })),
        api.getBatchHighlights().catch(() => ({ data: { recentDiscussions: [], activeMembersCount: 0, totalDiscussionsCount: 0 } }))
      ]);

      allBatches = batchesRes.data || [];
      myBatches = myBatchesRes.data || [];
      eligibleBatches = eligibleRes.data || [];
      highlights = highlightsRes.data || { recentDiscussions: [], activeMembersCount: 0, totalDiscussionsCount: 0 };

      const query = parseQueryParams();
      if (query.batchId) {
        activeBatchId = query.batchId;
        activeTab = query.tab || 'overview';
        activeBatch = allBatches.find(b => b.id === activeBatchId) || null;
      } else {
        activeBatchId = null;
        activeBatch = null;
      }

      if (activeBatchId) {
        await loadBatchCommunityData(activeBatchId);
      } else {
        renderMainDashboard();
      }
    } catch (e) {
      console.error('BatchVerse load error:', e);
      root.innerHTML = `
        <div class="glass-card" style="padding: 40px; text-align: center; border-left: 4px solid var(--color-danger);">
          <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-heading); margin-bottom: 8px;">Failed to Load BatchVerse</h2>
          <p style="color: var(--text-muted); font-size: 14px; max-width: 500px; margin: 0 auto 20px;">
            Unable to connect to the community server. Please verify your authentication credentials or refresh the page.
          </p>
          <button type="button" id="btn-retry-batches" class="btn btn-primary btn-sm">Try Again</button>
        </div>
      `;
      document.getElementById('btn-retry-batches')?.addEventListener('click', refreshAllData);
    }
  };

  const loadBatchCommunityData = async (batchId) => {
    try {
      const [bRes, mRes, pRes, eRes, aRes, polRes, memRes, albRes, timeRes, repRes] = await Promise.all([
        api.getBatch(batchId).catch(() => ({ data: null })),
        api.getBatchMembers(batchId).catch(() => ({ data: [] })),
        api.getBatchPosts(batchId).catch(() => ({ data: [] })),
        api.getBatchEvents(batchId).catch(() => ({ data: [] })),
        api.getBatchAnnouncements(batchId).catch(() => ({ data: [] })),
        api.getBatchPolls(batchId).catch(() => ({ data: [] })),
        api.getBatchMemories(batchId).catch(() => ({ data: [] })),
        api.getBatchAlbums(batchId).catch(() => ({ data: [] })),
        api.getMemoryTimeline(batchId).catch(() => ({ data: [] })),
        currentRole === 'admin' ? api.getMemoryReports().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      activeBatch = bRes.data;
      batchMembers = mRes.data || [];
      batchPosts = pRes.data || [];
      batchEvents = eRes.data || [];
      batchAnnouncements = aRes.data || [];
      batchPolls = polRes.data || [];
      batchMemories = memRes.data || [];
      batchAlbums = albRes.data || [];
      memoryTimeline = timeRes.data || [];
      memoryReports = repRes.data || [];

      renderBatchCommunityWorkspace();
    } catch (e) {
      showToast('Could not load community feed for this cohort.', 'error');
      renderMainDashboard();
    }
  };

  // =========================================================================
  // VIEW 1: BATCHVERSE MAIN DASHBOARD (Hub View)
  // =========================================================================
  const renderMainDashboard = () => {
    root.innerHTML = `
      <!-- Hero Banner -->
      <div class="glass-card" style="padding: 32px; border-left: 4px solid #6366f1; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <span class="user-role-badge role-${currentRole}">${currentRole}</span>
              <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4);">
                🎓 Verified Cohort Network
              </span>
            </div>
            <h1 style="font-size: 30px; font-weight: 800; color: var(--text-heading); margin-bottom: 8px; letter-spacing: -0.5px;">
              BatchVerse
            </h1>
            <p style="color: var(--text-muted); font-size: 15px; max-width: 680px; line-height: 1.6; margin: 0;">
              Where classmates stay connected throughout their professional journey. Connect with your graduation class, share college memories, seek advice, and engage in authentic peer discussions.
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            ${renderAboutButton('batches', 'About BatchVerse')}
            ${myBatches.length > 0 ? `
              <button type="button" id="btn-quick-open-primary" class="btn btn-primary btn-sm" style="box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);">
                ⚡ Open My Cohort (${escapeHtml(myBatches[0].name.split('—')[0].trim())})
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Quick Navigation Action Pills -->
        <div style="margin-top: 26px; padding-top: 20px; border-top: var(--glass-border); display: flex; gap: 12px; flex-wrap: wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-quick-my-batches" style="display: flex; align-items: center; gap: 8px;">
            <span>🎓</span> My Enrolled Batches (${myBatches.length})
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btn-quick-available-batches" style="display: flex; align-items: center; gap: 8px;">
            <span>✨</span> Available Batches (${eligibleBatches.length})
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btn-quick-highlights" style="display: flex; align-items: center; gap: 8px;">
            <span>🔥</span> Community Activity (${highlights.totalDiscussionsCount || 0})
          </button>
        </div>
      </div>

      <!-- Main Layout Grid: Left (Batches) & Right (Highlights & Telemetry) -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 28px;" class="batchverse-grid">
        
        <!-- Left Column: My Batches & Available Batches -->
        <div style="display: flex; flex-direction: column; gap: 28px;">
          
          <!-- SECTION A: MY BATCHES -->
          <div id="section-my-batches" class="glass-card">
            <div class="card-header">
              <h2 class="card-title" style="font-size: 18px;">
                <span>🎓</span> My Enrolled Cohorts
              </h2>
              <span class="badge badge-emerald">${myBatches.length} Active Communities</span>
            </div>

            ${myBatches.length === 0 ? `
              <div class="empty-state" style="padding: 36px 20px;">
                <div class="empty-state-icon">🎓</div>
                <div class="empty-state-title">No Batch Enrolled Yet</div>
                <p style="max-width: 440px; margin: 0 auto 16px;">
                  You have not enrolled in your graduating cohort community yet. Check the Available Batches section below to claim your verified membership!
                </p>
                ${eligibleBatches.length > 0 ? `
                  <button type="button" class="btn btn-primary btn-sm btn-jump-to-eligible">
                    View ${eligibleBatches.length} Eligible Cohort${eligibleBatches.length > 1 ? 's' : ''}
                  </button>
                ` : ''}
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;">
                ${myBatches.map(b => `
                  <div class="glass-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid #6366f1; background: var(--bg-card);">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <span class="badge badge-emerald" style="text-transform: capitalize;">Verified Member</span>
                        <span style="font-size: 12px; font-weight: 700; color: #a5b4fc;">Class of ${b.graduationYear || '—'}</span>
                      </div>
                      <h3 style="font-size: 16px; font-weight: 750; color: var(--text-heading); margin-bottom: 6px; line-height: 1.4;">
                        ${escapeHtml(b.name)}
                      </h3>
                      <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">
                        ${escapeHtml(b.courseName || 'Engineering Program')}
                      </div>
                      <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 16px;">
                        ${escapeHtml(b.department || 'Academic Division')}
                      </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: var(--glass-border);">
                      <div style="font-size: 12.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                        <span>👥</span> <strong>${b.verifiedMembersCount || b.membersCount || 1}</strong> Classmates
                      </div>
                      <button type="button" class="btn btn-primary btn-sm btn-enter-batch" data-id="${b.id}" style="border-radius: var(--radius-full); padding: 6px 16px;">
                        Enter Hub →
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- SECTION B: AVAILABLE BATCH COMMUNITIES -->
          <div id="section-available-batches" class="glass-card">
            <div class="card-header">
              <h2 class="card-title" style="font-size: 18px;">
                <span>✨</span> Available Batch Communities
              </h2>
              <span class="badge badge-cyan">Eligibility Engine</span>
            </div>

            ${eligibleBatches.length === 0 ? `
              <div class="empty-state" style="padding: 30px 20px;">
                <div style="font-size: 32px; margin-bottom: 10px;">🛡️</div>
                <div class="empty-state-title" style="font-size: 16px;">All Eligible Batches Enrolled</div>
                <p style="max-width: 480px; margin: 0 auto; font-size: 13.5px; color: var(--text-muted);">
                  ${myBatches.length > 0 
                    ? 'You are already an active verified member of all academic cohorts matching your degree records.' 
                    : 'No matching batch found for your academic records. Please contact administration if your graduation year or course assignment needs updating.'}
                </p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${eligibleBatches.map(b => `
                  <div class="glass-card" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border: 1px solid rgba(6, 182, 212, 0.25); background: var(--bg-card);">
                    <div style="max-width: 520px;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span class="badge badge-cyan">Eligible Cohort</span>
                        <span style="font-size: 12px; color: var(--text-dim);">Degree Match Confirmed</span>
                      </div>
                      <h3 style="font-size: 16px; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                        ${escapeHtml(b.name)}
                      </h3>
                      <div style="font-size: 13px; color: var(--text-muted);">
                        ${escapeHtml(b.courseName || 'Degree')} • Class of ${b.graduationYear} • ${escapeHtml(b.department || '')}
                      </div>
                      <div style="font-size: 12px; color: var(--text-dim); margin-top: 6px;">
                        ${escapeHtml(b.description || 'Official community for this graduating class.')}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 14px;">
                      <div style="text-align: right; font-size: 12.5px; color: var(--text-dim);">
                        <div><strong>${b.verifiedMembersCount || b.membersCount || 0}</strong> verified</div>
                        <div>classmates</div>
                      </div>
                      <button type="button" class="btn btn-outline btn-sm btn-join-batch" data-id="${b.id}" data-name="${escapeHtml(b.name)}" style="border-radius: var(--radius-full); padding: 8px 18px; border-color: var(--neon-cyan); color: var(--text-heading);">
                        ✦ Join Cohort
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Institutional Batches Directory (All Batches for Overview & Transparency) -->
          <div class="glass-card">
            <div class="card-header">
              <h2 class="card-title" style="font-size: 18px;">
                <span>🏛️</span> Institutional Batch Roster
              </h2>
              <span class="badge" style="background: var(--bg-subtle); color: var(--text-muted);">${allBatches.length} Total Cohorts</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${allBatches.map(b => {
                const isMember = myBatches.some(m => m.id === b.id);
                const isEligible = eligibleBatches.some(e => e.id === b.id);
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: var(--radius-md); border: var(--glass-border); background: var(--bg-subtle);">
                    <div>
                      <div style="font-weight: 600; font-size: 14.5px; color: var(--text-heading);">${escapeHtml(b.name)}</div>
                      <div style="font-size: 12.5px; color: var(--text-dim);">${escapeHtml(b.courseName || '')} • ${b.graduationYear}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      ${isMember ? `
                        <span class="badge badge-emerald">Enrolled</span>
                        <button type="button" class="btn btn-outline btn-sm btn-enter-batch" data-id="${b.id}">Open</button>
                      ` : isEligible ? `
                        <span class="badge badge-cyan">Eligible</span>
                        <button type="button" class="btn btn-primary btn-sm btn-join-batch" data-id="${b.id}" data-name="${escapeHtml(b.name)}">Join</button>
                      ` : currentRole === 'admin' ? `
                        <span class="badge badge-violet">Admin Oversight</span>
                        <button type="button" class="btn btn-outline btn-sm btn-enter-batch" data-id="${b.id}">Inspect</button>
                      ` : `
                        <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-dim);" title="${escapeHtml(b.eligibilityReason || 'Restricted to cohort students & alumni')}">
                          🔒 Restricted
                        </span>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- Right Column: Community Highlights & Quick Telemetry -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Telemetry Stats Card -->
          <div class="glass-card" style="padding: 24px;">
            <div class="card-header" style="margin-bottom: 16px;">
              <h3 class="card-title" style="font-size: 16px;">
                <span>⚡</span> Network Telemetry
              </h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: var(--glass-border);">
                <span style="font-size: 13.5px; color: var(--text-muted);">Active Classmates</span>
                <span style="font-size: 18px; font-weight: 800; color: #a5b4fc;">${highlights.activeMembersCount || 0}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: var(--glass-border);">
                <span style="font-size: 13.5px; color: var(--text-muted);">Total Discussions</span>
                <span style="font-size: 18px; font-weight: 800; color: var(--neon-cyan);">${highlights.totalDiscussionsCount || 0}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13.5px; color: var(--text-muted);">Total Cohorts</span>
                <span style="font-size: 18px; font-weight: 800; color: var(--neon-emerald);">${allBatches.length}</span>
              </div>
            </div>
          </div>

          <!-- Recent Discussions Stream -->
          <div class="glass-card" style="padding: 24px;">
            <div class="card-header" style="margin-bottom: 16px;">
              <h3 class="card-title" style="font-size: 16px;">
                <span>🔥</span> Recent Discussions
              </h3>
            </div>

            ${highlights.recentDiscussions?.length === 0 ? `
              <div style="padding: 20px 0; text-align: center; color: var(--text-dim); font-size: 13px;">
                No discussions posted yet. Join your batch to start the conversation!
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${highlights.recentDiscussions.map(d => `
                  <div class="glass-card btn-enter-batch" data-id="${d.batch_id}" style="padding: 14px; cursor: pointer; border: var(--glass-border); background: var(--bg-subtle);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span class="badge post-type-${d.post_type || 'general'}" style="font-size: 10px; text-transform: uppercase;">
                        ${d.post_type || 'general'}
                      </span>
                      <span style="font-size: 11px; color: var(--text-dim);">${formatRelativeTime(d.created_at)}</span>
                    </div>
                    <div style="font-weight: 700; font-size: 13.5px; color: var(--text-heading); margin-bottom: 4px; line-height: 1.3;">
                      ${escapeHtml(d.title)}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                      <span>by ${escapeHtml(d.author_name || 'Classmate')}</span>
                      <span>💬 ${d.comments_count || 0} • ❤️ ${d.likes_count || 0}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Academic Verification Assurance Badge -->
          <div class="glass-card" style="padding: 20px; border-left: 3px solid var(--neon-cyan); background: rgba(6, 182, 212, 0.05);">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <div style="font-size: 24px;">🛡️</div>
              <div>
                <div style="font-size: 13.5px; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                  Strict Academic Boundaries
                </div>
                <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin: 0;">
                  BatchVerse verifies student degree courses, enrollment years, and graduation dates directly against university records. Classmate rosters and private discussions are protected from unauthorized access.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    `;

    // Attach Event Handlers for Hub View
    document.querySelectorAll('.btn-enter-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        const batchId = btn.getAttribute('data-id');
        if (batchId) {
          activeBatchId = batchId;
          activeTab = 'overview';
          setUrlQuery(batchId, 'overview');
          loadBatchCommunityData(batchId);
        }
      });
    });

    document.querySelectorAll('.btn-join-batch').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const batchId = btn.getAttribute('data-id');
        const batchName = btn.getAttribute('data-name');
        try {
          btn.disabled = true;
          btn.textContent = 'Enrolling...';
          await api.joinBatch(batchId);
          showToast(`Successfully enrolled in ${batchName}!`, 'success');
          await refreshAllData();
          activeBatchId = batchId;
          activeTab = 'overview';
          setUrlQuery(batchId, 'overview');
          loadBatchCommunityData(batchId);
        } catch (err) {
          showToast(err.message || 'Failed to join batch.', 'error');
          btn.disabled = false;
          btn.textContent = '✦ Join Cohort';
        }
      });
    });

    document.getElementById('btn-quick-open-primary')?.addEventListener('click', () => {
      if (myBatches.length > 0) {
        const b = myBatches[0];
        activeBatchId = b.id;
        activeTab = 'overview';
        setUrlQuery(b.id, 'overview');
        loadBatchCommunityData(b.id);
      }
    });

    document.getElementById('btn-quick-my-batches')?.addEventListener('click', () => {
      document.getElementById('section-my-batches')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btn-quick-available-batches')?.addEventListener('click', () => {
      document.getElementById('section-available-batches')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btn-quick-highlights')?.addEventListener('click', () => {
      window.scrollTo({ top: 300, behavior: 'smooth' });
    });

    document.querySelectorAll('.btn-jump-to-eligible').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('section-available-batches')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  };

  // =========================================================================
  // VIEW 2: BATCH COMMUNITY WORKSPACE (Detailed Cohort View)
  // =========================================================================
  const renderBatchCommunityWorkspace = () => {
    if (!activeBatch) return;

    const isMember = activeBatch.isMember || myBatches.some(m => m.id === activeBatch.id);
    const isEligible = activeBatch.isEligible;
    const canParticipate = isMember || currentRole === 'admin';

    root.innerHTML = `
      <!-- Workspace Navigation Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <button type="button" id="btn-back-to-hub" class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 8px;">
          <span>←</span> Back to BatchVerse Hub
        </button>
        <div style="display: flex; gap: 10px; align-items: center;">
          ${renderAboutButton('batches')}
        </div>
      </div>

      <!-- Batch Header Card -->
      <div class="glass-card" style="padding: 30px; border-top: 3px solid #6366f1; background: var(--bg-card);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
          <div style="max-width: 780px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
              <span class="badge badge-violet">Class of ${activeBatch.graduationYear || '—'}</span>
              <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-muted);">
                ${escapeHtml(activeBatch.courseName || '')}
              </span>
              ${isMember ? `
                <span class="badge badge-emerald">Verified Member</span>
              ` : isEligible ? `
                <span class="badge badge-cyan">Eligible to Join</span>
              ` : `
                <span class="badge badge-warning">Restricted Batch</span>
              `}
            </div>

            <h1 style="font-size: 28px; font-weight: 800; color: var(--text-heading); margin-bottom: 8px; letter-spacing: -0.5px;">
              ${escapeHtml(activeBatch.name)}
            </h1>

            <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0 0 16px;">
              ${escapeHtml(activeBatch.description || `Official cohort network for ${activeBatch.courseName || 'graduating students'}. Share memories, schedule reunions, and maintain lifelong classmate bonds.`)}
            </p>

            <div style="display: flex; gap: 20px; font-size: 13px; color: var(--text-dim); flex-wrap: wrap;">
              <div>🏛️ <strong>${escapeHtml(activeBatch.department || 'Computer Science & Engineering')}</strong></div>
              <div>👥 <strong>${activeBatch.verifiedMembersCount || activeBatch.membersCount || batchMembers.length}</strong> Verified Classmates</div>
              <div>💬 <strong>${batchPosts.length}</strong> Discussions</div>
            </div>
          </div>

          <!-- Actions -->
          <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
            ${!isMember && isEligible ? `
              <button type="button" id="btn-workspace-join" class="btn btn-primary" style="padding: 10px 24px; box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);">
                ✦ Join This Cohort
              </button>
            ` : ''}

            ${canParticipate ? `
              ${activeTab === 'memories' ? `
                <button type="button" id="btn-workspace-upload-memory" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px; border-radius: var(--radius-full); padding: 9px 22px;">
                  <span>📸</span> Upload Memory
                </button>
              ` : `
                <button type="button" id="btn-workspace-new-post" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px; border-radius: var(--radius-full); padding: 9px 22px;">
                  <span>✍️</span> Start Discussion
                </button>
              `}
            ` : ''}
          </div>
        </div>

        <!-- 6-Tab Responsive Navigation Header -->
        <div style="margin-top: 26px; padding-top: 20px; border-top: var(--glass-border); display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="batch-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
            <span>📋</span> Overview
          </button>
          <button type="button" class="batch-tab-btn ${activeTab === 'members' ? 'active' : ''}" data-tab="members">
            <span>👥</span> Members Directory (${batchMembers.length})
          </button>
          <button type="button" class="batch-tab-btn ${activeTab === 'discussions' ? 'active' : ''}" data-tab="discussions">
            <span>💬</span> Discussions (${batchPosts.length})
          </button>
          <button type="button" class="batch-tab-btn ${activeTab === 'events' ? 'active' : ''}" data-tab="events">
            <span>🎉</span> Events & Reunions (${batchEvents.length})
          </button>
          <button type="button" class="batch-tab-btn ${activeTab === 'announcements' ? 'active' : ''}" data-tab="announcements">
            <span>📢</span> Announcements (${batchAnnouncements.length})
          </button>
          <button type="button" class="batch-tab-btn ${activeTab === 'polls' ? 'active' : ''}" data-tab="polls">
            <span>📊</span> Polls & Voting (${batchPolls.length})
          </button>
          <button type="button" class="batch-tab-btn ${activeTab === 'memories' ? 'active' : ''}" data-tab="memories">
            <span>📸</span> Memories Gallery (${batchMemories.length})
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div id="batch-tab-content">
        ${renderTabContent(activeTab, isMember, canParticipate)}
      </div>
    `;

    attachWorkspaceEvents();
  };

  // Render specific tab
  const renderTabContent = (tab, isMember, canParticipate) => {
    switch (tab) {
      case 'members':
        return renderMembersTab();
      case 'discussions':
        return renderDiscussionsTab(canParticipate);
      case 'events':
        return renderEventsTab(canParticipate);
      case 'announcements':
        return renderAnnouncementsTab(canParticipate);
      case 'polls':
        return renderPollsTab(canParticipate);
      case 'memories':
        return renderMemoriesTab(canParticipate);
      case 'overview':
      default:
        return renderOverviewTab(isMember, canParticipate);
    }
  };

  // =========================================================================
  // TAB 1: OVERVIEW
  // =========================================================================
  const renderOverviewTab = (isMember, canParticipate) => {
    const previewMembers = batchMembers.slice(0, 6);
    const previewPosts = batchPosts.slice(0, 3);

    return `
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        
        <!-- Left: About & Recent Discussions Preview -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Cohort Highlights Card -->
          <div class="glass-card">
            <div class="card-header">
              <h2 class="card-title" style="font-size: 17px;">
                <span>🎓</span> Cohort Identity & Program Specifications
              </h2>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
              <div style="padding: 14px; border-radius: var(--radius-md); background: var(--bg-subtle); border: var(--glass-border);">
                <div style="font-size: 11.5px; color: var(--text-dim); text-transform: uppercase;">Graduation Year</div>
                <div style="font-size: 20px; font-weight: 800; color: #a5b4fc; margin-top: 4px;">Class of ${activeBatch.graduationYear}</div>
              </div>
              <div style="padding: 14px; border-radius: var(--radius-md); background: var(--bg-subtle); border: var(--glass-border);">
                <div style="font-size: 11.5px; color: var(--text-dim); text-transform: uppercase;">Academic Degree</div>
                <div style="font-size: 16px; font-weight: 750; color: var(--text-heading); margin-top: 4px;">${escapeHtml(activeBatch.courseName || 'Computer Science')}</div>
              </div>
              <div style="padding: 14px; border-radius: var(--radius-md); background: var(--bg-subtle); border: var(--glass-border);">
                <div style="font-size: 11.5px; color: var(--text-dim); text-transform: uppercase;">Department</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--neon-cyan); margin-top: 4px;">${escapeHtml(activeBatch.department || 'Engineering')}</div>
              </div>
            </div>

            <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6; margin: 0;">
              This community is exclusively verified for students and alumni who completed or are completing their coursework in the ${escapeHtml(activeBatch.name)}. Discussions, reunions, and professional updates shared here remain private to verified batch members and departmental leadership.
            </p>
          </div>

          <!-- Discussions Spotlight -->
          <div class="glass-card">
            <div class="card-header">
              <h2 class="card-title" style="font-size: 17px;">
                <span>💬</span> Recent Batch Discussions
              </h2>
              <button type="button" class="btn btn-outline btn-sm btn-switch-tab" data-tab="discussions">
                View All (${batchPosts.length})
              </button>
            </div>

            ${previewPosts.length === 0 ? `
              <div class="empty-state" style="padding: 30px 16px;">
                <p style="color: var(--text-dim); font-size: 13.5px;">No discussions started in this cohort yet.</p>
                ${canParticipate ? `
                  <button type="button" class="btn btn-primary btn-sm btn-trigger-new-post" style="margin-top: 10px;">
                    + Start First Discussion
                  </button>
                ` : ''}
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${previewPosts.map(p => `
                  <div class="glass-card btn-open-discussion-tab" role="button" tabindex="0" aria-label="Open discussion: ${escapeHtml(p.title)}" style="padding: 16px; cursor: pointer; border: var(--glass-border); background: var(--bg-subtle);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span class="badge post-type-${p.postType || 'general'}" style="font-size: 10.5px; text-transform: uppercase;">
                        ${p.postType || 'general'}
                      </span>
                      <span style="font-size: 12px; color: var(--text-dim);">${formatRelativeTime(p.createdAt)}</span>
                    </div>
                    <div style="font-weight: 700; font-size: 15px; color: var(--text-heading); margin-bottom: 6px;">
                      ${escapeHtml(p.title)}
                    </div>
                    <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 10px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      ${escapeHtml(p.content)}
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-dim);">
                      <span>Posted by <strong>${escapeHtml(p.authorName)}</strong> (${p.authorRole})</span>
                      <span>❤️ ${p.likesCount || 0} • 💬 ${p.commentsCount || 0} replies</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

        <!-- Right: Classmates Preview & Quick Actions -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Classmates Roster Preview -->
          <div class="glass-card">
            <div class="card-header">
              <h3 class="card-title" style="font-size: 16px;">
                <span>👥</span> Classmates (${batchMembers.length})
              </h3>
              <button type="button" class="btn btn-outline btn-sm btn-switch-tab" data-tab="members">
                Directory
              </button>
            </div>

            ${previewMembers.length === 0 ? `
              <div style="padding: 20px 0; text-align: center; color: var(--text-dim); font-size: 13px;">
                No members found.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${previewMembers.map(m => `
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #00f0ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700;">
                        ${(m.displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style="font-size: 13.5px; font-weight: 600; color: var(--text-heading);">${escapeHtml(m.displayName)}</div>
                        <div style="font-size: 11.5px; color: var(--text-dim); text-transform: capitalize;">${m.role} • ${escapeHtml(m.jobTitle || m.company || 'Scholar')}</div>
                      </div>
                    </div>
                    <a href="#/messages" class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 11px;" title="Send Direct Message">
                      💬
                    </a>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Community Guidelines -->
          <div class="glass-card" style="padding: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            <div style="font-weight: 700; color: var(--text-heading); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>📜</span> Cohort Code of Conduct
            </div>
            <ul style="padding-left: 18px; margin: 0; display: flex; flex-direction: column; gap: 6px;">
              <li>Support fellow classmates with mentorship and career opportunities.</li>
              <li>Maintain respectful discourse in discussions and replies.</li>
              <li>Report any abusive or non-academic content to administrators.</li>
            </ul>
          </div>

        </div>

      </div>
    `;
  };

  // =========================================================================
  // TAB 2: MEMBERS DIRECTORY
  // =========================================================================
  const renderMembersTab = () => {
    // Filter and sort members
    let filtered = batchMembers.filter(m => {
      const matchRole = memberRoleFilter === 'all' || (m.role || '').toLowerCase() === memberRoleFilter.toLowerCase();
      const term = memberSearch.toLowerCase().trim();
      const matchSearch = !term || 
        (m.displayName || '').toLowerCase().includes(term) ||
        (m.company || '').toLowerCase().includes(term) ||
        (m.jobTitle || '').toLowerCase().includes(term) ||
        (m.location || '').toLowerCase().includes(term);
      return matchRole && matchSearch;
    });

    if (memberSort === 'recent') {
      filtered.sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
    } else {
      filtered.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Filter and Search Controls -->
        <div class="glass-card" style="padding: 18px 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            
            <!-- Search Field -->
            <div style="position: relative; flex: 1; min-width: 260px;">
              <input type="text" id="member-search-input" class="form-control" placeholder="Search classmates by name, company, or job role..." value="${escapeHtml(memberSearch)}" style="padding-left: 36px;" />
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim);">🔍</span>
            </div>

            <!-- Role Dropdown -->
            <div style="display: flex; align-items: center; gap: 10px;">
              <label for="member-role-filter" style="font-size: 13px; color: var(--text-muted); font-weight: 600;">Role:</label>
              <select id="member-role-filter" class="form-control" style="width: auto; min-width: 130px;">
                <option value="all" ${memberRoleFilter === 'all' ? 'selected' : ''}>All Roles</option>
                <option value="student" ${memberRoleFilter === 'student' ? 'selected' : ''}>Students</option>
                <option value="alumni" ${memberRoleFilter === 'alumni' ? 'selected' : ''}>Alumni</option>
                <option value="faculty" ${memberRoleFilter === 'faculty' ? 'selected' : ''}>Faculty</option>
                <option value="admin" ${memberRoleFilter === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>

            <!-- Sort Dropdown -->
            <div style="display: flex; align-items: center; gap: 10px;">
              <label for="member-sort-filter" style="font-size: 13px; color: var(--text-muted); font-weight: 600;">Sort:</label>
              <select id="member-sort-filter" class="form-control" style="width: auto; min-width: 140px;">
                <option value="name" ${memberSort === 'name' ? 'selected' : ''}>Name (A-Z)</option>
                <option value="recent" ${memberSort === 'recent' ? 'selected' : ''}>Recently Joined</option>
              </select>
            </div>

          </div>
        </div>

        <!-- Members Grid -->
        ${filtered.length === 0 ? `
          <div class="glass-card" style="padding: 40px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">No Classmates Found</h3>
            <p style="font-size: 13.5px; color: var(--text-muted); margin: 0;">Try adjusting your search criteria or clearing filters.</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px;">
            ${filtered.map(m => `
              <div class="glass-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; border: var(--glass-border); background: var(--bg-card);">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #00f0ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 700; box-shadow: 0 0 12px rgba(99, 102, 241, 0.35);">
                        ${(m.displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style="font-weight: 750; font-size: 15.5px; color: var(--text-heading);">${escapeHtml(m.displayName)}</div>
                        <span class="user-role-badge role-${m.role || 'member'}" style="margin-top: 2px;">${m.role}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Professional details if shared -->
                  <div style="font-size: 13px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;">
                    ${m.jobTitle || m.company ? `
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span>💼</span>
                        <span style="color: var(--text-heading); font-weight: 600;">${escapeHtml(m.jobTitle || 'Professional')}</span>
                        ${m.company ? `<span>at ${escapeHtml(m.company)}</span>` : ''}
                      </div>
                    ` : `
                      <div style="display: flex; align-items: center; gap: 6px; color: var(--text-dim);">
                        <span>🎓</span> <span>${escapeHtml(activeBatch.courseName || 'Student Scholar')}</span>
                      </div>
                    `}
                    ${m.location ? `
                      <div style="display: flex; align-items: center; gap: 6px; color: var(--text-dim);">
                        <span>📍</span> <span>${escapeHtml(m.location)}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Card Actions -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: var(--glass-border);">
                  <span style="font-size: 11.5px; color: var(--text-dim);">Verified Cohort</span>
                  <div style="display: flex; gap: 8px;">
                    <a href="#/messages" class="btn btn-outline btn-sm" style="font-size: 12px; border-radius: var(--radius-full); padding: 5px 12px;">
                      💬 Message
                    </a>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}

      </div>
    `;
  };

  // =========================================================================
  // TAB 3: COMMUNITY DISCUSSIONS
  // =========================================================================
  const renderDiscussionsTab = (canParticipate) => {
    // Filter posts by category
    const filteredPosts = batchPosts.filter(p => {
      if (postCategoryFilter === 'all') return true;
      return (p.postType || 'general').toLowerCase() === postCategoryFilter.toLowerCase();
    });

    const categories = [
      { id: 'all', label: 'All Discussions' },
      { id: 'general', label: 'General' },
      { id: 'memories', label: 'College Memories' },
      { id: 'questions', label: 'Questions & Advice' },
      { id: 'career', label: 'Career Updates' },
      { id: 'activities', label: 'Batch Activities' }
    ];

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Category Filter Pills & New Post CTA -->
        <div class="glass-card" style="padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${categories.map(c => `
              <button type="button" class="btn btn-sm btn-filter-category ${postCategoryFilter === c.id ? 'btn-primary' : 'btn-outline'}" data-cat="${c.id}" style="border-radius: var(--radius-full); font-size: 12.5px;">
                ${c.label}
              </button>
            `).join('')}
          </div>

          ${canParticipate ? `
            <button type="button" class="btn btn-primary btn-sm btn-trigger-new-post" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-full); padding: 7px 18px;">
              <span>✍️</span> + New Post
            </button>
          ` : `
            <span style="font-size: 12.5px; color: var(--text-dim);">Join batch to participate</span>
          `}
        </div>

        <!-- Discussions Feed Stream -->
        ${filteredPosts.length === 0 ? `
          <div class="glass-card" style="padding: 48px 20px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">💬</div>
            <h3 style="font-size: 17px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
              No discussions in "${postCategoryFilter === 'all' ? 'All' : postCategoryFilter}" yet
            </h3>
            <p style="font-size: 13.5px; color: var(--text-muted); max-width: 460px; margin: 0 auto 18px;">
              Be the first to share an update, reminisce about college memories, or coordinate a meetup with your classmates!
            </p>
            ${canParticipate ? `
              <button type="button" class="btn btn-primary btn-sm btn-trigger-new-post">
                + Start Discussion
              </button>
            ` : ''}
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 18px;">
            ${filteredPosts.map(p => {
              const isAuthor = p.authorId === currentUserId;
              const canModerate = isAuthor || currentRole === 'admin';
              const isCommentsOpen = openCommentsPostIds.has(p.id);
              const postComments = commentsCache.get(p.id) || [];

              return `
                <div class="glass-card discussion-post-card" style="padding: 24px; border: var(--glass-border); background: var(--bg-card);">
                  
                  <!-- Post Header: Author info & meta -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #00f0ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; font-weight: 700;">
                        ${(p.authorName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style="font-weight: 700; font-size: 15px; color: var(--text-heading);">
                          ${escapeHtml(p.authorName)}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                          <span class="user-role-badge role-${p.authorRole || 'member'}">${p.authorRole}</span>
                          <span style="font-size: 11.5px; color: var(--text-dim);">${formatRelativeTime(p.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Category Badge & Moderation Menu -->
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="badge post-type-${p.postType || 'general'}" style="text-transform: capitalize; font-size: 11px;">
                        ${p.postType || 'General'}
                      </span>

                      <!-- Edit/Delete / Report Dropdown -->
                      <div style="display: flex; gap: 4px;">
                        ${isAuthor ? `
                          <button type="button" class="btn btn-outline btn-sm btn-edit-post" data-id="${p.id}" title="Edit Discussion" style="padding: 4px 8px; font-size: 11px;">
                            ✏️
                          </button>
                        ` : ''}
                        ${canModerate ? `
                          <button type="button" class="btn btn-outline btn-sm btn-delete-post" data-id="${p.id}" title="Delete Discussion" style="padding: 4px 8px; font-size: 11px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">
                            🗑️
                          </button>
                        ` : `
                          <button type="button" class="btn btn-outline btn-sm btn-report-post" data-id="${p.id}" title="Report Discussion" style="padding: 4px 8px; font-size: 11px; color: var(--text-dim);">
                            🚩
                          </button>
                        `}
                      </div>
                    </div>
                  </div>

                  <!-- Post Content -->
                  <h3 style="font-size: 17px; font-weight: 750; color: var(--text-heading); margin-bottom: 8px; line-height: 1.35;">
                    ${escapeHtml(p.title)}
                  </h3>
                  <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0 0 14px; white-space: pre-line;">
                    ${escapeHtml(p.content)}
                  </p>

                  <!-- Attached Image (if available) -->
                  ${p.imageUrl ? `
                    <div style="margin-bottom: 16px; border-radius: var(--radius-md); overflow: hidden; max-height: 380px; border: var(--glass-border);">
                      <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.parentElement.style.display='none';" />
                    </div>
                  ` : ''}

                  <!-- Post Bottom Interaction Bar -->
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: var(--glass-border);">
                    <div style="display: flex; gap: 12px; align-items: center;">
                      
                      <!-- Like Button -->
                      <button type="button" class="btn btn-outline btn-sm btn-like-post ${p.hasLiked ? 'btn-like-active' : ''}" data-id="${p.id}" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-full); padding: 5px 14px;">
                        <span>${p.hasLiked ? '❤️' : '🤍'}</span>
                        <span class="like-count">${p.likesCount || 0}</span>
                      </button>

                      <!-- Comments Toggle Button -->
                      <button type="button" class="btn btn-outline btn-sm btn-toggle-comments" data-id="${p.id}" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-full); padding: 5px 14px;">
                        <span>💬</span>
                        <span>${p.commentsCount || 0} Comments</span>
                      </button>

                    </div>

                    <span style="font-size: 12px; color: var(--text-dim);">
                      Cohort Discussion
                    </span>
                  </div>

                  <!-- Threaded Inline Comments Section -->
                  ${isCommentsOpen ? `
                    <div class="comments-container" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed rgba(255, 255, 255, 0.1);">
                      
                      <!-- Existing Comments -->
                      <div class="comments-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
                        ${postComments.length === 0 ? `
                          <div style="font-size: 12.5px; color: var(--text-dim); padding: 8px 0;">
                            No comments yet. Start the conversation below!
                          </div>
                        ` : postComments.map(c => {
                          const isCommentAuthor = c.authorId === currentUserId;
                          const canModComment = isCommentAuthor || currentRole === 'admin';
                          return `
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 14px; border-radius: var(--radius-sm); background: var(--bg-subtle); border: 1px solid var(--border-color);">
                              <div style="display: flex; gap: 10px; align-items: flex-start;">
                                <div style="width: 28px; height: 28px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 700; flex-shrink: 0;">
                                  ${(c.authorName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: 700; font-size: 13px; color: var(--text-heading);">${escapeHtml(c.authorName)}</span>
                                    <span class="user-role-badge role-${c.authorRole || 'member'}" style="font-size: 9.5px; padding: 1px 5px;">${c.authorRole}</span>
                                    <span style="font-size: 11px; color: var(--text-dim);">${formatRelativeTime(c.createdAt)}</span>
                                  </div>
                                  <p style="font-size: 13px; color: var(--text-main); margin: 4px 0 0; line-height: 1.4;">
                                    ${escapeHtml(c.content)}
                                  </p>
                                </div>
                              </div>
                              ${canModComment ? `
                                <button type="button" class="btn btn-outline btn-sm btn-delete-comment" data-comm-id="${c.id}" data-post-id="${p.id}" title="Delete Comment" style="padding: 2px 6px; font-size: 10px; color: var(--color-danger); border-color: transparent;">
                                  ✕
                                </button>
                              ` : ''}
                            </div>
                          `;
                        }).join('')}
                      </div>

                      <!-- New Comment Form -->
                      ${canParticipate ? `
                        <div style="display: flex; gap: 10px; align-items: center;">
                          <input type="text" class="form-control comment-input-field" data-post-id="${p.id}" placeholder="Write a comment..." style="font-size: 13px; border-radius: var(--radius-full);" />
                          <button type="button" class="btn btn-primary btn-sm btn-submit-comment" data-post-id="${p.id}" style="border-radius: var(--radius-full); padding: 7px 18px; font-size: 12.5px;">
                            Reply
                          </button>
                        </div>
                      ` : `
                        <div style="font-size: 12px; color: var(--text-dim);">Join this batch community to post comments.</div>
                      `}

                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;
  };

  // =========================================================================
  // TAB 4: REUNIONS & EVENTS (Phase 2)
  // =========================================================================
  const renderEventsTab = (canParticipate) => {
    const filteredEvents = batchEvents.filter(e => {
      if (eventFilter === 'all') return true;
      return (e.status || 'upcoming').toLowerCase() === eventFilter.toLowerCase();
    });

    const filterOptions = [
      { id: 'all', label: `All Events (${batchEvents.length})` },
      { id: 'upcoming', label: 'Upcoming' },
      { id: 'completed', label: 'Completed' },
      { id: 'cancelled', label: 'Cancelled' }
    ];

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Filter Pills & CTA -->
        <div class="glass-card" style="padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${filterOptions.map(f => `
              <button type="button" class="btn btn-sm btn-filter-event ${eventFilter === f.id ? 'btn-primary' : 'btn-outline'}" data-status="${f.id}" style="border-radius: var(--radius-full); font-size: 12.5px;">
                ${f.label}
              </button>
            `).join('')}
          </div>

          ${canParticipate ? `
            <button type="button" class="btn btn-primary btn-sm btn-trigger-new-event" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-full); padding: 7px 18px;">
              <span>🎉</span> + Schedule Event / Reunion
            </button>
          ` : `
            <span style="font-size: 12.5px; color: var(--text-dim);">Join batch to organize events</span>
          `}
        </div>

        <!-- Events List -->
        ${filteredEvents.length === 0 ? `
          <div class="glass-card" style="padding: 48px 20px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">🎉</div>
            <h3 style="font-size: 17px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
              No ${eventFilter === 'all' ? '' : eventFilter} events found
            </h3>
            <p style="font-size: 13.5px; color: var(--text-muted); max-width: 460px; margin: 0 auto 18px;">
              Plan a reunion, virtual meetup, or industry talk for your cohort!
            </p>
            ${canParticipate ? `
              <button type="button" class="btn btn-primary btn-sm btn-trigger-new-event">
                + Schedule First Event
              </button>
            ` : ''}
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
            ${filteredEvents.map(e => {
              const isCreator = e.creatorId === currentUserId;
              const canManage = isCreator || currentRole === 'admin';
              const isCancelled = e.status === 'cancelled';
              const isCompleted = e.status === 'completed';
              const myRsvp = e.currentUserRsvp; // 'going' | 'interested' | 'not_going' | null

              return `
                <div class="glass-card batch-event-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; border: var(--glass-border); background: var(--bg-card); position: relative; overflow: hidden;">
                  ${e.coverImage ? `
                    <div style="margin: -22px -22px 16px -22px; height: 160px; overflow: hidden; position: relative;">
                      <img src="${escapeHtml(e.coverImage)}" alt="${escapeHtml(e.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.style.display='none';" />
                      <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(10, 10, 20, 0.9), transparent);"></div>
                      <span class="badge" style="position: absolute; bottom: 10px; left: 14px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); text-transform: capitalize;">
                        ${escapeHtml(e.eventType || 'Reunion')}
                      </span>
                    </div>
                  ` : ''}

                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        ${!e.coverImage ? `
                          <span class="badge badge-violet" style="text-transform: capitalize;">${escapeHtml(e.eventType || 'Reunion')}</span>
                        ` : ''}
                        ${e.status === 'upcoming' ? '<span class="badge badge-emerald">Upcoming</span>' : ''}
                        ${e.status === 'completed' ? '<span class="badge badge-cyan">Completed</span>' : ''}
                        ${e.status === 'cancelled' ? '<span class="badge" style="background: rgba(239,68,68,0.2); color: #f87171;">Cancelled</span>' : ''}
                      </div>

                      ${canManage ? `
                        <div style="display: flex; gap: 4px;">
                          ${!isCancelled && !isCompleted ? `
                            <button type="button" class="btn btn-outline btn-sm btn-edit-event" data-id="${e.id}" title="Edit Event" style="padding: 4px 8px; font-size: 11px;">
                              ✏️
                            </button>
                            <button type="button" class="btn btn-outline btn-sm btn-cancel-event" data-id="${e.id}" title="Cancel Event" style="padding: 4px 8px; font-size: 11px; color: var(--color-warning);">
                              🚫
                            </button>
                          ` : ''}
                          <button type="button" class="btn btn-outline btn-sm btn-delete-event" data-id="${e.id}" title="Delete Event" style="padding: 4px 8px; font-size: 11px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">
                            🗑️
                          </button>
                        </div>
                      ` : ''}
                    </div>

                    <h3 style="font-size: 18px; font-weight: 750; color: var(--text-heading); margin-bottom: 8px; line-height: 1.35;">
                      ${escapeHtml(e.title)}
                    </h3>

                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span>📅</span>
                        <strong style="color: var(--text-heading);">${escapeHtml(e.date)}</strong>
                        ${e.startTime ? `<span>at ${escapeHtml(e.startTime)}</span>` : ''}
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span>📍</span>
                        <span>${escapeHtml(e.venue)}</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim);">
                        <span>👤 Organized by ${escapeHtml(e.creatorName)} (${e.creatorRole})</span>
                      </div>
                    </div>

                    <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.55; margin: 0 0 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                      ${escapeHtml(e.description)}
                    </p>
                  </div>

                  <!-- RSVP & Attendees Controls -->
                  <div style="padding-top: 14px; border-top: var(--glass-border); display: flex; flex-direction: column; gap: 12px;">
                    ${!isCancelled && canParticipate ? `
                      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 12px; font-weight: 600; color: var(--text-dim);">Your RSVP:</span>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                          <button type="button" class="btn btn-outline btn-sm btn-rsvp-event ${myRsvp === 'going' ? 'rsvp-active-going' : ''}" data-id="${e.id}" data-status="going" style="font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-full);">
                            ✓ Going (${e.goingCount || 0})
                          </button>
                          <button type="button" class="btn btn-outline btn-sm btn-rsvp-event ${myRsvp === 'interested' ? 'rsvp-active-interested' : ''}" data-id="${e.id}" data-status="interested" style="font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-full);">
                            ⭐ Interested (${e.interestedCount || 0})
                          </button>
                          <button type="button" class="btn btn-outline btn-sm btn-rsvp-event ${myRsvp === 'not_going' ? 'rsvp-active-not_going' : ''}" data-id="${e.id}" data-status="not_going" style="font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-full);">
                            ✕ Not Going (${e.notGoingCount || 0})
                          </button>
                        </div>
                      </div>
                    ` : `
                      <div style="font-size: 12px; color: var(--text-dim);">
                        ${isCancelled ? '⚠️ Event has been cancelled by organizers.' : `Going: ${e.goingCount || 0} • Interested: ${e.interestedCount || 0}`}
                      </div>
                    `}

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <button type="button" class="btn btn-outline btn-sm btn-view-attendees" data-id="${e.id}" style="font-size: 12px; border-radius: var(--radius-full); padding: 4px 12px;">
                        👥 View Attendees (${(e.goingCount || 0) + (e.interestedCount || 0)})
                      </button>
                      <span style="font-size: 11.5px; color: var(--text-dim);">${formatRelativeTime(e.createdAt)}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  };

  // =========================================================================
  // TAB 5: BATCH ANNOUNCEMENTS (Phase 2)
  // =========================================================================
  const renderAnnouncementsTab = (canParticipate) => {
    const isBatchAdmin = activeBatch && (activeBatch.userMembershipRole === 'admin' || activeBatch.userMembershipRole === 'moderator');
    const canPublish = currentRole === 'admin' || currentRole === 'faculty' || isBatchAdmin;

    // Separate pinned vs non-pinned
    const pinnedList = batchAnnouncements.filter(a => a.isPinned);
    const standardList = batchAnnouncements.filter(a => !a.isPinned);

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Header & Publish Action -->
        <div class="glass-card" style="padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 750; color: var(--text-heading); margin: 0 0 2px;">
              📢 Official Cohort Announcements
            </h3>
            <p style="font-size: 12.5px; color: var(--text-muted); margin: 0;">
              Broadcasted by faculty advisors, department chairs, and cohort administrators.
            </p>
          </div>

          ${canPublish ? `
            <button type="button" class="btn btn-primary btn-sm btn-trigger-new-announcement" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-full); padding: 7px 18px;">
              <span>📢</span> + Post Announcement
            </button>
          ` : `
            <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-dim); font-size: 12px;">
              Read-Only for Students
            </span>
          `}
        </div>

        ${batchAnnouncements.length === 0 ? `
          <div class="glass-card" style="padding: 48px 20px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">📢</div>
            <h3 style="font-size: 17px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
              No Announcements Published
            </h3>
            <p style="font-size: 13.5px; color: var(--text-muted); max-width: 460px; margin: 0 auto 18px;">
              There are no official notices or announcements posted for this cohort yet.
            </p>
            ${canPublish ? `
              <button type="button" class="btn btn-primary btn-sm btn-trigger-new-announcement">
                + Publish First Announcement
              </button>
            ` : ''}
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${[...pinnedList, ...standardList].map(a => {
              const isAuthor = a.authorId === currentUserId;
              const canManage = isAuthor || currentRole === 'admin';

              return `
                <div class="glass-card ${a.isPinned ? 'batch-announcement-pinned' : ''}" style="padding: 24px; border: var(--glass-border); background: var(--bg-card); transition: all 0.2s ease;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                      ${a.isPinned ? `
                        <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); font-weight: 700;">
                          📌 PINNED NOTICE
                        </span>
                      ` : ''}
                      <span class="badge priority-${a.priority || 'normal'}" style="text-transform: uppercase; font-size: 11px; font-weight: 700;">
                        ${a.priority || 'Normal'} Priority
                      </span>
                      <span style="font-size: 12px; color: var(--text-dim);">${formatRelativeTime(a.createdAt)}</span>
                    </div>

                    ${canManage ? `
                      <div style="display: flex; gap: 4px;">
                        <button type="button" class="btn btn-outline btn-sm btn-toggle-pin-announcement" data-id="${a.id}" title="${a.isPinned ? 'Unpin Announcement' : 'Pin Announcement'}" style="padding: 4px 8px; font-size: 11px;">
                          ${a.isPinned ? '📍 Unpin' : '📌 Pin'}
                        </button>
                        <button type="button" class="btn btn-outline btn-sm btn-edit-announcement" data-id="${a.id}" title="Edit Announcement" style="padding: 4px 8px; font-size: 11px;">
                          ✏️
                        </button>
                        <button type="button" class="btn btn-outline btn-sm btn-delete-announcement" data-id="${a.id}" title="Delete Announcement" style="padding: 4px 8px; font-size: 11px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">
                          🗑️
                        </button>
                      </div>
                    ` : ''}
                  </div>

                  <h3 style="font-size: 18px; font-weight: 750; color: var(--text-heading); margin-bottom: 10px; line-height: 1.35;">
                    ${escapeHtml(a.title)}
                  </h3>

                  <div style="font-size: 14px; color: var(--text-muted); line-height: 1.65; margin-bottom: 16px; white-space: pre-line;">
                    ${escapeHtml(a.content)}
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: var(--glass-border); font-size: 12px; color: var(--text-dim);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #00f0ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 700;">
                        ${(a.authorName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span>Published by <strong>${escapeHtml(a.authorName)}</strong> (${a.authorRole})</span>
                    </div>
                    <span>Cohort Official</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  };

  // =========================================================================
  // TAB 6: BATCH POLLS & VOTING (Phase 2)
  // =========================================================================
  const renderPollsTab = (canParticipate) => {
    const filteredPolls = batchPolls.filter(p => {
      if (pollFilter === 'all') return true;
      return (p.status || 'active').toLowerCase() === pollFilter.toLowerCase();
    });

    const filterOptions = [
      { id: 'all', label: `All Polls (${batchPolls.length})` },
      { id: 'active', label: 'Active' },
      { id: 'closed', label: 'Closed' }
    ];

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Filter & Create Action -->
        <div class="glass-card" style="padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${filterOptions.map(f => `
              <button type="button" class="btn btn-sm btn-filter-poll ${pollFilter === f.id ? 'btn-primary' : 'btn-outline'}" data-status="${f.id}" style="border-radius: var(--radius-full); font-size: 12.5px;">
                ${f.label}
              </button>
            `).join('')}
          </div>

          ${canParticipate ? `
            <button type="button" class="btn btn-primary btn-sm btn-trigger-new-poll" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-full); padding: 7px 18px;">
              <span>📊</span> + Create New Poll
            </button>
          ` : `
            <span style="font-size: 12.5px; color: var(--text-dim);">Join batch to vote and create polls</span>
          `}
        </div>

        ${filteredPolls.length === 0 ? `
          <div class="glass-card" style="padding: 48px 20px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">📊</div>
            <h3 style="font-size: 17px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
              No ${pollFilter === 'all' ? '' : pollFilter} polls available
            </h3>
            <p style="font-size: 13.5px; color: var(--text-muted); max-width: 460px; margin: 0 auto 18px;">
              Create a batch poll to gather opinions on reunion venues, keynote speakers, or class projects!
            </p>
            ${canParticipate ? `
              <button type="button" class="btn btn-primary btn-sm btn-trigger-new-poll">
                + Create First Poll
              </button>
            ` : ''}
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px;">
            ${filteredPolls.map(p => {
              const isCreator = p.creatorId === currentUserId;
              const canManage = isCreator || currentRole === 'admin';
              const isClosed = p.status === 'closed';
              const totalVotes = p.totalVotes || 0;
              const userVotedOptionId = p.userVotedOptionId;

              return `
                <div class="glass-card batch-poll-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border: var(--glass-border); background: var(--bg-card);">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        ${!isClosed ? `
                          <span class="badge badge-emerald">Active Poll</span>
                        ` : `
                          <span class="badge" style="background: rgba(148, 163, 184, 0.2); color: #94a3b8;">Closed</span>
                        `}
                        <span style="font-size: 12px; color: var(--text-dim);">${totalVotes} total vote${totalVotes === 1 ? '' : 's'}</span>
                      </div>

                      ${canManage ? `
                        <div style="display: flex; gap: 4px;">
                          ${!isClosed ? `
                            <button type="button" class="btn btn-outline btn-sm btn-close-poll" data-id="${p.id}" title="Close Poll" style="padding: 4px 8px; font-size: 11px; color: var(--color-warning);">
                              🔒 Close
                            </button>
                          ` : ''}
                          <button type="button" class="btn btn-outline btn-sm btn-delete-poll" data-id="${p.id}" title="Delete Poll" style="padding: 4px 8px; font-size: 11px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">
                            🗑️
                          </button>
                        </div>
                      ` : ''}
                    </div>

                    <h3 style="font-size: 17px; font-weight: 750; color: var(--text-heading); margin-bottom: 16px; line-height: 1.4;">
                      ${escapeHtml(p.question)}
                    </h3>

                    <!-- Options List -->
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
                      ${(p.options || []).map(opt => {
                        const votes = opt.votesCount || 0;
                        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const isSelected = userVotedOptionId === opt.id;

                        return `
                          <div class="poll-option-row ${isSelected ? 'poll-voted' : ''} ${!isClosed && canParticipate ? 'btn-vote-option' : ''}" ${!isClosed && canParticipate ? `role="button" tabindex="0" aria-label="Vote for ${escapeHtml(opt.optionText)}" aria-pressed="${isSelected}"` : ''} data-poll-id="${p.id}" data-opt-id="${opt.id}">
                            <div class="poll-progress-fill" style="width: ${pct}%;"></div>
                            <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px;">
                              <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${isSelected ? '#00f0ff' : 'var(--text-dim)'}; display: flex; align-items: center; justify-content: center;">
                                  ${isSelected ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #00f0ff;"></div>' : ''}
                                </div>
                                <span style="font-size: 14px; font-weight: ${isSelected ? '700' : '500'}; color: var(--text-heading);">
                                  ${escapeHtml(opt.optionText)}
                                </span>
                                ${isSelected ? `
                                  <span class="badge badge-cyan" style="font-size: 10px; padding: 2px 6px;">Your Vote</span>
                                ` : ''}
                              </div>
                              <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                                <strong style="color: var(--text-heading);">${pct}%</strong>
                                <span style="color: var(--text-dim); font-size: 11.5px;">(${votes})</span>
                              </div>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: var(--glass-border); font-size: 12px; color: var(--text-dim);">
                    <div>Created by <strong>${escapeHtml(p.creatorName)}</strong></div>
                    <div>${p.closingDate ? `Closes: ${escapeHtml(p.closingDate)}` : formatRelativeTime(p.createdAt)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  };


  // =========================================================================
  // TAB 7: MEMORIES GALLERY & COMMUNITY MEMORIES (Phase 3)
  // =========================================================================
  const renderMemoriesTab = (canParticipate) => {
    // Unique years present in batchMemories for year filter
    const years = Array.from(new Set(batchMemories.map(m => m.graduationYear || (m.takenAt ? new Date(m.takenAt).getFullYear() : null)).filter(Boolean))).sort((a, b) => b - a);

    // Filter memories
    let filteredMemories = [...batchMemories];
    if (memoryEventFilter !== 'all') {
      filteredMemories = filteredMemories.filter(m => m.eventId === memoryEventFilter);
    }
    if (memoryYearFilter !== 'all') {
      filteredMemories = filteredMemories.filter(m => (m.graduationYear == memoryYearFilter) || (m.takenAt && new Date(m.takenAt).getFullYear() == memoryYearFilter));
    }

    const pendingReportsCount = memoryReports.filter(r => r.status === 'pending').length;

    return `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Memories Sub-Navigation Bar & Action Bar -->
        <div class="glass-card" style="padding: 16px 20px; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          
          <!-- Sub-Tab Pills -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm memory-subtab-btn ${memorySubTab === 'all' ? 'btn-primary' : 'btn-outline'}" data-subtab="all">
              <span>🖼️</span> All Photos (${batchMemories.length})
            </button>
            <button type="button" class="btn btn-sm memory-subtab-btn ${memorySubTab === 'albums' ? 'btn-primary' : 'btn-outline'}" data-subtab="albums">
              <span>📁</span> Event Albums (${batchAlbums.length})
            </button>
            <button type="button" class="btn btn-sm memory-subtab-btn ${memorySubTab === 'timeline' ? 'btn-primary' : 'btn-outline'}" data-subtab="timeline">
              <span>⏳</span> Timeline (${memoryTimeline.length} Years)
            </button>
            ${currentRole === 'admin' ? `
              <button type="button" class="btn btn-sm memory-subtab-btn ${memorySubTab === 'moderation' ? 'btn-primary' : 'btn-outline'}" data-subtab="moderation" style="${pendingReportsCount > 0 ? 'border-color: #f43f5e; color: #fb7185;' : ''}">
                <span>🛡️</span> Moderation Queue ${pendingReportsCount > 0 ? `<span class="badge badge-danger" style="margin-left: 4px; padding: 1px 6px;">${pendingReportsCount}</span>` : ''}
              </button>
            ` : ''}
          </div>

          <!-- Controls: Filters & Upload -->
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            ${memorySubTab === 'all' ? `
              <select id="memory-filter-event" class="form-control" style="font-size: 13px; padding: 6px 12px; width: auto; max-width: 180px;">
                <option value="all">All Events</option>
                ${batchEvents.map(e => `<option value="${e.id}" ${memoryEventFilter === e.id ? 'selected' : ''}>${escapeHtml(e.title)}</option>`).join('')}
              </select>

              ${years.length > 0 ? `
                <select id="memory-filter-year" class="form-control" style="font-size: 13px; padding: 6px 12px; width: auto;">
                  <option value="all">All Years</option>
                  ${years.map(y => `<option value="${y}" ${memoryYearFilter == y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
              ` : ''}

              ${(memoryEventFilter !== 'all' || memoryYearFilter !== 'all') ? `
                <button type="button" id="btn-clear-memory-filter" class="btn btn-outline btn-sm" style="font-size: 12px; padding: 6px 10px;">
                  ✕ Clear Filter
                </button>
              ` : ''}
            ` : ''}

            ${canParticipate ? `
              <button type="button" id="btn-trigger-upload-memory" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px; font-weight: 600;">
                <span>📸</span> Upload Memory
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Sub-View Content -->
        ${memorySubTab === 'all' ? renderAllPhotosView(filteredMemories, canParticipate) : ''}
        ${memorySubTab === 'albums' ? renderAlbumsView(canParticipate) : ''}
        ${memorySubTab === 'timeline' ? renderTimelineView() : ''}
        ${memorySubTab === 'moderation' && currentRole === 'admin' ? renderModerationView() : ''}
      </div>
    `;
  };

  const renderAllPhotosView = (memoriesList, canParticipate) => {
    if (memoriesList.length === 0) {
      return `
        <div class="glass-card" style="padding: 60px 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.8;">📸</div>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
            ${(memoryEventFilter !== 'all' || memoryYearFilter !== 'all') ? 'No Photos Match Selected Filters' : 'No Memories Shared Yet'}
          </h3>
          <p style="font-size: 13.5px; color: var(--text-muted); max-width: 480px; margin: 0 auto 20px; line-height: 1.6;">
            ${(memoryEventFilter !== 'all' || memoryYearFilter !== 'all') ? 'Try clearing or changing your filters to see more photos from this batch.' : 'Capture and preserve college memories, convocation snapshots, reunions, and milestone moments with your verified classmates.'}
          </p>
          ${canParticipate && (memoryEventFilter === 'all' && memoryYearFilter === 'all') ? `
            <button type="button" class="btn btn-primary btn-trigger-upload" style="display: inline-flex; align-items: center; gap: 8px;">
              <span>📸</span> Upload First Memory
            </button>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="memories-masonry-grid">
        ${memoriesList.map(m => `
          <div class="memory-card" data-memory-id="${m.id}">
            <div class="memory-card-img-wrap btn-open-lightbox" role="button" tabindex="0" aria-label="Open memory: ${escapeHtml(m.caption || 'Batch Memory')}" data-memory-id="${m.id}">
              <img src="${m.thumbnailUrl || m.imageUrl}" alt="${escapeHtml(m.caption || 'Batch Memory')}" class="memory-card-image" loading="lazy" />
              
              <div class="memory-card-hover-overlay">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  ${m.eventTitle ? `
                    <span class="badge badge-purple" style="font-size: 11px;">🏷️ ${escapeHtml(m.eventTitle)}</span>
                  ` : '<div></div>'}
                  <span class="badge" style="background: rgba(0,0,0,0.65); color: #fff; font-size: 11px;">🔍 Expand</span>
                </div>

                <div>
                  ${m.caption ? `<div style="font-weight: 600; font-size: 13.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${escapeHtml(m.caption)}</div>` : ''}
                  <div style="font-size: 11.5px; opacity: 0.9; margin-top: 2px;">by ${escapeHtml(m.uploaderName)}</div>
                </div>
              </div>
            </div>

            <!-- Card Footer / Interaction Bar -->
            <div style="padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; border-top: var(--glass-border); background: var(--bg-card); font-size: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                <img src="${m.uploaderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(m.uploaderName || 'User')}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
                <span style="font-weight: 500; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;">${escapeHtml(m.uploaderName)}</span>
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" class="btn-like-memory" data-memory-id="${m.id}" title="Like Memory" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; color: ${m.hasLiked ? '#f43f5e' : 'var(--text-muted)'}; font-size: 13px; padding: 4px;">
                  <span>${m.hasLiked ? '❤️' : '🤍'}</span>
                  <span>${m.likesCount || 0}</span>
                </button>

                <button type="button" class="btn-open-lightbox" data-memory-id="${m.id}" title="View Comments" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 13px; padding: 4px;">
                  <span>💬</span>
                  <span>${m.commentsCount || 0}</span>
                </button>

                <button type="button" class="btn-report-memory" data-memory-id="${m.id}" title="Report Photo" style="background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 12px; padding: 4px;">
                  <span>🚩</span>
                </button>

                ${(m.uploaderId === currentUserId || currentRole === 'admin') ? `
                  <button type="button" class="btn-edit-memory" data-memory-id="${m.id}" title="Edit Caption" style="background: none; border: none; cursor: pointer; color: var(--text-dim); font-size: 12px; padding: 4px;">
                    <span>✏️</span>
                  </button>
                  <button type="button" class="btn-delete-memory" data-memory-id="${m.id}" title="Delete Photo" style="background: none; border: none; cursor: pointer; color: var(--color-danger); font-size: 12px; padding: 4px;">
                    <span>🗑️</span>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const renderAlbumsView = (canParticipate) => {
    if (batchAlbums.length === 0) {
      return `
        <div class="glass-card" style="padding: 60px 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.8;">📁</div>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">No Event Albums Created Yet</h3>
          <p style="font-size: 13.5px; color: var(--text-muted); max-width: 480px; margin: 0 auto; line-height: 1.6;">
            Event albums are automatically assembled when memories are tagged with batch reunions, webinars, or campus events.
          </p>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        ${batchAlbums.map(album => `
          <div class="memory-album-card">
            <div style="height: 180px; position: relative; background: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              ${album.coverImage ? `
                <img src="${album.coverImage}" alt="${escapeHtml(album.title)}" style="width: 100%; height: 100%; object-fit: cover;" />
              ` : `
                <div style="font-size: 44px; opacity: 0.6;">🎉</div>
              `}
              <div style="position: absolute; top: 12px; right: 12px;">
                <span class="badge badge-purple" style="backdrop-filter: blur(8px); background: rgba(168, 85, 247, 0.5);">
                  ${album.photosCount} Photos
                </span>
              </div>
              <div style="position: absolute; bottom: 10px; left: 14px;">
                <span class="badge" style="background: rgba(0,0,0,0.65); color: #fff; font-size: 11px;">
                  ${escapeHtml(album.eventType || 'Event')}
                </span>
              </div>
            </div>

            <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
              <h4 style="font-size: 16px; font-weight: 700; color: var(--text-heading); margin: 0;">${escapeHtml(album.title)}</h4>
              <div style="font-size: 12.5px; color: var(--text-dim);">
                📅 ${album.eventDate ? new Date(album.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA'}
                ${album.venue ? ` • 📍 ${escapeHtml(album.venue)}` : ''}
              </div>
              ${album.description ? `
                <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin: 0; flex: 1;">
                  ${escapeHtml(album.description)}
                </p>
              ` : '<div style="flex: 1;"></div>'}

              <button type="button" class="btn btn-outline btn-sm btn-view-album-memories" data-event-id="${album.id}" style="margin-top: 10px; width: 100%; justify-content: center;">
                View Album Photos (${album.photosCount}) →
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const renderTimelineView = () => {
    if (memoryTimeline.length === 0) {
      return `
        <div class="glass-card" style="padding: 60px 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.8;">⏳</div>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">Timeline is Empty</h3>
          <p style="font-size: 13.5px; color: var(--text-muted); max-width: 480px; margin: 0 auto; line-height: 1.6;">
            Share graduation or college memories with date details to build an interactive chronological timeline of this cohort.
          </p>
        </div>
      `;
    }

    return `
      <div class="memory-timeline-container">
        ${memoryTimeline.map(cluster => `
          <div class="memory-timeline-node">
            <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px;">
              <h3 style="font-size: 20px; font-weight: 800; color: var(--text-heading); margin: 0;">
                Year / Class of ${cluster.year}
              </h3>
              <span class="badge badge-cyan" style="font-size: 11px;">${cluster.count} ${cluster.count === 1 ? 'Memory' : 'Memories'}</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px;">
              ${cluster.memories.map(m => `
                <div class="memory-card btn-open-lightbox" data-memory-id="${m.id}" style="cursor: pointer; margin-bottom: 0;">
                  <img src="${m.thumbnailUrl || m.imageUrl}" alt="${escapeHtml(m.caption || '')}" style="width: 100%; height: 140px; object-fit: cover; display: block;" loading="lazy" />
                  <div style="padding: 8px 10px; font-size: 11.5px; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-heading); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px;">${escapeHtml(m.caption || 'Memory')}</span>
                    <span style="color: var(--text-dim);">❤️ ${m.likesCount || 0}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const renderModerationView = () => {
    return `
      <div class="glass-card" style="padding: 24px; background: var(--bg-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 750; color: var(--text-heading); margin-bottom: 4px;">
              🛡️ Batch Photo Moderation Queue
            </h3>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              Review flagged photos reported by community members across all cohorts.
            </p>
          </div>
          <span class="badge badge-violet">${memoryReports.length} Total Reports</span>
        </div>

        ${memoryReports.length === 0 ? `
          <div style="text-align: center; padding: 40px; color: var(--text-dim);">
            <div style="font-size: 32px; margin-bottom: 8px;">✨</div>
            <div>The photo moderation queue is clear. No reported memories to review.</div>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${memoryReports.map(r => `
              <div style="border: var(--glass-border); border-radius: var(--radius-md); padding: 16px; background: var(--bg-subtle); display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
                <div style="display: flex; gap: 16px; align-items: flex-start;">
                  ${r.memoryThumbnail ? `
                    <img src="${r.memoryThumbnail}" alt="Reported photo" style="width: 72px; height: 72px; object-fit: cover; border-radius: var(--radius-sm); border: var(--glass-border);" />
                  ` : ''}
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                      <span class="badge ${r.status === 'pending' ? 'badge-danger' : r.status === 'removed' ? 'badge-warning' : 'badge-emerald'}">${r.status.toUpperCase()}</span>
                      <span class="badge badge-purple">${escapeHtml(r.reason)}</span>
                      <span style="font-size: 12px; color: var(--text-dim);">${formatRelativeTime(r.createdAt)}</span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-heading); font-weight: 600; margin-bottom: 4px;">
                      Memory Caption: "${escapeHtml(r.memoryCaption || 'Untitled')}" (Uploaded by ${escapeHtml(r.memoryUploaderName)})
                    </div>
                    <div style="font-size: 12.5px; color: var(--text-muted);">
                      Reported by <strong>${escapeHtml(r.reporterName)}</strong>: "${escapeHtml(r.details || 'No additional details provided')}"
                    </div>
                    ${r.moderationNote ? `
                      <div style="font-size: 12px; color: #a5b4fc; margin-top: 4px;">
                        Moderator Note: ${escapeHtml(r.moderationNote)}
                      </div>
                    ` : ''}
                  </div>
                </div>

                ${r.status === 'pending' ? `
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn btn-outline btn-sm btn-dismiss-memory-report" data-report-id="${r.id}" style="color: var(--color-success); border-color: rgba(16, 185, 129, 0.4);">
                      ✓ Dismiss Report
                    </button>
                    <button type="button" class="btn btn-outline btn-sm btn-remove-memory-report" data-report-id="${r.id}" data-memory-id="${r.memoryId}" style="color: var(--color-danger); border-color: rgba(244, 63, 94, 0.4);">
                      ✕ Remove Photo
                    </button>
                  </div>
                ` : `
                  <span style="font-size: 12px; color: var(--text-dim); font-style: italic;">Moderated</span>
                `}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  };


  // =========================================================================
  // WORKSPACE EVENT ATTACHMENT
  // =========================================================================
  const attachWorkspaceEvents = () => {
    // Keyboard activation for custom interactive cards and rows.
    document.querySelectorAll('.btn-open-discussion-tab, .memory-card-img-wrap.btn-open-lightbox, .btn-vote-option').forEach(element => {
      if (element.dataset.keyboardActivationBound === 'true') return;
      element.dataset.keyboardActivationBound = 'true';
      element.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          element.click();
        }
      });
    });

    // Back to hub
    document.getElementById('btn-back-to-hub')?.addEventListener('click', () => {
      activeBatchId = null;
      activeBatch = null;
      setUrlQuery(null, null);
      renderMainDashboard();
    });

    // Join batch inside workspace
    document.getElementById('btn-workspace-join')?.addEventListener('click', async () => {
      if (!activeBatch) return;
      try {
        await api.joinBatch(activeBatch.id);
        showToast(`Joined ${activeBatch.name}!`, 'success');
        await refreshAllData();
      } catch (err) {
        showToast(err.message || 'Error joining batch', 'error');
      }
    });

    // Sub-Navigation Tabs
    document.querySelectorAll('.batch-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== activeTab) {
          activeTab = tab;
          setUrlQuery(activeBatchId, tab);
          renderBatchCommunityWorkspace();
        }
      });
    });

    // Switch tab buttons inside content
    document.querySelectorAll('.btn-switch-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) {
          activeTab = tab;
          setUrlQuery(activeBatchId, tab);
          renderBatchCommunityWorkspace();
        }
      });
    });

    // New Post Trigger
    document.querySelectorAll('.btn-trigger-new-post, #btn-workspace-new-post').forEach(btn => {
      btn.addEventListener('click', () => {
        openNewPostModal();
      });
    });

    // Open discussion tab from overview card
    document.querySelectorAll('.btn-open-discussion-tab').forEach(card => {
      card.addEventListener('click', () => {
        activeTab = 'discussions';
        setUrlQuery(activeBatchId, 'discussions');
        renderBatchCommunityWorkspace();
      });
    });

    // Members search & filters
    const searchInput = document.getElementById('member-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        memberSearch = e.target.value;
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderMembersTab();
        attachWorkspaceEvents();
      });
    }

    const roleFilter = document.getElementById('member-role-filter');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        memberRoleFilter = e.target.value;
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderMembersTab();
        attachWorkspaceEvents();
      });
    }

    const sortFilter = document.getElementById('member-sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        memberSort = e.target.value;
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderMembersTab();
        attachWorkspaceEvents();
      });
    }

    // Category filter in discussions
    document.querySelectorAll('.btn-filter-category').forEach(btn => {
      btn.addEventListener('click', () => {
        postCategoryFilter = btn.getAttribute('data-cat') || 'all';
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderDiscussionsTab(activeBatch.isMember || currentRole === 'admin');
        attachWorkspaceEvents();
      });
    });

    // Like Button
    document.querySelectorAll('.btn-like-post').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        if (!postId) return;
        try {
          const res = await api.toggleLikePost(postId);
          const data = res.data || {};
          const post = batchPosts.find(p => p.id === postId);
          if (post) {
            post.hasLiked = data.liked;
            post.likesCount = data.likesCount;
          }
          btn.classList.toggle('btn-like-active', data.liked);
          btn.querySelector('span:first-child').textContent = data.liked ? '❤️' : '🤍';
          btn.querySelector('.like-count').textContent = data.likesCount;
        } catch (e) {
          showToast('Failed to update reaction.', 'error');
        }
      });
    });

    // Comments Toggle
    document.querySelectorAll('.btn-toggle-comments').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        if (!postId) return;

        if (openCommentsPostIds.has(postId)) {
          openCommentsPostIds.delete(postId);
          renderBatchCommunityWorkspace();
        } else {
          openCommentsPostIds.add(postId);
          try {
            const res = await api.getPostComments(postId);
            commentsCache.set(postId, res.data || []);
          } catch (e) {
            commentsCache.set(postId, []);
          }
          renderBatchCommunityWorkspace();
        }
      });
    });

    // Submit Comment
    document.querySelectorAll('.btn-submit-comment').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        const input = document.querySelector(`.comment-input-field[data-post-id="${postId}"]`);
        if (!input) return;
        const content = input.value.trim();
        if (!content) return;

        try {
          btn.disabled = true;
          const res = await api.addComment(postId, content);
          input.value = '';
          const comments = commentsCache.get(postId) || [];
          comments.push(res.data);
          commentsCache.set(postId, comments);

          // Update count
          const post = batchPosts.find(p => p.id === postId);
          if (post) post.commentsCount = (post.commentsCount || 0) + 1;

          showToast('Comment posted!', 'success');
          renderBatchCommunityWorkspace();
        } catch (e) {
          showToast(e.message || 'Failed to post comment.', 'error');
          btn.disabled = false;
        }
      });
    });

    // Delete Comment
    document.querySelectorAll('.btn-delete-comment').forEach(btn => {
      btn.addEventListener('click', async () => {
        const commId = btn.getAttribute('data-comm-id');
        const postId = btn.getAttribute('data-post-id');
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
          await api.deleteComment(commId);
          const comments = commentsCache.get(postId) || [];
          commentsCache.set(postId, comments.filter(c => c.id !== commId));

          const post = batchPosts.find(p => p.id === postId);
          if (post && post.commentsCount > 0) post.commentsCount -= 1;

          showToast('Comment removed.', 'success');
          renderBatchCommunityWorkspace();
        } catch (e) {
          showToast(e.message || 'Failed to delete comment.', 'error');
        }
      });
    });

    // Edit Post
    document.querySelectorAll('.btn-edit-post').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.getAttribute('data-id');
        const post = batchPosts.find(p => p.id === postId);
        if (post) openEditPostModal(post);
      });
    });

    // Delete Post
    document.querySelectorAll('.btn-delete-post').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to delete this discussion post? All comments and likes will be removed.')) return;

        try {
          await api.deleteBatchPost(postId);
          batchPosts = batchPosts.filter(p => p.id !== postId);
          showToast('Discussion removed.', 'success');
          renderBatchCommunityWorkspace();
        } catch (e) {
          showToast(e.message || 'Failed to delete discussion.', 'error');
        }
      });
    });

    // Report Post
    document.querySelectorAll('.btn-report-post').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.getAttribute('data-id');
        openReportPostModal(postId);
      });
    });
  
    // =======================================================================
    // PHASE 2 EVENT LISTENERS: EVENTS, ANNOUNCEMENTS & POLLS
    // =======================================================================
    const isMember = activeBatch && (activeBatch.isMember || myBatches.some(m => m.id === activeBatch.id));
    const canParticipate = isMember || currentRole === 'admin';

    // Events filter
    document.querySelectorAll('.btn-filter-event').forEach(btn => {
      btn.addEventListener('click', () => {
        eventFilter = btn.getAttribute('data-status') || 'all';
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderEventsTab(canParticipate);
        attachWorkspaceEvents();
      });
    });

    // Schedule event button
    document.querySelectorAll('.btn-trigger-new-event').forEach(btn => {
      btn.addEventListener('click', () => {
        openNewEventModal();
      });
    });

    // RSVP buttons
    document.querySelectorAll('.btn-rsvp-event').forEach(btn => {
      btn.addEventListener('click', async () => {
        const eventId = btn.getAttribute('data-id');
        const status = btn.getAttribute('data-status');
        try {
          const res = await api.rsvpBatchEvent(eventId, status);
          showToast(`RSVP updated to ${status === 'going' ? 'Going' : status === 'interested' ? 'Interested' : 'Not Going'}!`, 'success');
          const idx = batchEvents.findIndex(e => e.id === eventId);
          if (idx !== -1) {
            batchEvents[idx].goingCount = res.data.goingCount;
            batchEvents[idx].interestedCount = res.data.interestedCount;
            batchEvents[idx].notGoingCount = res.data.notGoingCount;
            batchEvents[idx].currentUserRsvp = status;
          }
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderEventsTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to update RSVP.', 'error');
        }
      });
    });

    // View attendees
    document.querySelectorAll('.btn-view-attendees').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = btn.getAttribute('data-id');
        openAttendeesModal(eventId);
      });
    });

    // Edit event
    document.querySelectorAll('.btn-edit-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = btn.getAttribute('data-id');
        const ev = batchEvents.find(e => e.id === eventId);
        if (ev) openEditEventModal(ev);
      });
    });

    // Cancel event
    document.querySelectorAll('.btn-cancel-event').forEach(btn => {
      btn.addEventListener('click', async () => {
        const eventId = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to cancel this event?')) return;
        try {
          const res = await api.cancelBatchEvent(eventId);
          showToast('Event has been cancelled.', 'warning');
          const idx = batchEvents.findIndex(e => e.id === eventId);
          if (idx !== -1) batchEvents[idx] = res.data;
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderEventsTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to cancel event.', 'error');
        }
      });
    });

    // Delete event
    document.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', async () => {
        const eventId = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to permanently delete this event?')) return;
        try {
          await api.deleteBatchEvent(eventId);
          batchEvents = batchEvents.filter(e => e.id !== eventId);
          showToast('Event deleted.', 'success');
          renderBatchCommunityWorkspace();
        } catch (err) {
          showToast(err.message || 'Failed to delete event.', 'error');
        }
      });
    });

    // Post announcement button
    document.querySelectorAll('.btn-trigger-new-announcement').forEach(btn => {
      btn.addEventListener('click', () => {
        openNewAnnouncementModal();
      });
    });

    // Toggle Pin Announcement
    document.querySelectorAll('.btn-toggle-pin-announcement').forEach(btn => {
      btn.addEventListener('click', async () => {
        const annId = btn.getAttribute('data-id');
        try {
          const res = await api.togglePinAnnouncement(annId);
          const isPinned = res.data.isPinned;
          showToast(isPinned ? 'Announcement pinned to top!' : 'Announcement unpinned.', 'success');
          const idx = batchAnnouncements.findIndex(a => a.id === annId);
          if (idx !== -1) batchAnnouncements[idx].isPinned = isPinned;
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderAnnouncementsTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to update pin status.', 'error');
        }
      });
    });

    // Edit announcement
    document.querySelectorAll('.btn-edit-announcement').forEach(btn => {
      btn.addEventListener('click', () => {
        const annId = btn.getAttribute('data-id');
        const ann = batchAnnouncements.find(a => a.id === annId);
        if (ann) openEditAnnouncementModal(ann);
      });
    });

    // Delete announcement
    document.querySelectorAll('.btn-delete-announcement').forEach(btn => {
      btn.addEventListener('click', async () => {
        const annId = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        try {
          await api.deleteBatchAnnouncement(annId);
          batchAnnouncements = batchAnnouncements.filter(a => a.id !== annId);
          showToast('Announcement deleted.', 'success');
          renderBatchCommunityWorkspace();
        } catch (err) {
          showToast(err.message || 'Failed to delete announcement.', 'error');
        }
      });
    });

    // Polls filter
    document.querySelectorAll('.btn-filter-poll').forEach(btn => {
      btn.addEventListener('click', () => {
        pollFilter = btn.getAttribute('data-status') || 'all';
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderPollsTab(canParticipate);
        attachWorkspaceEvents();
      });
    });

    // Create poll button
    document.querySelectorAll('.btn-trigger-new-poll').forEach(btn => {
      btn.addEventListener('click', () => {
        openNewPollModal();
      });
    });

    // Vote on poll option
    document.querySelectorAll('.btn-vote-option').forEach(row => {
      row.addEventListener('click', async () => {
        const pollId = row.getAttribute('data-poll-id');
        const optId = row.getAttribute('data-opt-id');
        try {
          const res = await api.voteBatchPoll(pollId, optId);
          showToast('Vote recorded!', 'success');
          const idx = batchPolls.findIndex(p => p.id === pollId);
          if (idx !== -1) batchPolls[idx] = res.data;
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderPollsTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to record vote.', 'error');
        }
      });
    });

    // Close poll
    document.querySelectorAll('.btn-close-poll').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pollId = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to close this poll to further voting?')) return;
        try {
          const res = await api.closeBatchPoll(pollId);
          showToast('Poll has been closed.', 'warning');
          const idx = batchPolls.findIndex(p => p.id === pollId);
          if (idx !== -1) batchPolls[idx] = res.data;
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderPollsTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to close poll.', 'error');
        }
      });
    });

    // Delete poll
    document.querySelectorAll('.btn-delete-poll').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pollId = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to permanently delete this poll?')) return;
        try {
          await api.deleteBatchPoll(pollId);
          batchPolls = batchPolls.filter(p => p.id !== pollId);
          showToast('Poll deleted.', 'success');
          renderBatchCommunityWorkspace();
        } catch (err) {
          showToast(err.message || 'Failed to delete poll.', 'error');
        }
      });
    });

    // Phase 3: Memories Gallery Sub-Tabs
    document.querySelectorAll('.memory-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = btn.getAttribute('data-subtab');
        if (sub && sub !== memorySubTab) {
          memorySubTab = sub;
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderMemoriesTab(canParticipate);
          attachWorkspaceEvents();
        }
      });
    });

    // Phase 3: Memories Filters
    const memoryEventSelect = document.getElementById('memory-filter-event');
    if (memoryEventSelect) {
      memoryEventSelect.addEventListener('change', (e) => {
        memoryEventFilter = e.target.value;
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderMemoriesTab(canParticipate);
        attachWorkspaceEvents();
      });
    }

    const memoryYearSelect = document.getElementById('memory-filter-year');
    if (memoryYearSelect) {
      memoryYearSelect.addEventListener('change', (e) => {
        memoryYearFilter = e.target.value;
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderMemoriesTab(canParticipate);
        attachWorkspaceEvents();
      });
    }

    document.getElementById('btn-clear-memory-filter')?.addEventListener('click', () => {
      memoryEventFilter = 'all';
      memoryYearFilter = 'all';
      const container = document.getElementById('batch-tab-content');
      if (container) container.innerHTML = renderMemoriesTab(canParticipate);
      attachWorkspaceEvents();
    });

    // Phase 3: Trigger Upload Memory Modal
    document.querySelectorAll('#btn-trigger-upload-memory, .btn-trigger-upload, #btn-workspace-upload-memory').forEach(btn => {
      btn.addEventListener('click', () => {
        openUploadMemoryModal();
      });
    });

    // Phase 3: View Album Memories
    document.querySelectorAll('.btn-view-album-memories').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = btn.getAttribute('data-event-id');
        if (eventId) {
          memorySubTab = 'all';
          memoryEventFilter = eventId;
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderMemoriesTab(canParticipate);
          attachWorkspaceEvents();
        }
      });
    });

    // Phase 3: Open Lightbox
    document.querySelectorAll('.btn-open-lightbox').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const memoryId = el.getAttribute('data-memory-id');
        if (memoryId) {
          openMemoryLightbox(memoryId);
        }
      });
    });

    // Phase 3: Like Memory Toggle
    document.querySelectorAll('.btn-like-memory').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const memoryId = btn.getAttribute('data-memory-id');
        if (!memoryId) return;

        try {
          const res = await api.toggleLikeMemory(memoryId);
          const target = batchMemories.find(m => m.id === memoryId);
          if (target) {
            target.hasLiked = res.liked;
            target.likesCount = res.likesCount;
          }
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderMemoriesTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to update reaction.', 'error');
        }
      });
    });

    // Phase 3: Delete Memory
    document.querySelectorAll('.btn-delete-memory').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const memoryId = btn.getAttribute('data-memory-id');
        if (!memoryId) return;

        if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
          return;
        }

        try {
          await api.deleteBatchMemory(memoryId);
          batchMemories = batchMemories.filter(m => m.id !== memoryId);
          const [albRes, timeRes] = await Promise.all([
            api.getBatchAlbums(activeBatch.id).catch(() => ({ data: [] })),
            api.getMemoryTimeline(activeBatch.id).catch(() => ({ data: [] }))
          ]);
          batchAlbums = albRes.data || [];
          memoryTimeline = timeRes.data || [];

          showToast('Memory deleted successfully.', 'success');
          renderBatchCommunityWorkspace();
        } catch (err) {
          showToast(err.message || 'Failed to delete memory.', 'error');
        }
      });
    });

    // Phase 3: Edit Caption
    document.querySelectorAll('.btn-edit-memory').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const memoryId = btn.getAttribute('data-memory-id');
        const memory = batchMemories.find(m => m.id === memoryId);
        if (memory) {
          openEditMemoryCaptionModal(memory);
        }
      });
    });

    // Phase 3: Report Memory
    document.querySelectorAll('.btn-report-memory').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const memoryId = btn.getAttribute('data-memory-id');
        if (memoryId) {
          openReportMemoryModal(memoryId);
        }
      });
    });

    // Phase 3: Admin Dismiss Report
    document.querySelectorAll('.btn-dismiss-memory-report').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reportId = btn.getAttribute('data-report-id');
        try {
          await api.moderateMemoryReport(reportId, 'dismiss', 'Dismissed by admin after review');
          showToast('Report dismissed successfully.', 'success');
          const repRes = await api.getMemoryReports();
          memoryReports = repRes.data || [];
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderMemoriesTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to moderate report.', 'error');
        }
      });
    });

    // Phase 3: Admin Remove Memory Report
    document.querySelectorAll('.btn-remove-memory-report').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reportId = btn.getAttribute('data-report-id');
        const memoryId = btn.getAttribute('data-memory-id');
        if (!confirm('Remove this photo and mark report as resolved?')) return;

        try {
          await api.moderateMemoryReport(reportId, 'remove', 'Removed due to community violation');
          batchMemories = batchMemories.filter(m => m.id !== memoryId);
          showToast('Photo removed and report resolved.', 'success');
          const repRes = await api.getMemoryReports();
          memoryReports = repRes.data || [];
          const container = document.getElementById('batch-tab-content');
          if (container) container.innerHTML = renderMemoriesTab(canParticipate);
          attachWorkspaceEvents();
        } catch (err) {
          showToast(err.message || 'Failed to remove photo.', 'error');
        }
      });
    });

  };


  // =========================================================================
  // MODALS: POST COMPOSER, EDIT & REPORT
  // =========================================================================

  const openNewPostModal = () => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="new-post-type">Discussion Category *</label>
          <select id="new-post-type" class="form-control">
            <option value="general">General Discussion</option>
            <option value="memories">College Memories & Nostalgia</option>
            <option value="questions">Questions & Professional Advice</option>
            <option value="career">Career Updates & Job Openings</option>
            <option value="activities">Batch Activities & Reunions</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="new-post-title">Discussion Title *</label>
          <input type="text" id="new-post-title" class="form-control" placeholder="e.g. Planning our first class reunion dinner" required maxlength="150" />
        </div>

        <div class="form-group">
          <label class="form-label" for="new-post-content">Message Content *</label>
          <textarea id="new-post-content" class="form-control" rows="5" placeholder="Share your memories, question, or announcement with your batch..." required></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Photo Attachment (Upload or Link)</label>
          <div id="new-post-universal-uploader"></div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-post">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-publish-post">Publish Discussion</button>
    `;

    const { close } = openModal({
      title: `Start Discussion in ${activeBatch.name}`,
      contentHtml,
      footerHtml
    });

    const postUploader = createUniversalFileUploader({
      container: document.getElementById('new-post-universal-uploader'),
      category: 'discussions',
      accept: 'image/jpeg,image/png,image/webp,image/gif',
      multiple: false
    });

    document.getElementById('btn-cancel-post')?.addEventListener('click', close);
    document.getElementById('btn-publish-post')?.addEventListener('click', async () => {
      const title = document.getElementById('new-post-title').value.trim();
      const content = document.getElementById('new-post-content').value.trim();
      const postType = document.getElementById('new-post-type').value;
      const uVal = postUploader ? postUploader.getValue() : {};
      const imageUrl = uVal.fileUrl || null;

      if (!title || title.length < 3) {
        showToast('Please enter a descriptive title (at least 3 characters).', 'error');
        return;
      }
      if (!content || content.length < 5) {
        showToast('Please enter message content (at least 5 characters).', 'error');
        return;
      }

      try {
        const res = await api.createBatchPost(activeBatch.id, {
          title,
          content,
          postType,
          imageUrl: imageUrl || null
        });

        showToast('Discussion published to batch!', 'success');
        close();
        batchPosts.unshift(res.data);
        activeTab = 'discussions';
        renderBatchCommunityWorkspace();
      } catch (e) {
        showToast(e.message || 'Failed to publish discussion.', 'error');
      }
    });
  };

  const openEditPostModal = (post) => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="edit-post-type">Discussion Category *</label>
          <select id="edit-post-type" class="form-control">
            <option value="general" ${post.postType === 'general' ? 'selected' : ''}>General Discussion</option>
            <option value="memories" ${post.postType === 'memories' ? 'selected' : ''}>College Memories & Nostalgia</option>
            <option value="questions" ${post.postType === 'questions' ? 'selected' : ''}>Questions & Professional Advice</option>
            <option value="career" ${post.postType === 'career' ? 'selected' : ''}>Career Updates & Job Openings</option>
            <option value="activities" ${post.postType === 'activities' ? 'selected' : ''}>Batch Activities & Reunions</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-post-title">Discussion Title *</label>
          <input type="text" id="edit-post-title" class="form-control" value="${escapeHtml(post.title)}" required maxlength="150" />
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-post-content">Message Content *</label>
          <textarea id="edit-post-content" class="form-control" rows="5" required>${escapeHtml(post.content)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Photo Attachment (Upload or Link)</label>
          <div id="edit-post-universal-uploader"></div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-edit-post">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-edit-post">Save Changes</button>
    `;

    const { close } = openModal({
      title: 'Edit Discussion Post',
      contentHtml,
      footerHtml
    });

    const editPostUploader = createUniversalFileUploader({
      container: document.getElementById('edit-post-universal-uploader'),
      category: 'discussions',
      accept: 'image/jpeg,image/png,image/webp,image/gif',
      initialUrl: post.imageUrl || '',
      multiple: false
    });

    document.getElementById('btn-cancel-edit-post')?.addEventListener('click', close);
    document.getElementById('btn-save-edit-post')?.addEventListener('click', async () => {
      const title = document.getElementById('edit-post-title').value.trim();
      const content = document.getElementById('edit-post-content').value.trim();
      const postType = document.getElementById('edit-post-type').value;
      const uVal = editPostUploader ? editPostUploader.getValue() : {};
      const imageUrl = uVal.fileUrl || null;

      if (!title || title.length < 3) {
        showToast('Please enter a descriptive title.', 'error');
        return;
      }
      if (!content || content.length < 5) {
        showToast('Please enter message content.', 'error');
        return;
      }

      try {
        const res = await api.updateBatchPost(post.id, {
          title,
          content,
          postType,
          imageUrl: imageUrl || null
        });

        showToast('Discussion updated!', 'success');
        close();
        const idx = batchPosts.findIndex(p => p.id === post.id);
        if (idx !== -1) batchPosts[idx] = res.data;
        renderBatchCommunityWorkspace();
      } catch (e) {
        showToast(e.message || 'Failed to update discussion.', 'error');
      }
    });
  };

  const openReportPostModal = (postId) => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <p style="font-size: 13.5px; color: var(--text-muted); margin: 0;">
          Reports are sent confidentially to university platform administrators for moderation review.
        </p>

        <div class="form-group">
          <label class="form-label" for="report-reason">Reason for Reporting *</label>
          <select id="report-reason" class="form-control">
            <option value="Inappropriate Content">Inappropriate Content or Language</option>
            <option value="Harassment">Harassment or Bullying</option>
            <option value="Spam or Promotion">Spam or Irrelevant Promotion</option>
            <option value="Misinformation">Misleading Academic Information</option>
            <option value="Other">Other Community Guidelines Violation</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="report-details">Additional Details (Optional)</label>
          <textarea id="report-details" class="form-control" rows="3" placeholder="Explain why this content violates guidelines..."></textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-report">Cancel</button>
      <button type="button" class="btn btn-danger" id="btn-submit-report" style="background: var(--color-danger); color: #fff;">Submit Report</button>
    `;

    const { close } = openModal({
      title: 'Report Inappropriate Discussion',
      contentHtml,
      footerHtml
    });

    document.getElementById('btn-cancel-report')?.addEventListener('click', close);
    document.getElementById('btn-submit-report')?.addEventListener('click', async () => {
      const reason = document.getElementById('report-reason').value;
      const details = document.getElementById('report-details').value.trim();

      try {
        await api.reportBatchPost(postId, reason, details);
        showToast('Report submitted for administrative review.', 'success');
        close();
      } catch (e) {
        showToast(e.message || 'Failed to submit report.', 'error');
      }
    });
  };

  
  // =========================================================================
  // PHASE 2 MODALS: EVENTS, ANNOUNCEMENTS & POLLS
  // =========================================================================

  const openNewEventModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="new-event-title">Event Title *</label>
          <input type="text" id="new-event-title" class="form-control" placeholder="e.g. 5-Year Milestone Reunion Dinner" required maxlength="150" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="new-event-date">Date *</label>
            <input type="date" id="new-event-date" class="form-control" min="${today}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-event-time">Start Time (Optional)</label>
            <input type="time" id="new-event-time" class="form-control" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="new-event-type">Event Category *</label>
            <select id="new-event-type" class="form-control">
              <option value="reunion">Official Reunion</option>
              <option value="meetup">Casual Meetup</option>
              <option value="webinar">Webinar / Tech Talk</option>
              <option value="social">Social & Networking</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="new-event-venue">Venue or Meeting Link *</label>
            <input type="text" id="new-event-venue" class="form-control" placeholder="e.g. Campus Amphitheater / Google Meet" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="new-event-desc">Event Description *</label>
          <textarea id="new-event-desc" class="form-control" rows="4" placeholder="Share agenda, dress code, RSVP deadlines, or speaker details..." required></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Event Cover Image (Upload or Link)</label>
          <div id="new-event-universal-uploader"></div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-create-event">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-create-event">Schedule Event</button>
    `;

    const { close } = openModal({
      title: `Schedule Event in ${activeBatch.name}`,
      contentHtml,
      footerHtml
    });

    const eventUploader = createUniversalFileUploader({
      container: document.getElementById('new-event-universal-uploader'),
      category: 'events',
      accept: 'image/jpeg,image/png,image/webp',
      multiple: false
    });

    document.getElementById('btn-cancel-create-event')?.addEventListener('click', close);
    document.getElementById('btn-save-create-event')?.addEventListener('click', async () => {
      const title = document.getElementById('new-event-title').value.trim();
      const date = document.getElementById('new-event-date').value;
      const startTime = document.getElementById('new-event-time').value.trim();
      const eventType = document.getElementById('new-event-type').value;
      const venue = document.getElementById('new-event-venue').value.trim();
      const description = document.getElementById('new-event-desc').value.trim();
      const uVal = eventUploader ? eventUploader.getValue() : {};
      const coverImage = uVal.fileUrl || null;

      if (!title || title.length < 3) {
        showToast('Please enter an event title (at least 3 characters).', 'error');
        return;
      }
      if (!date) {
        showToast('Please select an event date.', 'error');
        return;
      }
      if (!venue) {
        showToast('Please provide an event venue or virtual link.', 'error');
        return;
      }
      if (!description || description.length < 5) {
        showToast('Please describe the event (at least 5 characters).', 'error');
        return;
      }

      try {
        const res = await api.createBatchEvent(activeBatch.id, {
          title,
          date,
          startTime: startTime || null,
          eventType,
          venue,
          description,
          coverImage: coverImage || null
        });

        showToast('Event scheduled successfully!', 'success');
        close();
        batchEvents.unshift(res.data);
        activeTab = 'events';
        renderBatchCommunityWorkspace();
      } catch (err) {
        showToast(err.message || 'Failed to schedule event.', 'error');
      }
    });
  };

  const openEditEventModal = (event) => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="edit-event-title">Event Title *</label>
          <input type="text" id="edit-event-title" class="form-control" value="${escapeHtml(event.title)}" required maxlength="150" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="edit-event-date">Date *</label>
            <input type="date" id="edit-event-date" class="form-control" value="${escapeHtml(event.date)}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-event-time">Start Time (Optional)</label>
            <input type="time" id="edit-event-time" class="form-control" value="${escapeHtml(event.startTime || '')}" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="edit-event-type">Event Category *</label>
            <select id="edit-event-type" class="form-control">
              <option value="reunion" ${event.eventType === 'reunion' ? 'selected' : ''}>Official Reunion</option>
              <option value="meetup" ${event.eventType === 'meetup' ? 'selected' : ''}>Casual Meetup</option>
              <option value="webinar" ${event.eventType === 'webinar' ? 'selected' : ''}>Webinar / Tech Talk</option>
              <option value="social" ${event.eventType === 'social' ? 'selected' : ''}>Social & Networking</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-event-venue">Venue or Meeting Link *</label>
            <input type="text" id="edit-event-venue" class="form-control" value="${escapeHtml(event.venue)}" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-event-desc">Event Description *</label>
          <textarea id="edit-event-desc" class="form-control" rows="4" required>${escapeHtml(event.description)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Event Cover Image (Upload or Link)</label>
          <div id="edit-event-universal-uploader"></div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-edit-event">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-edit-event">Save Changes</button>
    `;

    const { close } = openModal({
      title: 'Edit Event Details',
      contentHtml,
      footerHtml
    });

    document.getElementById('btn-cancel-edit-event')?.addEventListener('click', close);
    document.getElementById('btn-save-edit-event')?.addEventListener('click', async () => {
      const title = document.getElementById('edit-event-title').value.trim();
      const date = document.getElementById('edit-event-date').value;
      const startTime = document.getElementById('edit-event-time').value.trim();
      const eventType = document.getElementById('edit-event-type').value;
      const venue = document.getElementById('edit-event-venue').value.trim();
      const description = document.getElementById('edit-event-desc').value.trim();
      const uVal = editEvtUploader ? editEvtUploader.getValue() : {};
      const coverImage = uVal.fileUrl || null;

      if (!title || title.length < 3) {
        showToast('Please enter an event title.', 'error');
        return;
      }
      if (!date || !venue || !description) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      try {
        const res = await api.updateBatchEvent(event.id, {
          title,
          date,
          startTime: startTime || null,
          eventType,
          venue,
          description,
          coverImage: coverImage || null
        });

        showToast('Event updated!', 'success');
        close();
        const idx = batchEvents.findIndex(e => e.id === event.id);
        if (idx !== -1) batchEvents[idx] = res.data;
        renderBatchCommunityWorkspace();
      } catch (err) {
        showToast(err.message || 'Failed to update event.', 'error');
      }
    });
  };

  const openAttendeesModal = async (eventId) => {
    try {
      const res = await api.getEventAttendees(eventId);
      const attendees = res.data || [];

      const going = attendees.filter(a => a.status === 'going');
      const interested = attendees.filter(a => a.status === 'interested');
      const notGoing = attendees.filter(a => a.status === 'not_going');

      const contentHtml = `
        <div style="display: flex; flex-direction: column; gap: 18px; max-height: 480px; overflow-y: auto;">
          <div style="display: flex; gap: 12px; border-bottom: var(--glass-border); padding-bottom: 12px; flex-wrap: wrap;">
            <span class="badge badge-emerald">✓ Going (${going.length})</span>
            <span class="badge badge-warning">⭐ Interested (${interested.length})</span>
            <span class="badge" style="background: rgba(244,63,94,0.18); color: #fb7185;">✕ Not Going (${notGoing.length})</span>
          </div>

          ${attendees.length === 0 ? `
            <div style="text-align: center; padding: 30px; color: var(--text-dim);">
              No RSVPs recorded yet for this event.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${attendees.map(a => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: var(--radius-md); background: var(--bg-subtle); border: var(--glass-border);">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #00f0ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: 700;">
                      ${(a.userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style="font-size: 14px; font-weight: 600; color: var(--text-heading);">${escapeHtml(a.userName)}</div>
                      <span class="user-role-badge role-${a.userRole || 'student'}" style="font-size: 10.5px;">${a.userRole}</span>
                    </div>
                  </div>
                  <div>
                    ${a.status === 'going' ? '<span class="badge badge-emerald">Going</span>' : ''}
                    ${a.status === 'interested' ? '<span class="badge badge-warning">Interested</span>' : ''}
                    ${a.status === 'not_going' ? '<span class="badge" style="background: rgba(244,63,94,0.18); color: #fb7185;">Not Going</span>' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      const { close } = openModal({
        title: 'Event Attendees & RSVPs',
        contentHtml,
        footerHtml: '<button type="button" class="btn btn-primary" id="btn-close-attendees">Done</button>'
      });

      document.getElementById('btn-close-attendees')?.addEventListener('click', close);
    } catch (err) {
      showToast('Could not load attendee roster.', 'error');
    }
  };

  const openNewAnnouncementModal = () => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="new-ann-title">Announcement Title *</label>
          <input type="text" id="new-ann-title" class="form-control" placeholder="e.g. Mandatory Departmental Briefing on Convocation Regalia" required maxlength="150" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="new-ann-priority">Priority Level *</label>
            <select id="new-ann-priority" class="form-control">
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Announcement</option>
              <option value="low">Low Priority / Informational</option>
            </select>
          </div>
          <div class="form-group" style="display: flex; align-items: center; margin-top: 26px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-heading); font-size: 13.5px;">
              <input type="checkbox" id="new-ann-pin" style="width: 18px; height: 18px; cursor: pointer;" />
              <span>📌 Pin Announcement to Top</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="new-ann-content">Notice Content *</label>
          <textarea id="new-ann-content" class="form-control" rows="6" placeholder="Provide full details. A system notification will be automatically delivered to all verified batch members..." required></textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-ann">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-publish-ann">Publish Notice</button>
    `;

    const { close } = openModal({
      title: `Publish Cohort Announcement in ${activeBatch.name}`,
      contentHtml,
      footerHtml
    });

    document.getElementById('btn-cancel-ann')?.addEventListener('click', close);
    document.getElementById('btn-publish-ann')?.addEventListener('click', async () => {
      const title = document.getElementById('new-ann-title').value.trim();
      const content = document.getElementById('new-ann-content').value.trim();
      const priority = document.getElementById('new-ann-priority').value;
      const isPinned = document.getElementById('new-ann-pin').checked;

      if (!title || title.length < 3) {
        showToast('Please enter an announcement title.', 'error');
        return;
      }
      if (!content || content.length < 5) {
        showToast('Please enter notice content.', 'error');
        return;
      }

      try {
        const res = await api.createBatchAnnouncement(activeBatch.id, {
          title,
          content,
          priority,
          isPinned
        });

        showToast('Announcement published and members notified!', 'success');
        close();
        batchAnnouncements.unshift(res.data);
        activeTab = 'announcements';
        renderBatchCommunityWorkspace();
      } catch (err) {
        showToast(err.message || 'Failed to publish announcement.', 'error');
      }
    });
  };

  const openEditAnnouncementModal = (ann) => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="edit-ann-title">Announcement Title *</label>
          <input type="text" id="edit-ann-title" class="form-control" value="${escapeHtml(ann.title)}" required maxlength="150" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="edit-ann-priority">Priority Level *</label>
            <select id="edit-ann-priority" class="form-control">
              <option value="normal" ${ann.priority === 'normal' ? 'selected' : ''}>Normal Priority</option>
              <option value="high" ${ann.priority === 'high' ? 'selected' : ''}>High Priority</option>
              <option value="urgent" ${ann.priority === 'urgent' ? 'selected' : ''}>Urgent Announcement</option>
              <option value="low" ${ann.priority === 'low' ? 'selected' : ''}>Low Priority / Informational</option>
            </select>
          </div>
          <div class="form-group" style="display: flex; align-items: center; margin-top: 26px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-heading); font-size: 13.5px;">
              <input type="checkbox" id="edit-ann-pin" ${ann.isPinned ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" />
              <span>📌 Pin Announcement to Top</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-ann-content">Notice Content *</label>
          <textarea id="edit-ann-content" class="form-control" rows="6" required>${escapeHtml(ann.content)}</textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-edit-ann">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-edit-ann">Save Changes</button>
    `;

    const { close } = openModal({
      title: 'Edit Announcement',
      contentHtml,
      footerHtml
    });

    document.getElementById('btn-cancel-edit-ann')?.addEventListener('click', close);
    document.getElementById('btn-save-edit-ann')?.addEventListener('click', async () => {
      const title = document.getElementById('edit-ann-title').value.trim();
      const content = document.getElementById('edit-ann-content').value.trim();
      const priority = document.getElementById('edit-ann-priority').value;
      const isPinned = document.getElementById('edit-ann-pin').checked;

      if (!title || !content) {
        showToast('Title and content are required.', 'error');
        return;
      }

      try {
        const res = await api.updateBatchAnnouncement(ann.id, {
          title,
          content,
          priority,
          isPinned
        });

        showToast('Announcement updated!', 'success');
        close();
        const idx = batchAnnouncements.findIndex(a => a.id === ann.id);
        if (idx !== -1) batchAnnouncements[idx] = res.data;
        renderBatchCommunityWorkspace();
      } catch (err) {
        showToast(err.message || 'Failed to update announcement.', 'error');
      }
    });
  };

  const openNewPollModal = () => {
    let options = ['', ''];

    const renderOptionInputs = () => {
      const container = document.getElementById('poll-options-container');
      if (!container) return;
      container.innerHTML = options.map((opt, idx) => `
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
          <input type="text" class="form-control poll-opt-input" data-index="${idx}" value="${escapeHtml(opt)}" placeholder="Option ${idx + 1}" required maxlength="120" />
          ${options.length > 2 ? `
            <button type="button" class="btn btn-outline btn-sm btn-remove-opt" data-index="${idx}" style="color: var(--color-danger); padding: 6px 10px;">✕</button>
          ` : ''}
        </div>
      `).join('');

      // Attach handlers
      container.querySelectorAll('.poll-opt-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const idx = parseInt(e.target.getAttribute('data-index'), 10);
          options[idx] = e.target.value;
        });
      });

      container.querySelectorAll('.btn-remove-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          options.splice(idx, 1);
          renderOptionInputs();
        });
      });
    };

    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="new-poll-question">Poll Question *</label>
          <input type="text" id="new-poll-question" class="form-control" placeholder="e.g. Which city should host our 5th year alumni meet?" required maxlength="200" />
        </div>

        <div class="form-group">
          <label class="form-label">Poll Options (At least 2 required) *</label>
          <div id="poll-options-container"></div>
          <button type="button" class="btn btn-outline btn-sm" id="btn-add-poll-option" style="margin-top: 4px; font-size: 12.5px;">
            + Add Another Option
          </button>
        </div>

        <div class="form-group">
          <label class="form-label" for="new-poll-closing">Closing Date (Optional)</label>
          <input type="date" id="new-poll-closing" class="form-control" />
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-poll">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-create-poll">Create Poll</button>
    `;

    const { close } = openModal({
      title: `Create Poll in ${activeBatch.name}`,
      contentHtml,
      footerHtml
    });

    renderOptionInputs();

    document.getElementById('btn-add-poll-option')?.addEventListener('click', () => {
      if (options.length >= 8) {
        showToast('Maximum 8 options allowed.', 'warning');
        return;
      }
      options.push('');
      renderOptionInputs();
    });

    document.getElementById('btn-cancel-poll')?.addEventListener('click', close);
    document.getElementById('btn-create-poll')?.addEventListener('click', async () => {
      const question = document.getElementById('new-poll-question').value.trim();
      const closingDate = document.getElementById('new-poll-closing').value;

      const currentOpts = Array.from(document.querySelectorAll('.poll-opt-input'))
        .map(input => input.value.trim())
        .filter(val => val.length > 0);

      if (!question || question.length < 5) {
        showToast('Please enter a descriptive question (at least 5 characters).', 'error');
        return;
      }
      if (currentOpts.length < 2) {
        showToast('A poll must have at least 2 non-empty options.', 'error');
        return;
      }

      try {
        const res = await api.createBatchPoll(activeBatch.id, {
          question,
          options: currentOpts,
          closingDate: closingDate || null
        });

        showToast('Poll created successfully!', 'success');
        close();
        batchPolls.unshift(res.data);
        activeTab = 'polls';
        renderBatchCommunityWorkspace();
      } catch (err) {
        showToast(err.message || 'Failed to create poll.', 'error');
      }
    });
  };



  // =========================================================================
  // PHASE 3 MODALS & LIGHTBOX PHOTO VIEWER
  // =========================================================================

  const openUploadMemoryModal = () => {
    let selectedFiles = [];

    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Dropzone -->
        <div id="memory-dropzone" role="button" tabindex="0" aria-label="Choose photos to upload" aria-describedby="memory-dropzone-help" style="border: 2px dashed rgba(99, 102, 241, 0.4); border-radius: var(--radius-lg); padding: 28px 16px; text-align: center; background: rgba(99, 102, 241, 0.04); cursor: pointer; transition: all 0.2s;">
          <input type="file" id="memory-file-input" multiple accept="image/jpeg,image/png,image/webp" style="display: none;" />
          <div style="font-size: 38px; margin-bottom: 8px;">📷</div>
          <div style="font-size: 14.5px; font-weight: 600; color: var(--text-heading); margin-bottom: 4px;">
            Choose photos or drag & drop here
          </div>
          <p id="memory-dropzone-help" style="font-size: 12.5px; color: var(--text-muted); margin: 0;">
            JPG, PNG, WebP up to 10MB each. High resolution supported.
          </p>
        </div>

        <!-- Selected Previews Container -->
        <div id="memory-previews-container" style="display: flex; gap: 10px; flex-wrap: wrap; max-height: 140px; overflow-y: auto;"></div>

        <!-- Caption -->
        <div class="form-group">
          <label class="form-label" for="memory-caption-input">Caption / Title</label>
          <input type="text" id="memory-caption-input" class="form-control" placeholder="e.g. Graduation Day with our Profs!" maxlength="250" />
        </div>

        <!-- Description -->
        <div class="form-group">
          <label class="form-label" for="memory-desc-input">Story / Description (Optional)</label>
          <textarea id="memory-desc-input" class="form-control" rows="2" placeholder="Share the background story, location, or funny memory..."></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <!-- Associated Event -->
          <div class="form-group">
            <label class="form-label" for="memory-event-select">Tag Event (Optional)</label>
            <select id="memory-event-select" class="form-control">
              <option value="">None (General Batch Memory)</option>
              ${batchEvents.map(e => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('')}
            </select>
          </div>

          <!-- Date Taken -->
          <div class="form-group">
            <label class="form-label" for="memory-date-taken">Date Taken (Optional)</label>
            <input type="date" id="memory-date-taken" class="form-control" />
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-upload-memory">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-submit-upload-memory" style="display: flex; align-items: center; gap: 8px;">
        <span>📸</span> Upload Photo(s)
      </button>
    `;

    const { close } = openModal({
      title: `Upload Memories to ${activeBatch.name}`,
      contentHtml,
      footerHtml
    });

    const dropzone = document.getElementById('memory-dropzone');
    const fileInput = document.getElementById('memory-file-input');
    const previewsContainer = document.getElementById('memory-previews-container');

    const updatePreviews = () => {
      previewsContainer.innerHTML = selectedFiles.map((file, idx) => `
        <div style="position: relative; width: 68px; height: 68px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #000;">
          <img src="${URL.createObjectURL(file)}" style="width: 100%; height: 100%; object-fit: cover;" />
          <button type="button" class="btn-remove-selected-file" data-index="${idx}" style="position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.7); color: #fff; border: none; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>
      `).join('');

      previewsContainer.querySelectorAll('.btn-remove-selected-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          selectedFiles.splice(idx, 1);
          updatePreviews();
        });
      });
    };

    dropzone.addEventListener('click', (event) => {
      if (event.target !== fileInput) fileInput.click();
    });
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
      }
    });
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#6366f1';
      dropzone.style.background = 'rgba(99, 102, 241, 0.1)';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      dropzone.style.background = 'rgba(99, 102, 241, 0.04)';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      dropzone.style.background = 'rgba(99, 102, 241, 0.04)';
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) {
        showToast('Please select valid image files (JPG, PNG, WebP).', 'warning');
        return;
      }
      selectedFiles.push(...files);
      updatePreviews();
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      selectedFiles.push(...files);
      updatePreviews();
    });

    document.getElementById('btn-cancel-upload-memory')?.addEventListener('click', close);
    document.getElementById('btn-submit-upload-memory')?.addEventListener('click', async () => {
      if (selectedFiles.length === 0) {
        showToast('Please select at least one photo to upload.', 'warning');
        return;
      }

      // Check sizes (10MB limit)
      const oversized = selectedFiles.some(f => f.size > 10 * 1024 * 1024);
      if (oversized) {
        showToast('One or more photos exceed the 10MB limit.', 'error');
        return;
      }

      const caption = document.getElementById('memory-caption-input').value.trim();
      const description = document.getElementById('memory-desc-input').value.trim();
      const eventId = document.getElementById('memory-event-select').value;
      const takenAt = document.getElementById('memory-date-taken').value;

      const submitBtn = document.getElementById('btn-submit-upload-memory');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳</span> Uploading...';

      try {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files[]', file);
        });
        if (caption) formData.append('caption', caption);
        if (description) formData.append('description', description);
        if (eventId) formData.append('eventId', eventId);
        if (takenAt) formData.append('takenAt', takenAt);

        const res = await api.uploadBatchMemories(activeBatch.id, formData);
        showToast(res.message || 'Photos uploaded successfully!', 'success');
        close();

        // Refresh batch data
        const [memRes, albRes, timeRes] = await Promise.all([
          api.getBatchMemories(activeBatch.id),
          api.getBatchAlbums(activeBatch.id),
          api.getMemoryTimeline(activeBatch.id)
        ]);
        batchMemories = memRes.data || [];
        batchAlbums = albRes.data || [];
        memoryTimeline = timeRes.data || [];

        activeTab = 'memories';
        renderBatchCommunityWorkspace();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>📸</span> Upload Photo(s)';
        showToast(err.message || 'Upload failed.', 'error');
      }
    });
  };

  const openMemoryLightbox = async (initialMemoryId) => {
    // Current filtered list for navigation
    let currentList = [...batchMemories];
    if (memoryEventFilter !== 'all') {
      currentList = currentList.filter(m => m.eventId === memoryEventFilter);
    }
    if (memoryYearFilter !== 'all') {
      currentList = currentList.filter(m => (m.graduationYear == memoryYearFilter) || (m.takenAt && new Date(m.takenAt).getFullYear() == memoryYearFilter));
    }
    if (currentList.length === 0) currentList = [...batchMemories];

    let currentIndex = currentList.findIndex(m => m.id === initialMemoryId);
    if (currentIndex === -1) currentIndex = 0;

    let overlay = document.getElementById('memory-lightbox-root');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'memory-lightbox-root';
      overlay.className = 'memory-lightbox-overlay';
      document.body.appendChild(overlay);
    }

    const closeLightbox = () => {
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    document.addEventListener('keydown', handleKeyDown);

    const navigate = (delta) => {
      currentIndex = (currentIndex + delta + currentList.length) % currentList.length;
      renderLightboxContent();
    };

    const renderLightboxContent = async () => {
      const memory = currentList[currentIndex];
      if (!memory) return;

      overlay.innerHTML = `
        <div class="memory-lightbox-container" id="active-lightbox-container">
          <!-- Media Canvas -->
          <div class="memory-lightbox-media">
            ${currentList.length > 1 ? `
              <button type="button" class="memory-lightbox-nav-btn memory-lightbox-nav-prev" id="btn-lightbox-prev" aria-label="Previous photo">‹</button>
              <button type="button" class="memory-lightbox-nav-btn memory-lightbox-nav-next" id="btn-lightbox-next" aria-label="Next photo">›</button>
            ` : ''}

            <img src="${memory.imageUrl}" alt="${escapeHtml(memory.caption || 'Batch Memory')}" class="memory-lightbox-image" />
            
            <div style="position: absolute; bottom: 12px; left: 16px; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: var(--radius-full); font-size: 11.5px; color: #fff;">
              ${currentIndex + 1} of ${currentList.length}
            </div>
          </div>

          <!-- Sidebar: Info, Interactions & Threaded Comments -->
          <div class="memory-lightbox-sidebar">
            <!-- Sidebar Header -->
            <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${memory.uploaderAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(memory.uploaderName || 'User')}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.2);" />
                <div>
                  <div style="font-weight: 700; font-size: 14px; color: var(--text-heading);">${escapeHtml(memory.uploaderName)}</div>
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-dim);">
                    <span class="user-role-badge role-${(memory.uploaderRole || 'student').toLowerCase()}" style="font-size: 10px; padding: 1px 6px;">${memory.uploaderRole}</span>
                    <span>•</span>
                    <span>${formatRelativeTime(memory.createdAt)}</span>
                  </div>
                </div>
              </div>

              <button type="button" id="btn-lightbox-close" style="background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; padding: 4px;" aria-label="Close">✕</button>
            </div>

            <!-- Memory Details -->
            <div style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.015);">
              ${memory.eventTitle ? `
                <div style="margin-bottom: 6px;">
                  <span class="badge badge-purple" style="font-size: 11px;">🏷️ ${escapeHtml(memory.eventTitle)}</span>
                </div>
              ` : ''}

              ${memory.caption ? `
                <div style="font-weight: 600; font-size: 14.5px; color: var(--text-heading); margin-bottom: 4px; line-height: 1.4;">
                  ${escapeHtml(memory.caption)}
                </div>
              ` : ''}

              ${memory.description ? `
                <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0 0 10px;">
                  ${escapeHtml(memory.description)}
                </p>
              ` : ''}

              <!-- Interaction Action Buttons -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <div style="display: flex; gap: 12px; align-items: center;">
                  <button type="button" id="btn-lightbox-like" class="btn btn-sm ${memory.hasLiked ? 'btn-danger' : 'btn-outline'}" style="display: flex; align-items: center; gap: 6px;">
                    <span>${memory.hasLiked ? '❤️' : '🤍'}</span>
                    <span>${memory.likesCount || 0}</span>
                  </button>

                  <a href="${memory.imageUrl}" target="_blank" download="batch-memory-${memory.id}.jpg" class="btn btn-outline btn-sm" title="Download High Res Photo" style="display: flex; align-items: center; gap: 6px;">
                    <span>⬇️</span> Download
                  </a>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <button type="button" id="btn-lightbox-report" class="btn btn-outline btn-sm" title="Report Inappropriate Content">
                    🚩
                  </button>
                  ${(memory.uploaderId === currentUserId || currentRole === 'admin') ? `
                    <button type="button" id="btn-lightbox-delete" class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: rgba(244, 63, 94, 0.4);" title="Delete Photo">
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Comments Section -->
            <div style="padding: 12px 20px 6px; font-size: 12.5px; font-weight: 700; color: var(--text-heading); text-transform: uppercase; letter-spacing: 0.5px;">
              Comments (${memory.commentsCount || 0})
            </div>

            <div class="memory-lightbox-comments-list" id="lightbox-comments-container">
              <div style="text-align: center; padding: 20px; color: var(--text-dim);">Loading comments...</div>
            </div>

            <!-- Add Comment Form -->
            <div style="padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08); background: var(--bg-card);">
              <form id="lightbox-comment-form" style="display: flex; gap: 8px;">
                <input type="text" id="lightbox-comment-input" class="form-control" placeholder="Add a memory comment..." maxlength="500" required style="font-size: 13px;" />
                <button type="submit" class="btn btn-primary btn-sm" style="padding: 0 16px;">Post</button>
              </form>
            </div>
          </div>
        </div>
      `;

      // Lightbox event attachments
      document.getElementById('btn-lightbox-close')?.addEventListener('click', closeLightbox);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeLightbox();
      });

      document.getElementById('btn-lightbox-prev')?.addEventListener('click', () => navigate(-1));
      document.getElementById('btn-lightbox-next')?.addEventListener('click', () => navigate(1));

      // Like in Lightbox
      document.getElementById('btn-lightbox-like')?.addEventListener('click', async () => {
        try {
          const res = await api.toggleLikeMemory(memory.id);
          memory.hasLiked = res.liked;
          memory.likesCount = res.likesCount;
          renderLightboxContent();
          // Also update parent card in batchMemories
          const parent = batchMemories.find(m => m.id === memory.id);
          if (parent) {
            parent.hasLiked = res.liked;
            parent.likesCount = res.likesCount;
          }
        } catch (err) {
          showToast(err.message || 'Failed to update reaction.', 'error');
        }
      });

      // Report in Lightbox
      document.getElementById('btn-lightbox-report')?.addEventListener('click', () => {
        openReportMemoryModal(memory.id);
      });

      // Delete in Lightbox
      document.getElementById('btn-lightbox-delete')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this memory photo?')) return;
        try {
          await api.deleteBatchMemory(memory.id);
          batchMemories = batchMemories.filter(m => m.id !== memory.id);
          closeLightbox();
          showToast('Memory photo deleted.', 'success');
          renderBatchCommunityWorkspace();
        } catch (err) {
          showToast(err.message || 'Failed to delete photo.', 'error');
        }
      });

      // Load & Render Comments
      const commentsContainer = document.getElementById('lightbox-comments-container');
      try {
        const commentsRes = await api.getMemoryComments(memory.id);
        const comments = commentsRes.data || [];
        memory.commentsCount = comments.length;

        if (comments.length === 0) {
          commentsContainer.innerHTML = `
            <div style="text-align: center; padding: 30px 10px; color: var(--text-dim); font-size: 13px;">
              No comments yet. Start the conversation!
            </div>
          `;
        } else {
          commentsContainer.innerHTML = comments.map(c => `
            <div style="display: flex; gap: 10px; align-items: flex-start; padding: 8px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.02);">
              <img src="${c.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(c.userName || 'User')}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
              <div style="flex: 1; overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-weight: 600; font-size: 12.5px; color: var(--text-heading);">${escapeHtml(c.userName)}</span>
                  <span style="font-size: 10.5px; color: var(--text-dim);">${formatRelativeTime(c.createdAt)}</span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.4; margin-top: 2px; word-break: break-word;">
                  ${escapeHtml(c.content)}
                </div>
              </div>
              ${(c.userId === currentUserId || currentRole === 'admin') ? `
                <button type="button" class="btn-delete-lightbox-comment" data-comment-id="${c.id}" style="background: none; border: none; color: var(--color-danger); cursor: pointer; font-size: 11px; padding: 2px;" title="Delete Comment">✕</button>
              ` : ''}
            </div>
          `).join('');

          // Comment deletion
          commentsContainer.querySelectorAll('.btn-delete-lightbox-comment').forEach(btn => {
            btn.addEventListener('click', async () => {
              const commentId = btn.getAttribute('data-comment-id');
              try {
                await api.deleteMemoryComment(commentId);
                showToast('Comment deleted.', 'success');
                renderLightboxContent();
              } catch (err) {
                showToast(err.message || 'Failed to delete comment.', 'error');
              }
            });
          });
        }
      } catch (err) {
        commentsContainer.innerHTML = `<div style="color: var(--color-danger); font-size: 12px; padding: 10px;">Failed to load comments.</div>`;
      }

      // Add comment form submit
      const commentForm = document.getElementById('lightbox-comment-form');
      const commentInput = document.getElementById('lightbox-comment-input');
      commentForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = commentInput.value.trim();
        if (!content) return;

        try {
          await api.addMemoryComment(memory.id, content);
          commentInput.value = '';
          memory.commentsCount = (memory.commentsCount || 0) + 1;
          renderLightboxContent();
        } catch (err) {
          showToast(err.message || 'Failed to post comment.', 'error');
        }
      });
    };

    renderLightboxContent();
  };

  const openReportMemoryModal = (memoryId) => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
          Please indicate why you are reporting this memory photo. Our community moderators will review it.
        </p>

        <div class="form-group">
          <label class="form-label" for="report-reason-select">Reason *</label>
          <select id="report-reason-select" class="form-control" required>
            <option value="Inappropriate Content">Inappropriate Content</option>
            <option value="Spam or Advertising">Spam or Advertising</option>
            <option value="Harassment or Hate Speech">Harassment or Hate Speech</option>
            <option value="Copyright Infringement">Copyright Infringement</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="report-details-input">Additional Details (Optional)</label>
          <textarea id="report-details-input" class="form-control" rows="3" placeholder="Provide extra context to help our administrators..."></textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-report-memory">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-submit-report-memory">Submit Report</button>
    `;

    const { close } = openModal({
      title: 'Report Memory Photo',
      contentHtml,
      footerHtml
    });

    document.getElementById('btn-cancel-report-memory')?.addEventListener('click', close);
    document.getElementById('btn-submit-report-memory')?.addEventListener('click', async () => {
      const reason = document.getElementById('report-reason-select').value;
      const details = document.getElementById('report-details-input').value.trim();

      try {
        await api.reportBatchMemory(memoryId, reason, details);
        showToast('Report submitted. Thank you for keeping our community safe.', 'success');
        close();
      } catch (err) {
        showToast(err.message || 'Failed to submit report.', 'error');
      }
    });
  };

  const openEditMemoryCaptionModal = (memory) => {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="edit-memory-caption">Caption</label>
          <input type="text" id="edit-memory-caption" class="form-control" value="${escapeHtml(memory.caption || '')}" maxlength="250" />
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-memory-desc">Description</label>
          <textarea id="edit-memory-desc" class="form-control" rows="3">${escapeHtml(memory.description || '')}</textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn btn-outline" id="btn-cancel-edit-caption">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-edit-caption">Save Changes</button>
    `;

    const { close } = openModal({
      title: 'Edit Memory Caption',
      contentHtml,
      footerHtml
    });

    document.getElementById('btn-cancel-edit-caption')?.addEventListener('click', close);
    document.getElementById('btn-save-edit-caption')?.addEventListener('click', async () => {
      const caption = document.getElementById('edit-memory-caption').value.trim();
      const description = document.getElementById('edit-memory-desc').value.trim();

      try {
        const res = await api.updateBatchMemory(memory.id, { caption, description });
        showToast('Memory updated successfully.', 'success');
        close();
        memory.caption = caption;
        memory.description = description;
        const container = document.getElementById('batch-tab-content');
        if (container) container.innerHTML = renderMemoriesTab(canParticipate);
        attachWorkspaceEvents();
      } catch (err) {
        showToast(err.message || 'Failed to update memory.', 'error');
      }
    });
  };


  // Helper: Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper: Relative time formatter
  function formatRelativeTime(dateStr) {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  }

  // Initialize
  await refreshAllData();
}
