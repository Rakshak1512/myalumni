/**
 * NEXUS 2.0 — Cinematic Landing Page Component
 * Ultra-dark, atmospheric spatial depth, refined blue/cyan ambient glows,
 * floating glass elements, and responsive layout.
 */
import { authState } from '../auth/authContext.js';
import { showToast } from '../components/toast.js';
import { toggleTheme, getPreferredTheme } from '../services/theme.js';

export function renderLandingPage() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const themeIcon = currentTheme === 'dark' ? '☀️' : '🌙';

  return `
    <div class="nexus-landing-universe">
      
      <!-- Multi-Layer Cinematic Ambient Lighting Halos with Parallax Tracking -->
      <div class="nexus-ambient-orb nexus-ambient-orb-top" id="nexus-orb-top" aria-hidden="true"></div>
      <div class="nexus-ambient-orb nexus-ambient-orb-mid" id="nexus-orb-mid" aria-hidden="true"></div>
      <div class="nexus-ambient-orb nexus-ambient-orb-left" id="nexus-orb-left" aria-hidden="true"></div>
      <div class="nexus-ambient-orb nexus-ambient-orb-right" id="nexus-orb-right" aria-hidden="true"></div>

      <!-- 3D Horizon Vanishing Grid -->
      <div class="nexus-perspective-grid" id="nexus-grid" aria-hidden="true"></div>

      <!-- Subtle Viewport Vignette -->
      <div class="nexus-landing-vignette" aria-hidden="true"></div>

      <!-- Floating Glass Navigation Bar -->
      <div style="padding: 20px 24px 0; max-width: 1240px; width: 100%; margin: 0 auto; position: relative; z-index: 10;">
        <header class="nexus-glass-header">
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <a href="#/" class="brand-logo" style="text-decoration: none; display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800; font-size: 22px; letter-spacing: -0.5px; color: #FFFFFF;">MyAlumni</span>
              <span class="brand-badge" style="background: linear-gradient(135deg, #0284C7, #00E5FF); color: #030712; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 11px;">2.0</span>
            </a>
          </div>

          <nav style="display: flex; align-items: center; gap: 28px;" class="landing-desktop-nav">
            <a href="#features" class="nexus-nav-link">Features</a>
            <a href="#demo-roles" class="nexus-nav-link">1-Click Demos</a>
            <a href="#statistics" class="nexus-nav-link">Impact</a>
          </nav>

          <div style="display: flex; align-items: center; gap: 12px;">
            <!-- Theme Switcher -->
            <button type="button" id="landing-theme-toggle" class="theme-toggle-btn" title="Toggle Theme" aria-label="Toggle Theme" style="border: 1px solid rgba(56, 189, 248, 0.25); background: rgba(14, 23, 48, 0.6); border-radius: 50%; color: #F8FAFC;">
              ${themeIcon}
            </button>
            <a href="#/login" class="btn btn-outline btn-sm" style="border-radius: var(--radius-full); padding: 8px 20px; border-color: rgba(56, 189, 248, 0.3); background: rgba(8, 14, 30, 0.6); color: #E0F2FE;">Sign In</a>
            <a href="#/register" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full); padding: 8px 22px; background: linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35);">Join Portal</a>
          </div>
        </header>
      </div>

      <!-- Cinematic Hero Section -->
      <section style="padding: 75px 24px 50px; text-align: center; position: relative; overflow: visible; z-index: 5;">
        <div style="max-width: 980px; margin: 0 auto; position: relative; z-index: 2;">
          
          <!-- Pulsing Luminous Radar Pill -->
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 7px 18px; border-radius: var(--radius-full); background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(56, 189, 248, 0.35); box-shadow: 0 0 24px rgba(6, 182, 212, 0.18); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); margin-bottom: 26px;">
            <span class="nexus-beacon-wrapper">
              <span class="nexus-beacon-ping"></span>
              <span class="nexus-beacon-dot"></span>
            </span>
            <span style="font-size: 12.5px; font-weight: 700; color: #38BDF8; letter-spacing: 0.6px; text-transform: uppercase;">
              Next-Gen Alumni Intelligence & Career Network
            </span>
          </div>

          <!-- Main Headline -->
          <h1 style="font-size: clamp(36px, 6vw, 64px); font-weight: 800; line-height: 1.12; margin-bottom: 24px; letter-spacing: -1.5px; color: #FFFFFF;">
            Empowering Careers Through <br/>
            <span class="nexus-title-gradient">Luminous Connections</span>
          </h1>

          <!-- Subheading -->
          <p style="font-size: clamp(16px, 2vw, 19.5px); color: #94A3B8; max-width: 760px; margin: 0 auto 38px; line-height: 1.65; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);">
            A unified, role-based ecosystem connecting ambitious students and accomplished alumni. Experience direct 1-on-1 mentorship, curated career opportunities, verified cohorts, and authentic human conversations.
          </p>

          <!-- Action CTA Group -->
          <div style="display: flex; justify-content: center; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 55px;">
            <a href="#/register" class="btn-nexus-cta-primary">
              ✦ Get Started Free
            </a>
            <a href="#demo-roles" class="btn-nexus-cta-secondary">
              ⚡ Test 4 Instant Roles
            </a>
          </div>

          <!-- Layered Glass Preview Hero Display -->
          <div style="margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; text-align: left;">
            
            <!-- Hero Glass Card 1 (Placements) -->
            <div class="nexus-glass-hero-card" style="padding: 26px; border-top: 2px solid #00E5FF;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="badge badge-cyan" style="background: rgba(0, 229, 255, 0.12); color: #38BDF8; border: 1px solid rgba(0, 229, 255, 0.3);">Career Placements</span>
                <span style="font-size: 12px; color: #10B981; font-weight: 700;">+28.4% YoY</span>
              </div>
              <div style="font-size: 28px; font-weight: 800; font-family: var(--font-heading); color: #FFFFFF; margin-bottom: 6px;">
                94.8% Rate
              </div>
              <p style="font-size: 13px; color: #94A3B8; margin: 0; line-height: 1.55;">Verified job referrals at top-tier tech enterprises and engineering leaders.</p>
              <!-- Mini Sparkline (Cyan) -->
              <div style="margin-top: 14px; height: 32px;">
                <svg viewBox="0 0 100 24" style="width: 100%; height: 100%; overflow: visible;">
                  <path d="M 0 20 Q 25 15 50 18 T 100 4" fill="none" stroke="#00E5FF" stroke-width="2.5" />
                </svg>
              </div>
            </div>

            <!-- Hero Glass Card 2 (Mentorship) -->
            <div class="nexus-glass-hero-card" style="padding: 26px; border-top: 2px solid #3B82F6;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="badge badge-blue" style="background: rgba(59, 130, 246, 0.12); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.3);">Mentorship Active</span>
                <span style="font-size: 12px; color: #00E5FF; font-weight: 700;">380+ Sessions</span>
              </div>
              <div style="font-size: 28px; font-weight: 800; font-family: var(--font-heading); color: #FFFFFF; margin-bottom: 6px;">
                1-on-1 Guidance
              </div>
              <p style="font-size: 13px; color: #94A3B8; margin: 0; line-height: 1.55;">Structured roadmap checkpoints, portfolio critique, and interview mastery.</p>
              <!-- Mini Sparkline (Blue) -->
              <div style="margin-top: 14px; height: 32px;">
                <svg viewBox="0 0 100 24" style="width: 100%; height: 100%; overflow: visible;">
                  <path d="M 0 22 Q 30 8 60 14 T 100 2" fill="none" stroke="#3B82F6" stroke-width="2.5" />
                </svg>
              </div>
            </div>

            <!-- Hero Glass Card 3 (SQLite DB) -->
            <div class="nexus-glass-hero-card" style="padding: 26px; border-top: 2px solid #10B981;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="badge badge-emerald" style="background: rgba(16, 185, 129, 0.12); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3);">Real SQLite DB</span>
                <span style="font-size: 12px; color: #38BDF8; font-weight: 700;">100% Local</span>
              </div>
              <div style="font-size: 28px; font-weight: 800; font-family: var(--font-heading); color: #FFFFFF; margin-bottom: 6px;">
                Zero Cloud Lag
              </div>
              <p style="font-size: 13px; color: #94A3B8; margin: 0; line-height: 1.55;">Relational SQLite architecture with full ACID compliance and instant queries.</p>
              <!-- Mini Sparkline (Emerald) -->
              <div style="margin-top: 14px; height: 32px;">
                <svg viewBox="0 0 100 24" style="width: 100%; height: 100%; overflow: visible;">
                  <path d="M 0 18 Q 30 22 70 8 T 100 3" fill="none" stroke="#10B981" stroke-width="2.5" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Instant 1-Click Interactive Demo Testing Suite -->
      <section id="demo-roles" style="padding: 65px 24px; max-width: 1200px; width: 100%; margin: 0 auto; position: relative; z-index: 5;">
        <div style="text-align: center; margin-bottom: 42px;">
          <span class="badge badge-cyan" style="margin-bottom: 12px; padding: 6px 16px; background: rgba(0, 229, 255, 0.1); color: #38BDF8; border: 1px solid rgba(0, 229, 255, 0.3);">Instant Experience</span>
          <h2 style="font-size: 32px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px; letter-spacing: -0.5px;">
            Test All 4 Authorization Roles in 1-Click
          </h2>
          <p style="color: #94A3B8; max-width: 620px; margin: 0 auto; font-size: 15px; line-height: 1.6;">
            Click any role card below to immediately log in and explore the tailored dashboards, permissions, and tools without entering credentials.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
          
          <!-- Admin Card -->
          <div class="nexus-glass-hero-card demo-card-btn" data-role="admin" style="cursor: pointer; padding: 28px; text-align: center; border: 1px solid rgba(244, 63, 94, 0.25);">
            <div style="width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; background: rgba(244, 63, 94, 0.15); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 1px solid rgba(244, 63, 94, 0.35); box-shadow: 0 0 20px rgba(244, 63, 94, 0.15);">
              🛡️
            </div>
            <span class="user-role-badge role-admin" style="margin-bottom: 8px;">System Administrator</span>
            <h3 style="font-size: 18px; margin-bottom: 8px; color: #FFFFFF;">Dr. Sarah Admin</h3>
            <p style="font-size: 13px; color: #94A3B8; line-height: 1.55; margin-bottom: 20px;">
              Manage users, audit logs, system configurations, and support tickets with full administrative clearance.
            </p>
            <button type="button" class="btn btn-navy btn-sm" style="width: 100%; pointer-events: none; border-radius: var(--radius-full); border: 1px solid rgba(244, 63, 94, 0.3); background: rgba(244, 63, 94, 0.12); color: #FCA5A5;">
              Launch Admin Console →
            </button>
          </div>

          <!-- Faculty Card -->
          <div class="nexus-glass-hero-card demo-card-btn" data-role="faculty" style="cursor: pointer; padding: 28px; text-align: center; border: 1px solid rgba(245, 158, 11, 0.25);">
            <div style="width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 1px solid rgba(245, 158, 11, 0.35); box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);">
              🎓
            </div>
            <span class="user-role-badge role-faculty" style="margin-bottom: 8px;">Faculty Advisor</span>
            <h3 style="font-size: 18px; margin-bottom: 8px; color: #FFFFFF;">Prof. Marcus Vance</h3>
            <p style="font-size: 13px; color: #94A3B8; line-height: 1.55; margin-bottom: 20px;">
              Oversee academic departments, promote graduating students to alumni status, and moderate events.
            </p>
            <button type="button" class="btn btn-navy btn-sm" style="width: 100%; pointer-events: none; border-radius: var(--radius-full); border: 1px solid rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.12); color: #FCD34D;">
              Launch Faculty Portal →
            </button>
          </div>

          <!-- Student Card -->
          <div class="nexus-glass-hero-card demo-card-btn" data-role="student" style="cursor: pointer; padding: 28px; text-align: center; border: 1px solid rgba(6, 182, 212, 0.25);">
            <div style="width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; background: rgba(6, 182, 212, 0.15); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 1px solid rgba(6, 182, 212, 0.35); box-shadow: 0 0 20px rgba(6, 182, 212, 0.15);">
              👨‍🎓
            </div>
            <span class="user-role-badge role-student" style="margin-bottom: 8px;">Student Scholar</span>
            <h3 style="font-size: 18px; margin-bottom: 8px; color: #FFFFFF;">Alex Chen</h3>
            <p style="font-size: 13px; color: #94A3B8; line-height: 1.55; margin-bottom: 20px;">
              Apply to opportunities, connect with verified alumni, request mentorship, and track career milestones.
            </p>
            <button type="button" class="btn btn-navy btn-sm" style="width: 100%; pointer-events: none; border-radius: var(--radius-full); border: 1px solid rgba(6, 182, 212, 0.3); background: rgba(6, 182, 212, 0.12); color: #67E8F9;">
              Launch Student Desk →
            </button>
          </div>

          <!-- Alumni Card -->
          <div class="nexus-glass-hero-card demo-card-btn" data-role="alumni" style="cursor: pointer; padding: 28px; text-align: center; border: 1px solid rgba(16, 185, 129, 0.25);">
            <div style="width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 1px solid rgba(16, 185, 129, 0.35); box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);">
              💼
            </div>
            <span class="user-role-badge role-alumni" style="margin-bottom: 8px;">Distinguished Alumni</span>
            <h3 style="font-size: 18px; margin-bottom: 8px; color: #FFFFFF;">Elena Rostova</h3>
            <p style="font-size: 13px; color: #94A3B8; line-height: 1.55; margin-bottom: 20px;">
              Post job referrals, mentor students, organize batch reunions, and network with global industry peers.
            </p>
            <button type="button" class="btn btn-navy btn-sm" style="width: 100%; pointer-events: none; border-radius: var(--radius-full); border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.12); color: #6EE7B7;">
              Launch Alumni Desk →
            </button>
          </div>

        </div>
      </section>

      <!-- Platform Features Ecosystem -->
      <section id="features" style="padding: 70px 24px; max-width: 1200px; width: 100%; margin: 0 auto; position: relative; z-index: 5;">
        <div style="text-align: center; margin-bottom: 50px;">
          <h2 style="font-size: 32px; font-weight: 800; color: #FFFFFF; margin-bottom: 12px; letter-spacing: -0.5px;">
            A Connected Platform Built for Purpose
          </h2>
          <p style="color: #94A3B8; font-size: 15px; max-width: 620px; margin: 0 auto; line-height: 1.6;">
            Every feature is designed to empower real relationships and career outcomes.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 26px;">
          <div class="nexus-glass-hero-card" style="padding: 28px;">
            <div style="font-size: 34px; margin-bottom: 16px;">🎯</div>
            <h3 style="font-size: 18px; margin-bottom: 10px; color: #FFFFFF;">Structured Mentorship</h3>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.65;">Direct 1-on-1 career guidance between students and verified alumni in leading engineering and business roles.</p>
          </div>

          <div class="nexus-glass-hero-card" style="padding: 28px;">
            <div style="font-size: 34px; margin-bottom: 16px;">💼</div>
            <h3 style="font-size: 18px; margin-bottom: 10px; color: #FFFFFF;">Curated Opportunities</h3>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.65;">Verified job postings, internships, and internal referrals with seamless application tracking and external links.</p>
          </div>

          <div class="nexus-glass-hero-card" style="padding: 28px;">
            <div style="font-size: 34px; margin-bottom: 16px;">💬</div>
            <h3 style="font-size: 18px; margin-bottom: 10px; color: #FFFFFF;">Human Peer Messaging</h3>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.65;">Fast, reliable direct messaging with unread badges, active member search, and real database persistence.</p>
          </div>

          <div class="nexus-glass-hero-card" style="padding: 28px;">
            <div style="font-size: 34px; margin-bottom: 16px;">🎓</div>
            <h3 style="font-size: 18px; margin-bottom: 10px; color: #FFFFFF;">Cohorts & Reunions</h3>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.65;">Graduating class discussions, anniversary celebrations, birthday corners, and regional reunion registries.</p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer style="margin-top: auto; border-top: 1px solid rgba(56, 189, 248, 0.15); padding: 36px 30px; background: rgba(4, 9, 22, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); color: #94A3B8; font-size: 13.5px; position: relative; z-index: 10;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 800; color: #FFFFFF; font-size: 16px;">MyAlumni 2.0</span>
            <span>&copy; 2026. Built with Vanilla JS, Vite, Flask REST API & SQLite.</span>
          </div>
          <div style="display: flex; gap: 18px;">
            <a href="#/login" style="color: #94A3B8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#FFFFFF'" onmouseout="this.style.color='#94A3B8'">Sign In</a>
            <a href="#/register" style="color: #94A3B8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#FFFFFF'" onmouseout="this.style.color='#94A3B8'">Register</a>
            <a href="#/forgot-password" style="color: #94A3B8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#FFFFFF'" onmouseout="this.style.color='#94A3B8'">Reset Password</a>
          </div>
        </div>
      </footer>

    </div>
  `;
}

