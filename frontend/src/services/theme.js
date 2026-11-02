/**
 * Theme Manager (Dark Mode & Light Mode)
 * Supports user preference persistence, instant toggle, and system default fallback.
 */

const THEME_STORAGE_KEY = 'myalumni_theme';

export function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  // Default to dark mode for cinematic experience, or system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  // Dispatch custom event for charts or components that re-render on theme change
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function initTheme() {
  const initial = getPreferredTheme();
  applyTheme(initial);

  // Listen for system theme change if not explicitly chosen
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

