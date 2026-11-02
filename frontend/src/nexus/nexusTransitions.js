/**
 * NEXUS 2.0 — Section & Page Cinematic Transitions
 * Coordinates smooth CSS variable updates, page-enter animations,
 * and section-specific glow accents on navigation elements.
 */

import { getThemeForRoute, NEXUS_THEMES } from './nexusThemes.js';
import { nexusBackground } from './nexusBackgroundRenderer.js';
import { authState } from '../auth/authContext.js';

export function handleNexusRouteChange(routeHash) {
  let theme = getThemeForRoute(routeHash);

  const base = (routeHash || '#/').split('?')[0];
  const role = (authState.role || '').toLowerCase();
  if (base === '#/dashboard' && role === 'student') {
    theme = NEXUS_THEMES['student-workspace'] || theme;
  }

  // 1. Transition the background canvas
  nexusBackground.setTheme(theme.id, true);

  // 2. Synchronize navigation elements with section accent
  updateNavigationAccents(theme);

  // 3. Trigger cinematic page content entrance
  const pageContent = document.querySelector('.page-content');
  if (pageContent) {
    pageContent.classList.remove('nexus-page-enter');
    // Force reflow
    void pageContent.offsetWidth;
    pageContent.classList.add('nexus-page-enter');
  }
}

function updateNavigationAccents(theme) {
  const activeNavItem = document.querySelector('.nav-item.active');
  if (activeNavItem) {
    activeNavItem.style.setProperty('--item-accent', theme.accentColor);
    activeNavItem.style.setProperty('--item-glow', theme.accentGlow);
  }

  const topbar = document.querySelector('.topbar');
  if (topbar) {
    topbar.style.borderBottomColor = `rgba(${theme.accentRgb}, 0.18)`;
  }
}