export function initLandingPage() {
  // Theme Toggle Button
  const themeBtn = document.getElementById('landing-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  // 1-Click Interactive Demo Role Cards
  document.querySelectorAll('.demo-card-btn').forEach(card => {
    card.addEventListener('click', async () => {
      const role = card.getAttribute('data-role');
      card.style.opacity = '0.7';
      showToast(`Signing in as ${role.toUpperCase()} Demo...`, 'info');
      try {
        await authState.demoLogin(role);
        showToast(`Welcome! Signed in as ${role.toUpperCase()} Demo.`, 'success');
        window.location.hash = '#/dashboard';
      } catch (err) {
        showToast(err.message || 'Demo login failed.', 'error');
        card.style.opacity = '1';
      }
    });
  });

  // Desktop Restrained Parallax Tracking (disabled on touch devices & reduced motion)
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isTouch && !prefersReduced) {
    const orbTop = document.getElementById('nexus-orb-top');
    const orbLeft = document.getElementById('nexus-orb-left');
    const orbRight = document.getElementById('nexus-orb-right');
    const orbMid = document.getElementById('nexus-orb-mid');
    const grid = document.getElementById('nexus-grid');

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const onParallaxMove = (e) => {
      const w = window.innerWidth || 1920;
      const h = window.innerHeight || 1080;
      targetX = (e.clientX / w) * 2 - 1; // -1 to +1
      targetY = (e.clientY / h) * 2 - 1; // -1 to +1
    };

    const updateParallax = () => {
      // Graceful loop exit when user navigates away from landing page
      if (!document.getElementById('nexus-orb-top')) {
        window.removeEventListener('mousemove', onParallaxMove);
        return;
      }

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      if (orbTop) {
        orbTop.style.transform = `translateX(calc(-50% + ${mouseX * 25}px)) translateY(${mouseY * 18}px)`;
      }
      if (orbLeft) {
        orbLeft.style.transform = `translate(${mouseX * -18}px, ${mouseY * -14}px)`;
      }
      if (orbRight) {
        orbRight.style.transform = `translate(${mouseX * 22}px, ${mouseY * 18}px)`;
      }
      if (orbMid) {
        orbMid.style.transform = `translate(calc(-50% + ${mouseX * 14}px), calc(-50% + ${mouseY * 12}px))`;
      }
      if (grid) {
        grid.style.transform = `perspective(650px) rotateX(68deg) translateX(${mouseX * 14}px)`;
      }

      requestAnimationFrame(updateParallax);
    };

    window.addEventListener('mousemove', onParallaxMove, { passive: true });
    requestAnimationFrame(updateParallax);
  }
}
