/**
 * Universal File Uploader Component for MyAlumni 2.0 (NEXUS Cinematic UI)
 * Reusable drag-and-drop file upload component supporting direct device upload,
 * real-time upload progress, file preview, replacement, cancellation,
 * and optional external URL attachment.
 */

import { api } from '../services/api.js';
import { showToast } from './toast.js';

// Category file-type presets
export const UPLOAD_PRESETS = {
  resources: {
    accept: '.pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ods,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mp3,.wav,.zip,.7z',
    label: 'Documents (PDF, Office), Media (Audio, Video), or Archives (ZIP)',
    maxMB: 50
  },
  resumes: {
    accept: '.pdf,.docx,.doc',
    label: 'PDF or Word Document (Max 10 MB)',
    maxMB: 10
  },
  certificates: {
    accept: '.pdf,.jpg,.jpeg,.png,.webp',
    label: 'PDF Certificate or Photo Proof (Max 15 MB)',
    maxMB: 15
  },
  achievements: {
    accept: '.pdf,.jpg,.jpeg,.png,.webp',
    label: 'PDF Certificate or Photo Proof (Max 15 MB)',
    maxMB: 15
  },
  photos: {
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    label: 'JPG, PNG, WEBP, or GIF Image (Max 8 MB)',
    maxMB: 8
  },
  events: {
    accept: 'image/jpeg,image/png,image/webp,.pdf',
    label: 'Poster Image (JPG, PNG, WEBP) or Schedule PDF (Max 8 MB)',
    maxMB: 8
  },
  tickets: {
    accept: 'image/jpeg,image/png,image/webp,.pdf,.txt,.log',
    label: 'Screenshot (JPG, PNG) or Diagnostic Log / PDF (Max 10 MB)',
    maxMB: 10
  }
};

/**
 * Returns appropriate icon SVG for given file extension / MIME
 */
