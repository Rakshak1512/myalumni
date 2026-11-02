/**
 * Vanilla JavaScript SPA Router
 * Role-Based Route Guards, Session Restoration & Layout Shell
 */
import { authState } from './auth/authContext.js';
import { api } from './services/api.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/navbar.js';
import { showToast } from './components/toast.js';
import { handleNexusRouteChange } from './nexus/nexusTransitions.js';

// Page Renderers & Inits
import { renderLandingPage, initLandingPage } from './pages/landing.js';
import { renderLoginPage, initLoginPage } from './pages/login.js';
import { renderRegisterPage, initRegisterPage } from './pages/register.js';
import { renderForgotPasswordPage, initForgotPasswordPage } from './pages/forgotPassword.js';
import { renderDashboardPage, initDashboardPage } from './pages/dashboard.js';
import { renderDirectoryPage, initDirectoryPage } from './pages/directory.js';
import { renderChatPage, initChatPage } from './pages/chat.js';
import { renderOpportunitiesPage, initOpportunitiesPage } from './pages/opportunities.js';
import { renderEventsPage, initEventsPage } from './pages/events.js';
import { renderAchievementsPage, initAchievementsPage } from './pages/achievements.js';
import { renderBirthdaysPage, initBirthdaysPage } from './pages/birthdays.js';
import { renderBatchesPage, initBatchesPage } from './pages/batches.js';
import { renderResourcesPage, initResourcesPage } from './pages/resources.js';
import { renderCareerTrackerPage, initCareerTrackerPage } from './pages/careerTracker.js';
import { renderCareerGuidePage, initCareerGuidePage } from './pages/careerGuide.js';
import { renderNotificationsPage, initNotificationsPage } from './pages/notifications.js';
import { renderContactAdminPage, initContactAdminPage } from './pages/contactAdmin.js';
import { renderMentorshipPage, initMentorshipPage } from './pages/mentorship.js';
import { renderAdminConsolePage, initAdminConsolePage } from './pages/adminConsole.js';
import { renderModerationPage, initModerationPage } from './pages/moderation.js';
import { renderPromotionPage, initPromotionPage } from './pages/promotion.js';
import { renderSettingsPage, initSettingsPage } from './pages/settings.js';
import { renderUnauthorizedPage } from './pages/unauthorized.js';

const ROUTES = {
  '#/': { title: 'Welcome', render: renderLandingPage, init: initLandingPage, public: true },
  '#/login': { title: 'Sign In', render: renderLoginPage, init: initLoginPage, public: true },
  '#/register': { title: 'Join MyAlumni', render: renderRegisterPage, init: initRegisterPage, public: true },
  '#/forgot-password': { title: 'Reset Password', render: renderForgotPasswordPage, init: initForgotPasswordPage, public: true },

  '#/dashboard': { title: 'Dashboard', render: renderDashboardPage, init: initDashboardPage },
  '#/directory': { title: 'Alumni Directory', render: renderDirectoryPage, init: initDirectoryPage },
  '#/mentorship': { title: 'Mentorship', render: renderMentorshipPage, init: initMentorshipPage, roles: ['student', 'alumni'] },
  '#/messages': { title: 'Direct Messages', render: renderChatPage, init: initChatPage },
  '#/opportunities': { title: 'Opportunities', render: renderOpportunitiesPage, init: initOpportunitiesPage },
  '#/events': { title: 'Events & Reunions', render: renderEventsPage, init: initEventsPage },
  '#/achievements': { title: 'Achievements', render: renderAchievementsPage, init: initAchievementsPage },
  '#/birthdays': { title: 'Alumni Birthday & Celebration Hub', render: renderBirthdaysPage, init: initBirthdaysPage },
  '#/batches': { title: 'BatchVerse — Where Classmates Stay Connected', render: renderBatchesPage, init: initBatchesPage },
  '#/resources': { title: 'Resources & Notices', render: renderResourcesPage, init: initResourcesPage },
  '#/career-tracker': { title: 'Career Growth Tracker', render: renderCareerTrackerPage, init: initCareerTrackerPage, roles: ['student'] },
  '#/career-guide': { title: 'Rule-Based Career Guide', render: renderCareerGuidePage, init: initCareerGuidePage },
  '#/notifications': { title: 'Notifications', render: renderNotificationsPage, init: initNotificationsPage },
  '#/contact-admin': { title: 'Contact Support', render: renderContactAdminPage, init: initContactAdminPage },
  '#/settings': { title: 'Profile Settings', render: renderSettingsPage, init: initSettingsPage },

  // Staff & Admin
  '#/faculty/moderation': { title: 'Faculty Moderation', render: renderModerationPage, init: initModerationPage, roles: ['faculty', 'admin'] },
  '#/faculty/promotion': { title: 'Student Promotion', render: renderPromotionPage, init: initPromotionPage, roles: ['faculty', 'admin'] },
  '#/admin': { title: 'Admin Console', render: renderAdminConsolePage, init: initAdminConsolePage, roles: ['admin'] },
  '#/admin/users': { title: 'User Management', render: renderAdminConsolePage, init: initAdminConsolePage, roles: ['admin'] },
  '#/admin/tickets': { title: 'Support Tickets', render: renderAdminConsolePage, init: initAdminConsolePage, roles: ['admin'] },
  '#/admin/audit-logs': { title: 'Audit Trail', render: renderAdminConsolePage, init: initAdminConsolePage, roles: ['admin'] },
};

