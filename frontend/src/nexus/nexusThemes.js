/**
 * NEXUS 2.0 — Cinematic Dark Mystery UI Theme Configuration
 * Defines section-wise visual identities, color palettes, and animation parameters
 * for both Dark and Light modes.
 */

export const NEXUS_THEMES = {
  // A. MAIN DASHBOARD — MIDNIGHT AURORA
  'midnight-aurora': {
    id: 'midnight-aurora',
    name: 'Midnight Aurora',
    sectionTitle: 'Command Center',
    accentColor: '#397BFF',
    accentSecondary: '#37C9D5',
    accentGlow: 'rgba(57, 123, 255, 0.35)',
    accentRgb: '57, 123, 255',
    dark: {
      baseBg: '#080B14',
      ambient1: 'rgba(16, 23, 43, 0.95)',
      ambient2: 'rgba(57, 123, 255, 0.16)',
      ambient3: 'rgba(55, 201, 213, 0.12)',
      cardBg: 'rgba(12, 18, 36, 0.78)',
      cardBorder: 'rgba(57, 123, 255, 0.16)',
      textMain: '#F8FAFC',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#F4F7FC',
      ambient1: 'rgba(235, 242, 255, 0.9)',
      ambient2: 'rgba(57, 123, 255, 0.12)',
      ambient3: 'rgba(55, 201, 213, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.88)',
      cardBorder: 'rgba(57, 123, 255, 0.22)',
      textMain: '#0F172A',
      textMuted: '#475569'
    },
    renderer: 'aurora'
  },

  // A2. STUDENT WORKSPACE — STUDENT SCHOLAR NEXUS
  'student-workspace': {
    id: 'student-workspace',
    name: 'Student Scholar Nexus',
    sectionTitle: 'Student Command Workspace',
    accentColor: '#00E5FF',
    accentSecondary: '#3B82F6',
    accentGlow: 'rgba(0, 229, 255, 0.35)',
    accentRgb: '0, 229, 255',
    dark: {
      baseBg: '#040816',
      ambient1: 'rgba(6, 12, 28, 0.98)',
      ambient2: 'rgba(14, 165, 233, 0.20)',
      ambient3: 'rgba(37, 99, 235, 0.16)',
      cardBg: 'rgba(8, 15, 32, 0.78)',
      cardBorder: 'rgba(56, 189, 248, 0.16)',
      textMain: '#F8FAFC',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#F0F9FF',
      ambient1: 'rgba(224, 242, 254, 0.88)',
      ambient2: 'rgba(14, 165, 233, 0.12)',
      ambient3: 'rgba(37, 99, 235, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.92)',
      cardBorder: 'rgba(14, 165, 233, 0.22)',
      textMain: '#0C4A6E',
      textMuted: '#475569'
    },
    renderer: 'student-workspace'
  },

  // B. ALUMNI DIRECTORY — NEURAL UNIVERSE
  'neural-universe': {
    id: 'neural-universe',
    name: 'Neural Universe',
    sectionTitle: 'Alumni Network & Directory',
    accentColor: '#00E5FF',
    accentSecondary: '#00B4D8',
    accentGlow: 'rgba(0, 229, 255, 0.35)',
    accentRgb: '0, 229, 255',
    dark: {
      baseBg: '#060A12',
      ambient1: 'rgba(10, 18, 30, 0.95)',
      ambient2: 'rgba(0, 229, 255, 0.14)',
      ambient3: 'rgba(0, 180, 216, 0.10)',
      cardBg: 'rgba(10, 18, 32, 0.78)',
      cardBorder: 'rgba(0, 229, 255, 0.18)',
      textMain: '#F0FDFA',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#F0F9FF',
      ambient1: 'rgba(224, 242, 254, 0.85)',
      ambient2: 'rgba(0, 180, 216, 0.12)',
      ambient3: 'rgba(0, 229, 255, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(0, 180, 216, 0.22)',
      textMain: '#0C4A6E',
      textMuted: '#475569'
    },
    renderer: 'neural'
  },

  // C. EVENTS & REUNIONS — EMERALD DEPTH
  'emerald-depth': {
    id: 'emerald-depth',
    name: 'Emerald Depth',
    sectionTitle: 'Events & Reunions',
    accentColor: '#10B981',
    accentSecondary: '#059669',
    accentGlow: 'rgba(16, 185, 129, 0.35)',
    accentRgb: '16, 185, 129',
    dark: {
      baseBg: '#060D0A',
      ambient1: 'rgba(6, 26, 18, 0.95)',
      ambient2: 'rgba(16, 185, 129, 0.14)',
      ambient3: 'rgba(5, 150, 105, 0.10)',
      cardBg: 'rgba(8, 24, 18, 0.78)',
      cardBorder: 'rgba(16, 185, 129, 0.18)',
      textMain: '#ECFDF5',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#F0FDF4',
      ambient1: 'rgba(220, 252, 231, 0.85)',
      ambient2: 'rgba(16, 185, 129, 0.12)',
      ambient3: 'rgba(5, 150, 105, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(16, 185, 129, 0.22)',
      textMain: '#064E3B',
      textMuted: '#475569'
    },
    renderer: 'topographic'
  },

  // D. MENTORSHIP & DIRECT MESSAGES — COSMIC VIOLET
  'cosmic-violet': {
    id: 'cosmic-violet',
    name: 'Cosmic Violet',
    sectionTitle: 'Mentorship & Messaging',
    accentColor: '#A855F7',
    accentSecondary: '#8B5CF6',
    accentGlow: 'rgba(168, 85, 247, 0.35)',
    accentRgb: '168, 85, 247',
    dark: {
      baseBg: '#080612',
      ambient1: 'rgba(21, 14, 38, 0.95)',
      ambient2: 'rgba(168, 85, 247, 0.16)',
      ambient3: 'rgba(139, 92, 246, 0.12)',
      cardBg: 'rgba(18, 12, 34, 0.78)',
      cardBorder: 'rgba(168, 85, 247, 0.18)',
      textMain: '#FAF5FF',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#FAF5FF',
      ambient1: 'rgba(243, 232, 255, 0.85)',
      ambient2: 'rgba(168, 85, 247, 0.12)',
      ambient3: 'rgba(139, 92, 246, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(168, 85, 247, 0.22)',
      textMain: '#4C1D95',
      textMuted: '#475569'
    },
    renderer: 'cosmic'
  },

  // E. CAREER OPPORTUNITIES & GROWTH TRACKER — LIQUID TEAL
  'liquid-teal': {
    id: 'liquid-teal',
    name: 'Liquid Teal',
    sectionTitle: 'Career Growth & Opportunities',
    accentColor: '#14B8A6',
    accentSecondary: '#06B6D4',
    accentGlow: 'rgba(20, 184, 166, 0.35)',
    accentRgb: '20, 184, 166',
    dark: {
      baseBg: '#060C10',
      ambient1: 'rgba(8, 25, 30, 0.95)',
      ambient2: 'rgba(20, 184, 166, 0.15)',
      ambient3: 'rgba(6, 182, 212, 0.11)',
      cardBg: 'rgba(10, 22, 28, 0.78)',
      cardBorder: 'rgba(20, 184, 166, 0.18)',
      textMain: '#F0FDFA',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#F0FDFA',
      ambient1: 'rgba(204, 251, 241, 0.85)',
      ambient2: 'rgba(20, 184, 166, 0.12)',
      ambient3: 'rgba(6, 182, 212, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(20, 184, 166, 0.22)',
      textMain: '#134E4A',
      textMuted: '#475569'
    },
    renderer: 'liquid'
  },

  // F. ANALYTICS, ACHIEVEMENTS & REPORTS — DIGITAL INTELLIGENCE
  'digital-intelligence': {
    id: 'digital-intelligence',
    name: 'Digital Intelligence',
    sectionTitle: 'Analytics, Achievements & Community',
    accentColor: '#6366F1',
    accentSecondary: '#00F0FF',
    accentGlow: 'rgba(99, 102, 241, 0.35)',
    accentRgb: '99, 102, 241',
    dark: {
      baseBg: '#050713',
      ambient1: 'rgba(12, 17, 36, 0.95)',
      ambient2: 'rgba(99, 102, 241, 0.16)',
      ambient3: 'rgba(0, 240, 255, 0.10)',
      cardBg: 'rgba(11, 16, 32, 0.78)',
      cardBorder: 'rgba(99, 102, 241, 0.18)',
      textMain: '#EEF2FF',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#EEF2FF',
      ambient1: 'rgba(224, 231, 255, 0.85)',
      ambient2: 'rgba(99, 102, 241, 0.12)',
      ambient3: 'rgba(0, 240, 255, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(99, 102, 241, 0.22)',
      textMain: '#312E81',
      textMuted: '#475569'
    },
    renderer: 'digital'
  },

  // G. SETTINGS & ADMIN CONSOLE — OBSIDIAN SHADOW
  'obsidian-shadow': {
    id: 'obsidian-shadow',
    name: 'Obsidian Shadow',
    sectionTitle: 'Governance & Preferences',
    accentColor: '#F43F5E',
    accentSecondary: '#F59E0B',
    accentGlow: 'rgba(244, 63, 94, 0.35)',
    accentRgb: '244, 63, 94',
    dark: {
      baseBg: '#050508',
      ambient1: 'rgba(18, 14, 20, 0.95)',
      ambient2: 'rgba(244, 63, 94, 0.13)',
      ambient3: 'rgba(245, 158, 11, 0.09)',
      cardBg: 'rgba(16, 14, 20, 0.82)',
      cardBorder: 'rgba(244, 63, 94, 0.16)',
      textMain: '#FFF1F2',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#FFF1F2',
      ambient1: 'rgba(255, 228, 230, 0.85)',
      ambient2: 'rgba(244, 63, 94, 0.10)',
      ambient3: 'rgba(245, 158, 11, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(244, 63, 94, 0.22)',
      textMain: '#881337',
      textMuted: '#475569'
    },
    renderer: 'obsidian'
  },

  // H. LANDING & AUTHENTICATION — STELLAR GENESIS (Ultra-Dark Blue/Cyan NEXUS)
  'stellar-genesis': {
    id: 'stellar-genesis',
    name: 'Stellar Genesis',
    sectionTitle: 'Welcome to MyAlumni',
    accentColor: '#00E5FF',
    accentSecondary: '#3B82F6',
    accentGlow: 'rgba(0, 229, 255, 0.35)',
    accentRgb: '0, 229, 255',
    dark: {
      baseBg: '#030712',
      ambient1: 'rgba(4, 9, 24, 0.98)',
      ambient2: 'rgba(14, 165, 233, 0.16)',
      ambient3: 'rgba(59, 130, 246, 0.14)',
      cardBg: 'rgba(8, 14, 30, 0.78)',
      cardBorder: 'rgba(56, 189, 248, 0.18)',
      textMain: '#F8FAFC',
      textMuted: '#94A3B8'
    },
    light: {
      baseBg: '#F0F9FF',
      ambient1: 'rgba(224, 242, 254, 0.85)',
      ambient2: 'rgba(14, 165, 233, 0.12)',
      ambient3: 'rgba(59, 130, 246, 0.08)',
      cardBg: 'rgba(255, 255, 255, 0.92)',
      cardBorder: 'rgba(14, 165, 233, 0.22)',
      textMain: '#0C4A6E',
      textMuted: '#475569'
    },
    renderer: 'stellar'
  }
};

