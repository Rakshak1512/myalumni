/**
 * Rule-Based Career Guide Page
 * Transparent, deterministic industry roadmaps and interview preparation guides.
 * NO LLM APIs, NO AI chatbot.
 */
import { api } from '../services/api.js';

export async function renderCareerGuidePage() {
  return `
    <div>
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <h1 style="font-size: 24px; font-weight: 800; color: var(--navy-900);">Rule-Based Career Guide</h1>
          <span class="badge badge-teal">Deterministic & Transparent</span>
        </div>
        <p style="color: var(--slate-500); font-size: 14px;">
          Curated industry preparation roadmaps, interview tactics, and resume rules verified by alumni practitioners.
        </p>
      </div>

      <!-- Track Switcher -->
      <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; flex-wrap: wrap;">
        <button type="button" class="btn btn-outline track-tab active" data-track="software_engineering">
          Software & Full-Stack
        </button>
        <button type="button" class="btn btn-outline track-tab" data-track="data_science">
          Data Science & AI
        </button>
        <button type="button" class="btn btn-outline track-tab" data-track="cloud_devops">
          Cloud Engineering & DevOps
        </button>
        <button type="button" class="btn btn-outline track-tab" data-track="cybersecurity">
          Cybersecurity & Security
        </button>
      </div>

      <div id="career-guide-content">
        <div style="text-align: center; padding: 40px; color: var(--slate-400);">Loading career guide catalog...</div>
      </div>
    </div>
  `;
}

export async function initCareerGuidePage() {
  const container = document.getElementById('career-guide-content');
  const tabs = document.querySelectorAll('.track-tab');
  let currentTrack = 'software_engineering';
  let catalog = {};

  try {
    const res = await api.getCareerGuide();
    catalog = res.data || {};
  } catch (e) {
    container.innerHTML = `<p style="color: var(--color-danger);">Failed to load career guide catalog.</p>`;
    return;
  }

  const renderTrack = (trackKey) => {
    const data = catalog[trackKey];
    if (!data) {
      container.innerHTML = `<p>Track data not found.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--teal-600);">
        <h2 style="font-size: 22px; font-weight: 800; color: var(--navy-900); margin-bottom: 6px;">${escapeHtml(data.title)}</h2>
        <p style="color: var(--slate-600); font-size: 14px;">${escapeHtml(data.description)}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        <!-- Core Skills -->
        <div class="card">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
            <span style="font-size: 20px;">⚡</span>
            <h3 class="card-title">Essential Technical Skills</h3>
          </div>
          <ul style="padding-left: 20px; font-size: 14px; color: var(--slate-700); line-height: 1.8;">
            ${(data.skillsToLearn || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>

        <!-- Project Ideas -->
        <div class="card">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
            <span style="font-size: 20px;">🛠</span>
            <h3 class="card-title">High-Impact Project Ideas</h3>
          </div>
          <ul style="padding-left: 20px; font-size: 14px; color: var(--slate-700); line-height: 1.8;">
            ${(data.projectIdeas || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>

        <!-- Interview Preparation -->
        <div class="card">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
            <span style="font-size: 20px;">🎯</span>
            <h3 class="card-title">Interview Strategies</h3>
          </div>
          <ul style="padding-left: 20px; font-size: 14px; color: var(--slate-700); line-height: 1.8;">
            ${(data.interviewPrep || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}
          </ul>
        </div>

        <!-- Resume Bullet Rules -->
        <div class="card">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
            <span style="font-size: 20px;">📝</span>
            <h3 class="card-title">Resume & Portfolio Rules</h3>
          </div>
          <ul style="padding-left: 20px; font-size: 14px; color: var(--slate-700); line-height: 1.8;">
            ${(data.resumeTips || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTrack = tab.getAttribute('data-track');
      renderTrack(currentTrack);
    });
  });

  // Initial render
  renderTrack(currentTrack);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