export async function navigateTo(hash = '#/') {
  window.location.hash = hash;
}

function attachLayoutHandlers() {
  initTopbarEvents();

  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        await authState.logout();
        showToast('Signed out safely.', 'info');
        window.location.hash = '#/login';
      } finally {
        logoutBtn.disabled = false;
      }
    });
  }
}

export async function handleRouting() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawHash = window.location.hash || '#/';
  const baseHash = rawHash.split('?')[0];
  const route = ROUTES[baseHash] || ROUTES['#/'];

  // Synchronize NEXUS Section Background & Ambient Lighting
  handleNexusRouteChange(baseHash);

  // 1. Check Authentication Guard
  if (!route.public) {
    if (!authState.isAuthenticated()) {
      const restored = await authState.restoreSession();
      if (!restored) {
        showToast('Please sign in to access this page.', 'info');
        window.location.hash = '#/login';
        return;
      }
    }

    // 2. Check Role Guard
    if (route.roles && !route.roles.includes(authState.role)) {
      showToast(`Access denied. Route requires [${route.roles.join(', ')}].`, 'error');
      
      let unreadCount = 0;
      try {
        const unreadRes = await api.getUnreadNotificationCount();
        unreadCount = unreadRes.data?.unreadCount || 0;
      } catch (e) {}

      app.innerHTML = `
        <div class="app-container">
          ${renderSidebar('#/dashboard')}
          <div class="main-wrapper">
            ${renderTopbar('Unauthorized Access', unreadCount)}
            <main class="page-content">
              ${renderUnauthorizedPage(authState.role, route.roles)}
            </main>
          </div>
        </div>
      `;
      // Attach Layout Event Handlers
      attachLayoutHandlers();
      return;
    }
  }

  // 3. Render Public Pages (Full Screen)
  if (route.public) {
    app.innerHTML = await route.render();
    if (route.init) route.init();
    return;
  }

  // 4. Render Protected App Shell Layout
  let unreadCount = 0;
  try {
    const unreadRes = await api.getUnreadNotificationCount();
    unreadCount = unreadRes.data?.unreadCount || 0;
  } catch (e) {}

  const pageHtml = await route.render();

  app.innerHTML = `
    <div class="app-container">
      ${renderSidebar(baseHash)}
      <div class="main-wrapper">
        ${renderTopbar(route.title, unreadCount)}
        <main class="page-content">
          ${pageHtml}
        </main>
      </div>
    </div>
  `;

  // Attach shared layout handlers once for every protected shell.
  attachLayoutHandlers();

  // Execute Page Init Script
  if (route.init) {
    route.init();
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRouting);
  // Initial route execution
  handleRouting();
}

