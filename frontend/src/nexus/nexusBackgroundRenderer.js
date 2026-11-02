/**
 * NEXUS 2.0 — Central Cinematic Background Engine
 * Renders individual procedural atmospheric animations for each section
 * with smooth cross-fade transitions and full Dark/Light mode support.
 */

import { NEXUS_THEMES, getThemeForRoute } from './nexusThemes.js';

class NexusBackgroundEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    this.currentTheme = NEXUS_THEMES['midnight-aurora'];
    this.prevTheme = null;
    this.transitionProgress = 1.0;
    this.transitionDuration = 700; // ms
    this.transitionStartTime = 0;

    this.animFrameId = null;
    this.time = 0;
    this.isVisible = true;
    this.prefersReducedMotion = false;

    // Particle cache pools for each renderer
    this.neuralNodes = [];
    this.cosmicMotes = [];
    this.matrixDots = [];
    this.auroraStars = [];
    this.spotlights = [];
    this.stellarMotes = [];
    this.stellarPulses = [];
    this.studentNodes = [];
    this.studentPulses = [];
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    this._boundRender = this._renderLoop.bind(this);
    this._boundResize = this._handleResize.bind(this);
    this._boundVisibility = this._handleVisibility.bind(this);
    this._boundThemeChange = this._handleThemeChange.bind(this);
  }

  init() {
    if (this.canvas) return;

    // Check reduced motion
    this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create background canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'nexus-bg-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '-1',
      transition: 'opacity 0.5s ease',
      display: 'block'
    });

    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this._handleResize();
    this._initParticlePools();

    // Event listeners
    window.addEventListener('resize', this._boundResize);
    document.addEventListener('visibilitychange', this._boundVisibility);
    window.addEventListener('themechange', this._boundThemeChange);

    // Keep mouse coordinates stable at 0 across all devices (no mouse movement jitter)
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    // Initial theme based on current location hash
    const initialTheme = getThemeForRoute(window.location.hash);
    this.setTheme(initialTheme.id, false);

    // Start render loop
    this.animFrameId = requestAnimationFrame(this._boundRender);
  }

  _handleResize() {
    if (!this.canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);
    this._initParticlePools();
  }

  _handleVisibility() {
    this.isVisible = !document.hidden;
  }

  _handleThemeChange() {
    // Canvas will naturally read document.documentElement.getAttribute('data-theme') on next frame
  }

  _initParticlePools() {
    const w = this.width || window.innerWidth;
    const h = this.height || window.innerHeight;

    // 1. Neural Nodes (Directory)
    const nodeCount = Math.floor(Math.min(w, 1400) / 28);
    this.neuralNodes = [];
    for (let i = 0; i < nodeCount; i++) {
      this.neuralNodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.2 + 1.2,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    // 2. Cosmic Motes (Mentorship / Messages)
    this.cosmicMotes = [];
    for (let i = 0; i < 40; i++) {
      this.cosmicMotes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.3 + 0.1,
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    // 3. Digital Grid Matrix (Analytics / Achievements)
    this.matrixDots = [];
    const cols = Math.floor(w / 45);
    const rows = 12;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.matrixDots.push({
          x: c * 45 + 20,
          baseY: h * 0.6 + r * 28,
          phase: (c * 0.2) + (r * 0.3)
        });
      }
    }

    // 4. Distant Aurora Stars (Dashboard)
    this.auroraStars = [];
    for (let i = 0; i < 45; i++) {
      this.auroraStars.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.7),
        size: Math.random() * 1.5 + 0.5,
        blinkSpeed: Math.random() * 0.02 + 0.005,
        blinkPhase: Math.random() * Math.PI * 2
      });
    }

    // 5. Obsidian Spotlights (Settings / Admin)
    this.spotlights = [
      { x: w * 0.2, y: h * 0.3, vx: 0.15, vy: 0.1, rad: Math.min(w, h) * 0.45 },
      { x: w * 0.8, y: h * 0.7, vx: -0.12, vy: -0.15, rad: Math.min(w, h) * 0.5 }
    ];

    // 6. Stellar Nexus Constellation Motes (Landing / Auth)
    this.stellarMotes = [];
    const moteCount = Math.floor(Math.min(w, 1400) / 22);
    for (let i = 0; i < moteCount; i++) {
      const isBeacon = Math.random() < 0.24;
      this.stellarMotes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.55,
        vy: -(Math.random() * 0.5 + 0.18),
        radius: isBeacon ? Math.random() * 1.5 + 3.2 : Math.random() * 1.6 + 1.4,
        isBeacon: isBeacon,
        depth: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.04 + 0.015,
        pulsePhase: Math.random() * Math.PI * 2,
        cyanRatio: Math.random()
      });
    }

    // 7. Travelling Energy Pulses along Network Lines
    this.stellarPulses = [];
    for (let i = 0; i < 10; i++) {
      this.stellarPulses.push({
        p1: null,
        p2: null,
        progress: Math.random(),
        speed: Math.random() * 0.012 + 0.007,
        active: false,
        cooldown: Math.floor(Math.random() * 40)
      });
    }

    // 8. Student Scholar Workspace Nodes & Pulses
    this.studentNodes = [];
    const studentCount = Math.floor(Math.min(w, 1400) / 26);
    for (let i = 0; i < studentCount; i++) {
      const isBeacon = Math.random() < 0.22;
      this.studentNodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.40,
        vy: -(Math.random() * 0.45 + 0.15),
        radius: isBeacon ? Math.random() * 1.5 + 3.0 : Math.random() * 1.5 + 1.2,
        isBeacon: isBeacon,
        depth: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.035 + 0.012,
        pulsePhase: Math.random() * Math.PI * 2,
        cyanRatio: Math.random()
      });
    }

    this.studentPulses = [];
    for (let i = 0; i < 8; i++) {
      this.studentPulses.push({
        p1: null,
        p2: null,
        progress: Math.random(),
        speed: Math.random() * 0.010 + 0.006,
        active: false,
        cooldown: Math.floor(Math.random() * 45)
      });
    }
  }

  setTheme(themeId, animate = true) {
    const next = NEXUS_THEMES[themeId] || NEXUS_THEMES['midnight-aurora'];
    if (this.currentTheme && this.currentTheme.id === next.id) return;

    if (!animate || this.prefersReducedMotion) {
      this.currentTheme = next;
      this.prevTheme = null;
      this.transitionProgress = 1.0;
    } else {
      this.prevTheme = this.currentTheme;
      this.currentTheme = next;
      this.transitionProgress = 0.0;
      this.transitionStartTime = performance.now();
    }

    this._updateCssVariables(this.currentTheme);
  }

  _updateCssVariables(theme) {
    const root = document.documentElement;
    root.style.setProperty('--section-accent', theme.accentColor);
    root.style.setProperty('--section-accent-secondary', theme.accentSecondary);
    root.style.setProperty('--section-glow', theme.accentGlow);
    root.style.setProperty('--section-accent-rgb', theme.accentRgb);
    root.setAttribute('data-nexus-theme', theme.id);
  }

  _renderLoop(now) {
    if (this.isVisible) {
      // Smooth lerp mouse parallax
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

      this._updateTransition(now);
      this._drawFrame();
    }
    this.animFrameId = requestAnimationFrame(this._boundRender);
  }

  _updateTransition(now) {
    if (this.transitionProgress < 1.0) {
      const elapsed = now - this.transitionStartTime;
      this.transitionProgress = Math.min(1.0, elapsed / this.transitionDuration);
      if (this.transitionProgress >= 1.0) {
        this.prevTheme = null;
      }
    }
  }

  _drawFrame() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    this.time += this.prefersReducedMotion ? 0.002 : 0.008;

    // If transitioning, interpolate between previous and current theme
    if (this.prevTheme && this.transitionProgress < 1.0) {
      // 1. Draw previous theme
      ctx.globalAlpha = 1.0;
      this._renderSpecificTheme(this.prevTheme, isDark, w, h);

      // 2. Cross-fade with current theme
      ctx.globalAlpha = this._easeInOut(this.transitionProgress);
      this._renderSpecificTheme(this.currentTheme, isDark, w, h);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalAlpha = 1.0;
      this._renderSpecificTheme(this.currentTheme, isDark, w, h);
    }
  }

  _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  _renderSpecificTheme(theme, isDark, w, h) {
    const palette = isDark ? theme.dark : theme.light;

    // 1. Base solid gradient background
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, palette.baseBg);
    bgGrad.addColorStop(1, palette.ambient1);
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, w, h);

    // 2. Dispatch to specific theme renderer
    switch (theme.renderer) {
      case 'aurora':
        this._renderAurora(palette, isDark, w, h);
        break;
      case 'student-workspace':
        this._renderStudentWorkspace(palette, isDark, w, h);
        break;
      case 'neural':
        this._renderNeural(palette, isDark, w, h);
        break;
      case 'topographic':
        this._renderTopographic(palette, isDark, w, h);
        break;
      case 'cosmic':
        this._renderCosmic(palette, isDark, w, h);
        break;
      case 'liquid':
        this._renderLiquid(palette, isDark, w, h);
        break;
      case 'digital':
        this._renderDigital(palette, isDark, w, h);
        break;
      case 'obsidian':
        this._renderObsidian(palette, isDark, w, h);
        break;
      case 'stellar':
      default:
        this._renderStellar(palette, isDark, w, h);
        break;
    }
  }

  // =========================================================================
  // A. MIDNIGHT AURORA (Main Dashboard)
  // Flowing northern-lights aurora waves, electric blue & soft cyan spatial depth
  // =========================================================================
  _renderAurora(palette, isDark, w, h) {
    const ctx = this.ctx;
    const t = this.time;

    // Distant twinkle stars
    if (isDark) {
      ctx.fillStyle = '#FFFFFF';
      for (const s of this.auroraStars) {
        const alpha = Math.sin(t * 2 + s.blinkPhase) * 0.35 + 0.4;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Upper ambient radial glow
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.15, 20, w * 0.5, h * 0.3, w * 0.65);
    glow.addColorStop(0, palette.ambient2);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Flowing Aurora Ribbon 1 (Electric Blue)
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.45, 90, 0.003, t * 1.2,
      isDark ? 'rgba(57, 123, 255, 0.22)' : 'rgba(57, 123, 255, 0.12)',
      isDark ? 'rgba(55, 201, 213, 0.02)' : 'rgba(55, 201, 213, 0.01)'
    );

    // Flowing Aurora Ribbon 2 (Soft Cyan)
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.6, 75, 0.004, t * 0.9 + 2.0,
      isDark ? 'rgba(55, 201, 213, 0.18)' : 'rgba(55, 201, 213, 0.10)',
      isDark ? 'rgba(57, 123, 255, 0.02)' : 'rgba(57, 123, 255, 0.01)'
    );
  }

  // =========================================================================
  // A2. STUDENT SCHOLAR WORKSPACE (Student Dashboard)
  // Ultra-dark navy foundation, soft flowing blue/cyan aurora waves,
  // floating career network nodes, travelling light pulses, and subtle parallax.
  // =========================================================================
  _renderStudentWorkspace(palette, isDark, w, h) {
    const ctx = this.ctx;
    const reduced = this.prefersReducedMotion;
    const t = this.time * 1.8;
    const mx = reduced ? 0 : (this.mouse ? this.mouse.x : 0);
    const my = reduced ? 0 : (this.mouse ? this.mouse.y : 0);

    // 1. Subtle Animated Aurora Blooms
    // Cyan Upper-Right Aurora Bloom
    const aurora1X = w * (0.60 + Math.sin(t * 0.4) * 0.10) + mx * 25;
    const aurora1Y = h * 0.20 + Math.cos(t * 0.35) * 30 + my * 20;
    const aurora1R = Math.max(w, h) * (0.50 + Math.sin(t * 0.25) * 0.05);
    const rad1 = ctx.createRadialGradient(aurora1X, aurora1Y, 30, aurora1X, aurora1Y, aurora1R);
    rad1.addColorStop(0, isDark ? 'rgba(14, 165, 233, 0.22)' : 'rgba(14, 165, 233, 0.12)');
    rad1.addColorStop(0.45, isDark ? 'rgba(6, 182, 212, 0.10)' : 'rgba(6, 182, 212, 0.05)');
    rad1.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, w, h);

    // Royal Azure Counter-Bloom (Left side)
    const aurora2X = w * (0.35 + Math.cos(t * 0.38) * 0.12) + mx * 20;
    const aurora2Y = h * 0.40 + Math.sin(t * 0.45) * 35 + my * 15;
    const aurora2R = Math.max(w, h) * (0.45 + Math.cos(t * 0.3) * 0.05);
    const rad2 = ctx.createRadialGradient(aurora2X, aurora2Y, 25, aurora2X, aurora2Y, aurora2R);
    rad2.addColorStop(0, isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.09)');
    rad2.addColorStop(0.5, isDark ? 'rgba(29, 78, 216, 0.08)' : 'rgba(29, 78, 216, 0.04)');
    rad2.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad2;
    ctx.fillRect(0, 0, w, h);

    // 2. Subtle Flowing Light Wave Ribbons
    // Fluid Cyan Wave Ribbon
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.50 + Math.sin(t * 0.4) * 15, 50, 0.002, t * 1.1,
      isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.07)',
      'rgba(0, 0, 0, 0)'
    );

    // Deep Azure Counter Wave Ribbon
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.65 + Math.cos(t * 0.35) * 18, 55, 0.0025, t * 0.85 + 1.5,
      isDark ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.06)',
      'rgba(0, 0, 0, 0)'
    );

    // 3. Floating Student Scholar Nodes & Fine Network Connections
    const activePairs = [];
    if (this.studentNodes && this.studentNodes.length > 0) {
      const nodePositions = [];

      for (let i = 0; i < this.studentNodes.length; i++) {
        const m = this.studentNodes[i];
        if (!reduced) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.y < -20) { m.y = h + 20; m.x = Math.random() * w; }
          if (m.y > h + 20) { m.y = -20; m.x = Math.random() * w; }
          if (m.x < -20) m.x = w + 20;
          if (m.x > w + 20) m.x = -20;
        }

        const depth = m.depth || 0.5;
        const posX = m.x + mx * 25 * depth;
        const posY = m.y + my * 20 * depth;
        nodePositions.push({ x: posX, y: posY, m });

        const pulse = Math.sin(t * 2.8 + m.pulsePhase) * 0.35 + 0.65;
        const alpha = (isDark ? 0.70 : 0.40) * pulse;
        const baseColor = m.cyanRatio > 0.45 ? '0, 229, 255' : '59, 130, 246';

        if (m.isBeacon) {
          ctx.beginPath();
          ctx.arc(posX, posY, m.radius * (1.7 + pulse * 0.4), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${baseColor}, ${alpha * 0.20})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(posX, posY, m.radius * (reduced ? 1.0 : (0.85 + 0.25 * pulse)), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor}, ${alpha})`;
        ctx.fill();
      }

      // Fine Network Connections (within ~110px)
      const maxDist = 110;
      const maxDistSq = maxDist * maxDist;
      for (let i = 0; i < nodePositions.length; i++) {
        const p1 = nodePositions[i];
        for (let j = i + 1; j < nodePositions.length; j++) {
          const p2 = nodePositions[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const linkAlpha = (1 - dist / maxDist) * (isDark ? 0.20 : 0.10);
            ctx.strokeStyle = `rgba(0, 229, 255, ${linkAlpha})`;
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            activePairs.push({ p1, p2, dist });
          }
        }
      }

      // 4. Travelling Light Pulses along Connected Vectors
      if (!reduced && this.studentPulses && activePairs.length > 0) {
        for (let k = 0; k < this.studentPulses.length; k++) {
          const pulse = this.studentPulses[k];
          if (!pulse.active) {
            if (pulse.cooldown > 0) {
              pulse.cooldown--;
            } else {
              const pair = activePairs[Math.floor(Math.random() * activePairs.length)];
              pulse.p1 = pair.p1;
              pulse.p2 = pair.p2;
              pulse.progress = 0;
              pulse.active = true;
            }
          }

          if (pulse.active && pulse.p1 && pulse.p2) {
            pulse.progress += pulse.speed;
            if (pulse.progress >= 1.0) {
              pulse.active = false;
              pulse.cooldown = Math.floor(Math.random() * 40 + 15);
            } else {
              const px = pulse.p1.x + (pulse.p2.x - pulse.p1.x) * pulse.progress;
              const py = pulse.p1.y + (pulse.p2.y - pulse.p1.y) * pulse.progress;

              ctx.beginPath();
              ctx.arc(px, py, 4.5, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(0, 229, 255, 0.40)';
              ctx.fill();

              ctx.beginPath();
              ctx.arc(px, py, 1.8, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // B. NEURAL UNIVERSE (Alumni Directory)
  // Floating alumni nodes with dynamic connecting axon lines
  // =========================================================================
  _renderNeural(palette, isDark, w, h) {
    const ctx = this.ctx;
    const nodes = this.neuralNodes;
    const maxDist = 125;
    const maxDistSq = maxDist * maxDist;

    // Ambient cyan backdrop illumination
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.4, 40, w * 0.7, h * 0.4, w * 0.6);
    glow.addColorStop(0, palette.ambient2);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Update node positions
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0) n.x = w;
      if (n.x > w) n.x = 0;
      if (n.y < 0) n.y = h;
      if (n.y > h) n.y = 0;
    }

    // Draw connecting lines between nearby nodes
    ctx.lineWidth = 0.9;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const alpha = (1 - distSq / maxDistSq) * (isDark ? 0.28 : 0.18);
          ctx.strokeStyle = isDark ? `rgba(0, 229, 255, ${alpha})` : `rgba(0, 180, 216, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const n of nodes) {
      const pulse = Math.sin(this.time * 2 + n.pulseOffset) * 0.5 + 1.0;
      ctx.fillStyle = isDark ? 'rgba(0, 229, 255, 0.75)' : 'rgba(0, 180, 216, 0.75)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // C. EMERALD DEPTH (Events & Reunions)
  // Deep forest green gradients and sweeping topographic contour lines
  // =========================================================================
  _renderTopographic(palette, isDark, w, h) {
    const ctx = this.ctx;
    const t = this.time;

    // Corner emerald ambient illumination
    const glow = ctx.createRadialGradient(w * 0.15, h * 0.85, 50, w * 0.2, h * 0.8, w * 0.7);
    glow.addColorStop(0, palette.ambient2);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // 4 Topographic curved contour ribbons
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      const offset = i * 45;
      const alpha = isDark ? (0.22 - i * 0.04) : (0.16 - i * 0.03);
      ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
      ctx.beginPath();

      const baseElevation = h * 0.55 + offset;
      ctx.moveTo(0, baseElevation);

      for (let x = 0; x <= w; x += 30) {
        const y = baseElevation +
          Math.sin(x * 0.003 + t * 0.8 + i) * 35 +
          Math.cos(x * 0.006 - t * 0.5) * 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // =========================================================================
  // D. COSMIC VIOLET (Mentorship & Direct Messaging)
  // Intimate royal purple & lavender nebula clouds with drifting light dust
  // =========================================================================
  _renderCosmic(palette, isDark, w, h) {
    const ctx = this.ctx;
    const t = this.time;

    // Dual drifting nebula centers
    const cx1 = w * 0.35 + Math.sin(t * 0.6) * 60;
    const cy1 = h * 0.35 + Math.cos(t * 0.5) * 40;
    const neb1 = ctx.createRadialGradient(cx1, cy1, 30, cx1, cy1, w * 0.5);
    neb1.addColorStop(0, palette.ambient2);
    neb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, w, h);

    const cx2 = w * 0.75 + Math.cos(t * 0.5) * 50;
    const cy2 = h * 0.7 + Math.sin(t * 0.7) * 45;
    const neb2 = ctx.createRadialGradient(cx2, cy2, 40, cx2, cy2, w * 0.45);
    neb2.addColorStop(0, palette.ambient3);
    neb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, w, h);

    // Floating stardust motes
    for (const m of this.cosmicMotes) {
      m.y -= m.speed;
      if (m.y < 0) {
        m.y = h;
        m.x = Math.random() * w;
      }
      ctx.fillStyle = isDark ? `rgba(192, 132, 252, ${m.alpha})` : `rgba(139, 92, 246, ${m.alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // E. LIQUID TEAL (Opportunities & Career Growth Tracker)
  // Organic fluid sine mesh, moving current of turquoise & deep teal
  // =========================================================================
  _renderLiquid(palette, isDark, w, h) {
    const ctx = this.ctx;
    const t = this.time;

    // Atmospheric flow glow
    const flowGlow = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.6);
    flowGlow.addColorStop(0, palette.ambient2);
    flowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flowGlow;
    ctx.fillRect(0, 0, w, h);

    // Liquid Mesh Streams
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.52, 65, 0.0035, t * 1.1,
      isDark ? 'rgba(20, 184, 166, 0.20)' : 'rgba(20, 184, 166, 0.12)',
      'rgba(0, 0, 0, 0)'
    );

    this._drawFlowingWave(
      ctx, w, h,
      h * 0.40, 50, 0.005, t * 0.8 + 1.5,
      isDark ? 'rgba(6, 182, 212, 0.18)' : 'rgba(6, 182, 212, 0.10)',
      'rgba(0, 0, 0, 0)'
    );
  }

  // =========================================================================
  // F. DIGITAL INTELLIGENCE (Analytics, Achievements, Batches, Resources)
  // Cybernetic dot-matrix wave, data telemetry pulse (never obscures UI)
  // =========================================================================
  _renderDigital(palette, isDark, w, h) {
    const ctx = this.ctx;
    const t = this.time;

    // Dot-matrix wave in lower third
    for (const dot of this.matrixDots) {
      const wave = Math.sin(dot.phase + t * 1.5) * 16;
      const y = dot.baseY + wave;
      const alpha = isDark ? 0.25 + (wave / 32) * 0.2 : 0.18 + (wave / 32) * 0.15;

      ctx.fillStyle = isDark ? `rgba(99, 102, 241, ${alpha})` : `rgba(79, 70, 229, ${alpha})`;
      ctx.beginPath();
      ctx.arc(dot.x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Faint horizontal telemetry grid lines
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.08)' : 'rgba(99, 102, 241, 0.08)';
    for (let y = h * 0.65; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // =========================================================================
  // G. OBSIDIAN SHADOW (Settings, Admin Console, Audit Logs)
  // Monolithic dark obsidian, slow sweeping spotlight sweeps in crimson & gold
  // =========================================================================
  _renderObsidian(palette, isDark, w, h) {
    const ctx = this.ctx;

    // Update spotlights
    for (const spot of this.spotlights) {
      spot.x += spot.vx;
      spot.y += spot.vy;
      if (spot.x < w * 0.1 || spot.x > w * 0.9) spot.vx *= -1;
      if (spot.y < h * 0.1 || spot.y > h * 0.9) spot.vy *= -1;
    }

    // Crimson Spotlight
    const sp1 = this.spotlights[0];
    const rad1 = ctx.createRadialGradient(sp1.x, sp1.y, 20, sp1.x, sp1.y, sp1.rad);
    rad1.addColorStop(0, palette.ambient2);
    rad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, w, h);

    // Antique Gold Spotlight
    const sp2 = this.spotlights[1];
    const rad2 = ctx.createRadialGradient(sp2.x, sp2.y, 20, sp2.x, sp2.y, sp2.rad);
    rad2.addColorStop(0, palette.ambient3);
    rad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad2;
    ctx.fillRect(0, 0, w, h);
  }

  // =========================================================================
  // H. STELLAR GENESIS (Landing & Auth)
  // Dynamic Multi-Layer Cinematic Environment:
  // - Flowing Dual-Bloom Aurora Waves (Electric Cyan & Deep Royal Azure)
  // - Visibly Dynamic Constellation Particles with multi-directional drift & beacon halos
  // - Inter-Node Network Telemetry Links
  // - Travelling Energy Packets (Light Pulses) along connected vectors
  // - Multi-Harmonic Horizontal Wave Ribbons
  // - Smooth Mouse Parallax Depth
  // =========================================================================
  _renderStellar(palette, isDark, w, h) {
    const ctx = this.ctx;
    const reduced = this.prefersReducedMotion;
    const t = this.time * 2.2;
    const mx = reduced ? 0 : (this.mouse ? this.mouse.x : 0);
    const my = reduced ? 0 : (this.mouse ? this.mouse.y : 0);

    // 1. Flowing Aurora Waves (Morphing ambient light bloom behind hero section)
    // Cyan Aurora Bloom (drifting with slow harmonic oscillation)
    const aurora1X = w * (0.5 + Math.sin(t * 0.45) * 0.14) + mx * 35;
    const aurora1Y = h * 0.22 + Math.cos(t * 0.38) * 35 + my * 25;
    const aurora1R = Math.max(w, h) * (0.55 + Math.sin(t * 0.3) * 0.06);
    const rad1 = ctx.createRadialGradient(aurora1X, aurora1Y, 40, aurora1X, aurora1Y, aurora1R);
    rad1.addColorStop(0, isDark ? 'rgba(14, 165, 233, 0.28)' : 'rgba(14, 165, 233, 0.16)');
    rad1.addColorStop(0.4, isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)');
    rad1.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, w, h);

    // Royal Azure Counter-Bloom
    const aurora2X = w * (0.65 + Math.cos(t * 0.4) * 0.15) + mx * 25;
    const aurora2Y = h * 0.32 + Math.sin(t * 0.48) * 40 + my * 20;
    const aurora2R = Math.max(w, h) * (0.50 + Math.cos(t * 0.35) * 0.05);
    const rad2 = ctx.createRadialGradient(aurora2X, aurora2Y, 30, aurora2X, aurora2Y, aurora2R);
    rad2.addColorStop(0, isDark ? 'rgba(37, 99, 235, 0.24)' : 'rgba(37, 99, 235, 0.12)');
    rad2.addColorStop(0.5, isDark ? 'rgba(29, 78, 216, 0.11)' : 'rgba(29, 78, 216, 0.06)');
    rad2.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad2;
    ctx.fillRect(0, 0, w, h);

    // Deep Horizon Ambient Base Glow
    const horizonX = w * 0.5 + mx * 15;
    const horizonY = h * 0.88 + my * 12;
    const horizonR = w * 0.75;
    const radHorizon = ctx.createRadialGradient(horizonX, horizonY, 20, horizonX, horizonY, horizonR);
    radHorizon.addColorStop(0, isDark ? 'rgba(2, 132, 199, 0.20)' : 'rgba(2, 132, 199, 0.10)');
    radHorizon.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radHorizon;
    ctx.fillRect(0, 0, w, h);

    // 2. Multi-Harmonic Flowing Energy Wave Ribbons
    // Upper Cyan Fluid Wave Ribbon
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.56 + Math.sin(t * 0.5) * 20, 65, 0.0022, t * 1.3,
      isDark ? 'rgba(6, 182, 212, 0.20)' : 'rgba(6, 182, 212, 0.10)',
      'rgba(0, 0, 0, 0)'
    );

    // Deep Azure Counter Wave Ribbon
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.44 + Math.cos(t * 0.45) * 25, 75, 0.0028, t * 1.0 + 2.0,
      isDark ? 'rgba(37, 99, 235, 0.16)' : 'rgba(37, 99, 235, 0.08)',
      'rgba(0, 0, 0, 0)'
    );

    // Lower Cyan Horizon Wave Ribbon
    this._drawFlowingWave(
      ctx, w, h,
      h * 0.72 + Math.sin(t * 0.6 + 1.2) * 15, 45, 0.0018, t * 0.8 + 4.0,
      isDark ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.07)',
      'rgba(0, 0, 0, 0)'
    );

    // 3. Floating Particles & Active Network Connections
    const activePairs = [];
    if (this.stellarMotes && this.stellarMotes.length > 0) {
      const motePositions = [];

      // Update positions and render nodes
      for (let i = 0; i < this.stellarMotes.length; i++) {
        const m = this.stellarMotes[i];
        if (!reduced) {
          m.x += m.vx;
          m.y += m.vy;
          // Wrap around seamlessly
          if (m.y < -20) {
            m.y = h + 20;
            m.x = Math.random() * w;
          }
          if (m.y > h + 20) {
            m.y = -20;
            m.x = Math.random() * w;
          }
          if (m.x < -20) m.x = w + 20;
          if (m.x > w + 20) m.x = -20;
        }

        // Apply 3D Parallax offset based on depth
        const depth = m.depth || 0.5;
        const posX = m.x + mx * 35 * depth;
        const posY = m.y + my * 25 * depth;
        motePositions.push({ x: posX, y: posY, m });

        const pulse = Math.sin(t * 3.2 + m.pulsePhase) * 0.35 + 0.65;
        const alpha = (isDark ? 0.85 : 0.55) * pulse;
        const baseColor = m.cyanRatio > 0.4 ? '0, 229, 255' : '59, 130, 246';

        // Radiant halo for beacon nodes
        if (m.isBeacon) {
          ctx.beginPath();
          ctx.arc(posX, posY, m.radius * (1.8 + pulse * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${baseColor}, ${alpha * 0.25})`;
          ctx.fill();
        }

        // Core Particle
        ctx.beginPath();
        ctx.arc(posX, posY, m.radius * (reduced ? 1.0 : (0.85 + 0.25 * pulse)), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor}, ${alpha})`;
        ctx.fill();
      }

      // Draw Network Connections between nearby nodes (threshold ~115px)
      const maxDist = 115;
      const maxDistSq = maxDist * maxDist;
      for (let i = 0; i < motePositions.length; i++) {
        const p1 = motePositions[i];
        for (let j = i + 1; j < motePositions.length; j++) {
          const p2 = motePositions[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const linkAlpha = (1 - dist / maxDist) * (isDark ? 0.26 : 0.14);
            ctx.strokeStyle = `rgba(0, 229, 255, ${linkAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            activePairs.push({ p1, p2, dist });
          }
        }
      }

      // 4. Travelling Light Pulses along Connected Lines
      if (!reduced && this.stellarPulses && activePairs.length > 0) {
        for (let k = 0; k < this.stellarPulses.length; k++) {
          const pulse = this.stellarPulses[k];
          if (!pulse.active) {
            if (pulse.cooldown > 0) {
              pulse.cooldown--;
            } else {
              // Pick a random active pair
              const pair = activePairs[Math.floor(Math.random() * activePairs.length)];
              pulse.p1 = pair.p1;
              pulse.p2 = pair.p2;
              pulse.progress = 0;
              pulse.active = true;
            }
          }

          if (pulse.active && pulse.p1 && pulse.p2) {
            pulse.progress += pulse.speed;
            if (pulse.progress >= 1.0) {
              pulse.active = false;
              pulse.cooldown = Math.floor(Math.random() * 30 + 10);
            } else {
              // Interpolate position along link vector
              const px = pulse.p1.x + (pulse.p2.x - pulse.p1.x) * pulse.progress;
              const py = pulse.p1.y + (pulse.p2.y - pulse.p1.y) * pulse.progress;

              // Glowing energy packet
              ctx.beginPath();
              ctx.arc(px, py, 5, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
              ctx.fill();

              ctx.beginPath();
              ctx.arc(px, py, 2.2, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
            }
          }
        }
      }
    }
  }

  // Helper to render smooth flowing wave ribbon
  _drawFlowingWave(ctx, w, h, baseY, amplitude, freq, phase, colorTop, colorBottom) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);

    for (let x = 0; x <= w; x += 25) {
      const y = baseY +
        Math.sin(x * freq + phase) * amplitude +
        Math.cos(x * freq * 1.5 - phase * 0.8) * (amplitude * 0.4);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY - amplitude, 0, baseY + amplitude * 1.5);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this._boundResize);
    document.removeEventListener('visibilitychange', this._boundVisibility);
    window.removeEventListener('themechange', this._boundThemeChange);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
  }
}

export const nexusBackground = new NexusBackgroundEngine();

