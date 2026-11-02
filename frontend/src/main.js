/**
 * MyAlumni 2.0 — Application Entry Point
 * Vanilla JavaScript & Vite
 */
import { initRouter } from './router.js';
import { authState } from './auth/authContext.js';
import { initTheme } from './services/theme.js';
import { nexusBackground } from './nexus/nexusBackgroundRenderer.js';
import { initFeatureHelp } from './components/featureHelp.js';

console.log("==========================================");
console.log("  MyAlumni 2.0 NEXUS UI Initialized");
console.log(`  Environment: ${import.meta.env.MODE}`);
console.log(`  API Base URL: ${import.meta.env.VITE_API_BASE_URL}`);
console.log("==========================================");

// Bootstrap Application
async function bootstrap() {
  // Initialize Theme System (Dark / Light mode)
  initTheme();

  // Initialize NEXUS Feature Guidance System
  initFeatureHelp();

  // Initialize NEXUS Cinematic Background Engine
  nexusBackground.init();

  // Attempt session restoration from saved token
  await authState.restoreSession().catch(() => null);

  // Initialize SPA Hash Router
  initRouter();
}

bootstrap();

