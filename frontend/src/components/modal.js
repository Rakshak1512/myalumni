/**
 * Accessible dynamic modal dialog manager.
 * Supports pointer, touch, keyboard Escape, focus trapping and focus restoration.
 */
export function openModal({ title, contentHtml, footerHtml = '', onClose = null }) {
  const container = document.getElementById('modal-container');
  if (!container) return null;

  const previouslyFocused = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;

  container.innerHTML = `
    <div class="modal-overlay" id="active-modal-overlay">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
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
  const dialog = overlay?.querySelector('[role="dialog"]');
  const closeBtn = document.getElementById('modal-close-btn');
  if (!overlay || !dialog || !closeBtn) return null;

  let isClosed = false;
  const getFocusable = () => Array.from(dialog.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(element => element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null);

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
    if (previouslyFocused?.isConnected) previouslyFocused.focus();
    if (onClose) onClose();
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', handleKeydown);

  const initialFocus = getFocusable()[0] || dialog;
  initialFocus.focus();

  return { close };
}

export function closeModal() {
  const overlay = document.getElementById('active-modal-overlay');
  if (overlay) {
    const closeButton = overlay.querySelector('#modal-close-btn');
    if (closeButton) closeButton.click();
    else overlay.remove();
  }
}