export function getFileIcon(filename = '', mimeType = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || mimeType.startsWith('image/')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #06b6d4;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;
  }
  if (['doc', 'docx', 'rtf', 'odt', 'txt'].includes(ext) || mimeType.includes('word') || mimeType.includes('text')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mimeType.includes('sheet') || mimeType.includes('csv')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`;
  }
  if (['ppt', 'pptx', 'odp'].includes(ext) || mimeType.includes('presentation')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f97316;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>`;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mimeType.startsWith('video/')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #a855f7;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
  }
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext) || mimeType.startsWith('audio/')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ec4899;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  }
  if (['zip', '7z', 'rar', 'tar', 'gz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #eab308;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>`;
  }
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--cyan-400, #38bdf8);"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/**
 * Creates and mounts a Universal File Uploader into a target container element.
 * 
 * @param {Object} options
 * @param {HTMLElement} options.container - DOM container element
 * @param {string} [options.category='resources'] - Upload category
 * @param {string} [options.accept] - Accepted file extensions/MIMEs
 * @param {boolean} [options.multiple=false] - Allow multiple files
 * @param {boolean} [options.isPrivate=false] - Store as private/authenticated
 * @param {string} [options.relatedModule] - Module name (e.g. 'resources', 'opportunities')
 * @param {string} [options.relatedId] - Related record ID
 * @param {string} [options.initialUrl] - Pre-existing URL (for edit forms)
 * @param {string} [options.initialFilename] - Pre-existing filename
 * @param {Function} [options.onUploadSuccess] - Callback when file or URL is confirmed
 * @param {Function} [options.onClear] - Callback when attachment is cleared
 */
export function createUniversalFileUploader({
  container,
  category = 'resources',
  accept,
  multiple = false,
  isPrivate = false,
  relatedModule = '',
  relatedId = '',
  initialUrl = '',
  initialFilename = '',
  onUploadSuccess = () => {},
  onClear = () => {}
}) {
  if (!container) return null;

  const preset = UPLOAD_PRESETS[category] || UPLOAD_PRESETS.resources;
  const acceptedTypes = accept || preset.accept;
  const maxMB = preset.maxMB;
  const instanceId = 'ufu_' + Math.random().toString(36).substring(2, 9);

  let currentMode = 'upload'; // 'upload' | 'url'
  let uploadedData = initialUrl ? {
    fileUrl: initialUrl,
    originalFilename: initialFilename || initialUrl,
    fileSizeFormatted: 'Attached URL',
    isExternalUrl: true
  } : null;

  // Render Component Template
  container.innerHTML = `
    <div class="universal-uploader-wrapper" id="${instanceId}-wrapper" style="
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid rgba(56, 189, 248, 0.15);
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      font-family: inherit;
    ">
      <!-- Mode Tabs (Upload vs URL) -->
      <div style="display: flex; gap: 8px; margin-bottom: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px;">
        <button type="button" id="${instanceId}-tab-upload" class="btn btn-sm ufu-tab-btn" style="
          background: ${currentMode === 'upload' ? 'rgba(56, 189, 248, 0.18)' : 'transparent'};
          color: ${currentMode === 'upload' ? '#38bdf8' : 'var(--text-muted, #94a3b8)'};
          border: 1px solid ${currentMode === 'upload' ? 'rgba(56, 189, 248, 0.4)' : 'transparent'};
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload from Device
        </button>
        <button type="button" id="${instanceId}-tab-url" class="btn btn-sm ufu-tab-btn" style="
          background: ${currentMode === 'url' ? 'rgba(56, 189, 248, 0.18)' : 'transparent'};
          color: ${currentMode === 'url' ? '#38bdf8' : 'var(--text-muted, #94a3b8)'};
          border: 1px solid ${currentMode === 'url' ? 'rgba(56, 189, 248, 0.4)' : 'transparent'};
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Add External URL
        </button>
      </div>

      <!-- OPTION A: Dropzone Section -->
      <div id="${instanceId}-upload-section" style="display: ${currentMode === 'upload' ? 'block' : 'none'};">
        <div id="${instanceId}-dropzone" role="button" tabindex="0" aria-label="Choose a file to upload" aria-describedby="${instanceId}-upload-help" style="
          border: 2px dashed rgba(56, 189, 248, 0.35);
          border-radius: 10px;
          padding: 24px 16px;
          text-align: center;
          background: rgba(15, 23, 42, 0.3);
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
        ">
          <input type="file" id="${instanceId}-file-input" ${multiple ? 'multiple' : ''} accept="${acceptedTypes}" style="display: none;" />
          
          <div style="margin-bottom: 8px; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(56, 189, 248, 0.1); color: #38bdf8;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          
          <div style="font-weight: 600; font-size: 14px; color: var(--text-normal, #f1f5f9); margin-bottom: 4px;">
            Choose a file or drag & drop here
          </div>
          <div id="${instanceId}-upload-help" style="font-size: 12px; color: var(--text-muted, #94a3b8); margin-bottom: 8px;">
            ${preset.label}
          </div>
          <div style="display: inline-block; font-size: 11px; padding: 3px 8px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border-radius: 12px; font-weight: 500;">
            Max file size: ${maxMB} MB
          </div>
        </div>
      </div>

      <!-- OPTION B: URL Input Section -->
      <div id="${instanceId}-url-section" style="display: ${currentMode === 'url' ? 'block' : 'none'};">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="url" id="${instanceId}-url-input" class="form-control" placeholder="https://drive.google.com/... or https://github.com/..." value="${initialUrl || ''}" style="
            flex: 1;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 8px;
            padding: 8px 12px;
            color: #fff;
            font-size: 13px;
          " />
          <button type="button" id="${instanceId}-save-url-btn" class="btn btn-primary btn-sm" style="
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            border: none;
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            white-space: nowrap;
            cursor: pointer;
          ">
            Attach Link
          </button>
        </div>
      </div>

      <!-- Real-time Progress Bar -->
      <div id="${instanceId}-progress-wrapper" style="display: none; margin-top: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #38bdf8; font-weight: 600; margin-bottom: 4px;">
          <span id="${instanceId}-progress-label">Uploading...</span>
          <span id="${instanceId}-progress-pct">0%</span>
        </div>
        <div style="height: 6px; width: 100%; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
          <div id="${instanceId}-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #38bdf8, #818cf8); transition: width 0.15s ease;"></div>
        </div>
      </div>

      <!-- Uploaded / Selected File Preview Card -->
      <div id="${instanceId}-file-card" style="display: ${uploadedData ? 'flex' : 'none'}; align-items: center; justify-content: space-between; margin-top: 14px; padding: 12px 14px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <div id="${instanceId}-icon-container" style="flex-shrink: 0;">
            ${uploadedData ? getFileIcon(uploadedData.originalFilename || uploadedData.fileUrl) : ''}
          </div>
          <div style="min-width: 0;">
            <div id="${instanceId}-filename" style="font-size: 13px; font-weight: 600; color: #f1f5f9; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${uploadedData?.originalFilename || 'Uploaded Attachment'}
            </div>
            <div id="${instanceId}-filesize" style="font-size: 11px; color: var(--text-muted, #94a3b8); margin-top: 2px;">
              ${uploadedData?.fileSizeFormatted || ''}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <a id="${instanceId}-view-link" href="${uploadedData?.fileUrl || '#'}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 12px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View
          </a>
          <button type="button" id="${instanceId}-clear-btn" class="btn btn-sm" style="
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
          " title="Remove attachment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Inline Image Thumbnail Preview (for photo uploads) -->
      <div id="${instanceId}-img-preview-box" style="display: none; margin-top: 12px; text-align: center;">
        <img id="${instanceId}-img-preview" src="" alt="Preview" style="max-height: 180px; max-width: 100%; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3); object-fit: cover;" />
      </div>

      <!-- Hidden Input for Form Submission Interoperability -->
      <input type="hidden" id="${instanceId}-hidden-url" value="${initialUrl || ''}" />
      <input type="hidden" id="${instanceId}-hidden-id" value="" />
    </div>
  `;

  // Element handles
  const tabUpload = document.getElementById(`${instanceId}-tab-upload`);
  const tabUrl = document.getElementById(`${instanceId}-tab-url`);
  const uploadSection = document.getElementById(`${instanceId}-upload-section`);
  const urlSection = document.getElementById(`${instanceId}-url-section`);
  const dropzone = document.getElementById(`${instanceId}-dropzone`);
  const fileInput = document.getElementById(`${instanceId}-file-input`);
  const urlInput = document.getElementById(`${instanceId}-url-input`);
  const saveUrlBtn = document.getElementById(`${instanceId}-save-url-btn`);
  const progressWrapper = document.getElementById(`${instanceId}-progress-wrapper`);
  const progressBar = document.getElementById(`${instanceId}-progress-bar`);
  const progressPct = document.getElementById(`${instanceId}-progress-pct`);
  const progressLabel = document.getElementById(`${instanceId}-progress-label`);
  const fileCard = document.getElementById(`${instanceId}-file-card`);
  const iconContainer = document.getElementById(`${instanceId}-icon-container`);
  const filenameEl = document.getElementById(`${instanceId}-filename`);
  const filesizeEl = document.getElementById(`${instanceId}-filesize`);
  const viewLink = document.getElementById(`${instanceId}-view-link`);
  const clearBtn = document.getElementById(`${instanceId}-clear-btn`);
  const imgPreviewBox = document.getElementById(`${instanceId}-img-preview-box`);
  const imgPreview = document.getElementById(`${instanceId}-img-preview`);
  const hiddenUrl = document.getElementById(`${instanceId}-hidden-url`);
  const hiddenId = document.getElementById(`${instanceId}-hidden-id`);

  // Switch tabs
  const setMode = (mode) => {
    currentMode = mode;
    tabUpload.style.background = mode === 'upload' ? 'rgba(56, 189, 248, 0.18)' : 'transparent';
    tabUpload.style.color = mode === 'upload' ? '#38bdf8' : 'var(--text-muted, #94a3b8)';
    tabUpload.style.borderColor = mode === 'upload' ? 'rgba(56, 189, 248, 0.4)' : 'transparent';

    tabUrl.style.background = mode === 'url' ? 'rgba(56, 189, 248, 0.18)' : 'transparent';
    tabUrl.style.color = mode === 'url' ? '#38bdf8' : 'var(--text-muted, #94a3b8)';
    tabUrl.style.borderColor = mode === 'url' ? 'rgba(56, 189, 248, 0.4)' : 'transparent';

    uploadSection.style.display = mode === 'upload' ? 'block' : 'none';
    urlSection.style.display = mode === 'url' ? 'block' : 'none';
  };

  tabUpload.addEventListener('click', () => setMode('upload'));
  tabUrl.addEventListener('click', () => setMode('url'));

  // Pointer and keyboard activation both open the native file picker.
  dropzone.addEventListener('click', (event) => {
    if (event.target === fileInput) return;
    fileInput.click();
  });
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  // Drag and Drop Effects

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = '#38bdf8';
      dropzone.style.background = 'rgba(56, 189, 248, 0.12)';
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = 'rgba(56, 189, 248, 0.35)';
      dropzone.style.background = 'rgba(15, 23, 42, 0.3)';
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  });

  // Handle selected files & trigger upload
  async function handleFiles(files) {
    const file = files[0];
    if (!file) return;

    // Check size client-side
    if (file.size > maxMB * 1024 * 1024) {
      showToast(`Selected file exceeds maximum limit of ${maxMB} MB.`, 'error');
      return;
    }

    // Instant local image preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => {
        imgPreview.src = re.target.result;
        imgPreviewBox.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      imgPreviewBox.style.display = 'none';
    }

    // Start Upload
    progressWrapper.style.display = 'block';
    progressBar.style.width = '0%';
    progressPct.textContent = '0%';
    progressLabel.textContent = `Uploading ${file.name}...`;

    try {
      const res = await api.uploadUniversal(multiple ? Array.from(files) : file, category, {
        isPrivate,
        relatedModule,
        relatedId,
        onProgress: (percent) => {
          progressBar.style.width = `${percent}%`;
          progressPct.textContent = `${percent}%`;
        }
      });

      const uploaded = multiple ? res.data?.files?.[0] || res.data : res.data;
      if (!uploaded) throw new Error('Invalid upload response from server.');

      uploadedData = uploaded;
      hiddenUrl.value = uploaded.fileUrl || '';
      hiddenId.value = uploaded.id || '';

      // Update Card
      iconContainer.innerHTML = getFileIcon(uploaded.originalFilename, uploaded.mimeType);
      filenameEl.textContent = uploaded.originalFilename;
      filesizeEl.textContent = uploaded.fileSizeFormatted || formatBytes(uploaded.fileSize);
      viewLink.href = uploaded.fileUrl;
      fileCard.style.display = 'flex';

      showToast(`File "${uploaded.originalFilename}" uploaded successfully!`, 'success');
      onUploadSuccess(uploaded);

    } catch (err) {
      showToast(err.message || 'File upload failed. Please try again.', 'error');
      imgPreviewBox.style.display = 'none';
    } finally {
      setTimeout(() => {
        progressWrapper.style.display = 'none';
      }, 800);
      fileInput.value = '';
    }
  }

  // Handle External URL Option
  saveUrlBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      showToast('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }

    try {
      const res = await api.recordExternalUrl(url, category, {
        title: url,
        relatedModule,
        relatedId
      });
      const data = res.data;

      uploadedData = data;
      hiddenUrl.value = data.fileUrl;
      hiddenId.value = data.id || '';

      iconContainer.innerHTML = getFileIcon(data.fileUrl);
      filenameEl.textContent = data.originalFilename || data.fileUrl;
      filesizeEl.textContent = 'External Link';
      viewLink.href = data.fileUrl;
      fileCard.style.display = 'flex';
      imgPreviewBox.style.display = 'none';

      showToast('External link attached successfully!', 'success');
      onUploadSuccess(data);
    } catch (err) {
      showToast(err.message || 'Failed to attach external URL.', 'error');
    }
  });

  // Clear Attachment
  clearBtn.addEventListener('click', async () => {
    if (uploadedData?.id && !uploadedData?.isExternalUrl) {
      try {
        await api.deleteUpload(uploadedData.id);
      } catch (e) {
        console.warn('Could not remove file on server:', e);
      }
    }

    uploadedData = null;
    hiddenUrl.value = '';
    hiddenId.value = '';
    urlInput.value = '';
    fileCard.style.display = 'none';
    imgPreviewBox.style.display = 'none';
    onClear();
  });

  return {
    getValue: () => ({
      fileUrl: hiddenUrl.value,
      fileId: hiddenId.value,
      data: uploadedData
    }),
    setValue: (fileData) => {
      if (!fileData) {
        clearBtn.click();
        return;
      }
      uploadedData = fileData;
      hiddenUrl.value = fileData.fileUrl || '';
      hiddenId.value = fileData.id || '';
      iconContainer.innerHTML = getFileIcon(fileData.originalFilename || fileData.fileUrl);
      filenameEl.textContent = fileData.originalFilename || fileData.fileUrl;
      filesizeEl.textContent = fileData.fileSizeFormatted || '';
      viewLink.href = fileData.fileUrl || '#';
      fileCard.style.display = 'flex';
    },
    clear: () => clearBtn.click()
  };
}