/**
 * Maps every application route hash to its dedicated NEXUS theme.
 */
export const ROUTE_THEME_MAP = {
  // Landing & Auth
  '#/': 'stellar-genesis',
  '#/login': 'stellar-genesis',
  '#/register': 'stellar-genesis',
  '#/forgot-password': 'stellar-genesis',

  // Dashboards -> Midnight Aurora
  '#/dashboard': 'midnight-aurora',

  // Directory -> Neural Universe
  '#/directory': 'neural-universe',

  // Events -> Emerald Depth
  '#/events': 'emerald-depth',

  // Mentorship & Messages -> Cosmic Violet
  '#/mentorship': 'cosmic-violet',
  '#/messages': 'cosmic-violet',

  // Opportunities & Career -> Liquid Teal
  '#/opportunities': 'liquid-teal',
  '#/career-tracker': 'liquid-teal',
  '#/career-guide': 'liquid-teal',

  // Analytics, Achievements, Batches, Resources -> Digital Intelligence
  '#/achievements': 'digital-intelligence',
  '#/batches': 'digital-intelligence',
  '#/birthdays': 'digital-intelligence',
  '#/resources': 'digital-intelligence',
  '#/notifications': 'digital-intelligence',

  // Settings & Administrative Sections -> Obsidian Shadow
  '#/settings': 'obsidian-shadow',
  '#/admin': 'obsidian-shadow',
  '#/admin/users': 'obsidian-shadow',
  '#/admin/tickets': 'obsidian-shadow',
  '#/admin/audit-logs': 'obsidian-shadow',
  '#/faculty/moderation': 'obsidian-shadow',
  '#/faculty/promotion': 'obsidian-shadow',
  '#/contact-admin': 'obsidian-shadow'
};

export function getThemeForRoute(routeHash) {
  const base = (routeHash || '#/').split('?')[0];
  const themeId = ROUTE_THEME_MAP[base] || 'midnight-aurora';
  return NEXUS_THEMES[themeId] || NEXUS_THEMES['midnight-aurora'];
}

