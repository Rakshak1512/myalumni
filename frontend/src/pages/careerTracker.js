/**
 * Career Growth Tracker Page
 */
import { api } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { renderAboutButton } from '../components/featureHelp.js';

export async function renderCareerTrackerPage() {
  return `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: var(--text-heading);">Career Growth Tracker</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Set ambitious career targets, complete milestones, and showcase technical projects.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          ${renderAboutButton('career-tracker')}
          <button type="button" id="new-goal-btn" class="btn btn-primary" data-tooltip="Define measurable career milestone">+ Set Career Goal</button>
          <button type="button" id="new-proj-btn" class="btn btn-outline" data-tooltip="Showcase technical portfolio project">+ Add Project</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        <!-- Left: Goals & Milestones -->
        <div>
          <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
              <h2 class="card-title">Target Goals & Milestones</h2>
            </div>
            <div id="goals-container" style="display: flex; flex-direction: column; gap: 20px;">
              <div style="color: var(--slate-400); text-align: center; padding: 30px;">Loading career goals...</div>
            </div>
          </div>
        </div>

        <!-- Right: Technical Projects & Certifications -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Portfolio Projects</h3>
            </div>
            <div id="projects-container" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="color: var(--slate-400); text-align: center; padding: 20px;">Loading projects...</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Certifications</h3>
              <button type="button" id="new-cert-btn" class="btn btn-outline btn-sm">+ Add</button>
            </div>
            <div id="certs-container" style="display: flex; flex-direction: column; gap: 10px;">
              <div style="color: var(--slate-400); text-align: center; padding: 20px;">Loading certifications...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initCareerTrackerPage() {
  const goalsContainer = document.getElementById('goals-container');
  const projsContainer = document.getElementById('projects-container');
  const certsContainer = document.getElementById('certs-container');
  const newGoalBtn = document.getElementById('new-goal-btn');
  const newProjBtn = document.getElementById('new-proj-btn');
  const newCertBtn = document.getElementById('new-cert-btn');

  const loadAll = async () => {
    try {
      const [gRes, pRes, cRes] = await Promise.all([
        api.getGoals().catch(() => ({ data: [] })),
        api.getProjects().catch(() => ({ data: [] })),
        api.getCertifications().catch(() => ({ data: [] }))
      ]);

      renderGoals(gRes.data || []);
      renderProjects(pRes.data || []);
      renderCertifications(cRes.data || []);
    } catch (e) {
      goalsContainer.innerHTML = `<p style="color: var(--color-danger);">Failed to load career records.</p>`;
    }
  };

  const renderGoals = (goals) => {
    if (goals.length === 0) {
      goalsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-title">No career goals set yet</div>
          <p>Create your first career milestone target (e.g. "Land Cloud Systems Role").</p>
        </div>
      `;
      return;
    }

    goalsContainer.innerHTML = goals.map(g => {
      const milestones = g.milestones || [];
      const pct = g.progressPercentage || 0;

      return `
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 700; color: var(--navy-900);">${escapeHtml(g.title)}</h3>
              <div style="font-size: 13px; color: var(--teal-700); font-weight: 600;">
                Target: ${escapeHtml(g.targetRole)} • Deadline: ${g.targetDate || 'Ongoing'}
              </div>
            </div>
            <span class="badge ${pct === 100 ? 'badge-emerald' : 'badge-teal'}">${pct}% Achieved</span>
          </div>

          <div class="progress-container">
            <div class="progress-bar" style="width: ${pct}%;"></div>
          </div>

          ${g.description ? `<p style="font-size: 13px; color: var(--slate-600); margin: 10px 0;">${escapeHtml(g.description)}</p>` : ''}

          <!-- Milestones List -->
          <div style="margin-top: 14px; border-top: 1px solid var(--border-color); padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: 12px; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">Milestones (${milestones.filter(m => m.isCompleted).length}/${milestones.length})</div>
              <button type="button" class="btn btn-outline btn-sm add-milestone-btn" data-goal-id="${g.id}" style="padding: 2px 8px; font-size: 11px;">+ Milestone</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${milestones.map(m => `
                <label style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--slate-800); cursor: pointer; padding: 4px 0;">
                  <input type="checkbox" class="milestone-toggle" data-id="${m.id}" ${m.isCompleted ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--teal-600);">
                  <span style="${m.isCompleted ? 'text-decoration: line-through; color: var(--slate-400);' : ''}">${escapeHtml(m.title)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Wire milestone checkboxes
    document.querySelectorAll('.milestone-toggle').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = chk.getAttribute('data-id');
        const isDone = chk.checked;
        try {
          await api.toggleMilestone(id, isDone);
          loadAll();
        } catch (e) {
          showToast(e.message || 'Error updating milestone', 'error');
        }
      });
    });

    // Wire add milestone
    document.querySelectorAll('.add-milestone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const goalId = btn.getAttribute('data-goal-id');
        openAddMilestoneModal(goalId);
      });
    });
  };

  const renderProjects = (projects) => {
    if (projects.length === 0) {
      projsContainer.innerHTML = `<p style="font-size: 13px; color: var(--slate-400); text-align: center;">No projects added.</p>`;
      return;
    }

    projsContainer.innerHTML = projects.map(p => `
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <strong style="color: var(--navy-900); font-size: 14px;">${escapeHtml(p.title)}</strong>
          <button type="button" class="del-proj-btn" data-id="${p.id}" style="background: none; border: none; cursor: pointer; color: var(--slate-400);" title="Delete">✕</button>
        </div>
        <p style="font-size: 12px; color: var(--slate-600); margin: 6px 0;">${escapeHtml(p.description)}</p>
        <div style="display: flex; gap: 8px; font-size: 12px;">
          ${p.githubUrl ? `<a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--teal-600);">GitHub ↗</a>` : ''}
          ${p.projectUrl ? `<a href="${escapeHtml(p.projectUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--teal-600);">Live Demo ↗</a>` : ''}
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.del-proj-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this project?')) {
          await api.deleteProject(id);
          showToast('Project deleted.', 'info');
          loadAll();
        }
      });
    });
  };

  const renderCertifications = (certs) => {
    if (certs.length === 0) {
      certsContainer.innerHTML = `<p style="font-size: 13px; color: var(--slate-400); text-align: center;">No certifications added.</p>`;
      return;
    }

    certsContainer.innerHTML = certs.map(c => `
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 12px;">
        <div style="font-weight: 700; font-size: 13px; color: var(--navy-900);">${escapeHtml(c.name)}</div>
        <div style="font-size: 12px; color: var(--slate-500);">${escapeHtml(c.issuingOrganization)} • ${c.issueDate || ''}</div>
      </div>
    `).join('');
  };

  // Add Goal Modal
  if (newGoalBtn) {
    newGoalBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="g-title">Goal Title</label>
          <input type="text" id="g-title" class="form-control" placeholder="e.g. Pass Cloud Associate Certification & Land Role" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="g-role">Target Role</label>
          <input type="text" id="g-role" class="form-control" placeholder="e.g. Cloud Software Engineer" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="g-date">Target Date</label>
          <input type="date" id="g-date" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label" for="g-desc">Description</label>
          <textarea id="g-desc" class="form-control" placeholder="Describe the focus areas, interview milestones, and study schedule..."></textarea>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-goal-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-goal-btn">Create Goal</button>
      `;

      const { close } = openModal({ title: 'Set New Career Target', contentHtml: content, footerHtml: footer });

      document.getElementById('cancel-goal-btn').addEventListener('click', close);
      document.getElementById('save-goal-btn').addEventListener('click', async () => {
        const title = document.getElementById('g-title').value.trim();
        const targetRole = document.getElementById('g-role').value.trim();
        const targetDate = document.getElementById('g-date').value;
        const description = document.getElementById('g-desc').value.trim();

        if (!title || !targetRole) {
          showToast('Title and target role are required.', 'error');
          return;
        }

        try {
          await api.createGoal({ title, targetRole, targetDate, description });
          showToast('Career goal created!', 'success');
          close();
          loadAll();
        } catch (e) {
          showToast(e.message || 'Failed to create goal.', 'error');
        }
      });
    });
  }

  // Add Milestone Modal
  const openAddMilestoneModal = (goalId) => {
    const content = `
      <div class="form-group">
        <label class="form-label" for="m-title">Milestone Objective</label>
        <input type="text" id="m-title" class="form-control" placeholder="e.g. Complete Docker and Kubernetes Udemy course" required>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-outline" id="cancel-m-btn">Cancel</button>
      <button type="button" class="btn btn-primary" id="save-m-btn">Add Milestone</button>
    `;

    const { close } = openModal({ title: 'Add Measurable Milestone', contentHtml: content, footerHtml: footer });

    document.getElementById('cancel-m-btn').addEventListener('click', close);
    document.getElementById('save-m-btn').addEventListener('click', async () => {
      const title = document.getElementById('m-title').value.trim();
      if (!title) return;
      try {
        await api.addMilestone(goalId, title);
        showToast('Milestone added!', 'success');
        close();
        loadAll();
      } catch (e) {
        showToast(e.message || 'Failed to add milestone.', 'error');
      }
    });
  };

  // Add Project Modal
  if (newProjBtn) {
    newProjBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="p-title">Project Title</label>
          <input type="text" id="p-title" class="form-control" placeholder="e.g. Distributed Task Pool" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="p-desc">Project Description</label>
          <textarea id="p-desc" class="form-control" placeholder="Key architecture, problems solved, and scale..." required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="p-tech">Technologies (Comma separated)</label>
          <input type="text" id="p-tech" class="form-control" placeholder="Go, Redis, Docker, GCP">
        </div>
        <div class="form-group">
          <label class="form-label" for="p-github">GitHub Repository Link</label>
          <input type="text" id="p-github" class="form-control" placeholder="https://github.com/...">
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-p-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-p-btn">Add Project</button>
      `;

      const { close } = openModal({ title: 'Add Portfolio Project', contentHtml: content, footerHtml: footer });

      document.getElementById('cancel-p-btn').addEventListener('click', close);
      document.getElementById('save-p-btn').addEventListener('click', async () => {
        const title = document.getElementById('p-title').value.trim();
        const description = document.getElementById('p-desc').value.trim();
        const techStr = document.getElementById('p-tech').value.trim();
        const githubUrl = document.getElementById('p-github').value.trim();

        if (!title || !description) {
          showToast('Title and description are required.', 'error');
          return;
        }

        try {
          await api.addProject({
            title, description,
            technologies: techStr.split(',').map(s => s.trim()).filter(Boolean),
            githubUrl
          });
          showToast('Project added to portfolio!', 'success');
          close();
          loadAll();
        } catch (e) {
          showToast(e.message || 'Failed to add project.', 'error');
        }
      });
    });
  }

  // Add Certification Modal
  if (newCertBtn) {
    newCertBtn.addEventListener('click', () => {
      const content = `
        <div class="form-group">
          <label class="form-label" for="c-name">Certification Name</label>
          <input type="text" id="c-name" class="form-control" placeholder="e.g. AWS Solutions Architect Associate" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="c-org">Issuing Organization</label>
          <input type="text" id="c-org" class="form-control" placeholder="e.g. Amazon Web Services" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="c-date">Issue Date</label>
          <input type="date" id="c-date" class="form-control">
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-outline" id="cancel-c-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-c-btn">Save Credential</button>
      `;

      const { close } = openModal({ title: 'Add Certification', contentHtml: content, footerHtml: footer });

      document.getElementById('cancel-c-btn').addEventListener('click', close);
      document.getElementById('save-c-btn').addEventListener('click', async () => {
        const name = document.getElementById('c-name').value.trim();
        const org = document.getElementById('c-org').value.trim();
        const dateStr = document.getElementById('c-date').value;

        if (!name || !org) {
          showToast('Name and issuing organization are required.', 'error');
          return;
        }

        try {
          await api.addCertification({ name, issuingOrganization: org, issueDate: dateStr });
          showToast('Certification added!', 'success');
          close();
          loadAll();
        } catch (e) {
          showToast(e.message || 'Failed to add certification.', 'error');
        }
      });
    });
  }

  // Initial load
  loadAll();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

