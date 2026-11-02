/**
 * Dynamic Modal Dialog Manager
 */
export function openModal({ title, contentHtml, footerHtml = '', onClose = null }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="active-modal-overlay">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h3 id="modal-title" class="card-title">${title}</h3>
          <button type="button" class="btn btn-outline btn-sm" id="modal-close-btn" aria-label="Close dialog">✕</button>
        </div>
        <div class="modal-body">
          ${contentHtml}
        </div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;

  const overlay = document.getElementById('active-modal-overlay');
  const closeBtn = document.getElementById('modal-close-btn');

  const close = () => {
    overlay.remove();
    if (onClose) onClose();
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return { close };
}

export function closeModal() {
  const overlay = document.getElementById('active-modal-overlay');
  if (overlay) overlay.remove();
}

