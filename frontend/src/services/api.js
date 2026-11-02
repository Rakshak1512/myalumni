/**
 * Centralized API Client Service for MyAlumni 2.0
 * Connects Frontend to the Flask REST API backed by SQLite.
 */

// Read API Base URL: Vite env, or fallback to relative /api/v1 in production, localhost in development
function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const isProduction = import.meta.env.PROD || (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  );

  if (isProduction) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return '/api/v1';
    }
    return envUrl;
  }

  return envUrl || 'http://127.0.0.1:5000/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    return this.token || localStorage.getItem('myalumni_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const fallbackMsg = response.status === 500
          ? "Our server encountered a temporary issue. Please try again shortly."
          : (response.status === 502 || response.status === 504)
            ? "Email delivery service temporarily unavailable. Please try again in a moment."
            : `Request failed with status ${response.status}`;
        const errorMsg = data?.error?.message || data?.message || fallbackMsg;
        const errorObj = new Error(errorMsg);
        errorObj.status = response.status;
        errorObj.code = data?.error?.code || 'API_ERROR';
        errorObj.details = data?.error?.details || null;
        throw errorObj;
      }

      return data;
    } catch (err) {
      if (err.status === 401 && !endpoint.includes('/auth/')) {
        // Token expired or invalid
        console.warn("Unauthorized API call. Triggering session cleanup.");
      }
      throw err;
    }
  }

  // HTTP Method Helpers
  get(endpoint, params = {}) {
    const cleanParams = {};
    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null') {
          cleanParams[k] = v;
        }
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async upload(endpoint, formData) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.message || `Upload failed with status ${response.status}`;
      const errorObj = new Error(errorMsg);
      errorObj.status = response.status;
      throw errorObj;
    }

    return data;
  }

  uploadWithProgress(endpoint, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.baseUrl}${endpoint}`;
      xhr.open('POST', url, true);

      const token = this.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        let data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          data = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          const errorMsg = data?.error?.message || data?.message || `Upload failed with status ${xhr.status}`;
          const err = new Error(errorMsg);
          err.status = xhr.status;
          reject(err);
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload. Please check your connection.'));
      };

      xhr.send(formData);
    });
  }

  // --- Universal File Upload Helper Methods ---
  uploadUniversal(fileOrFiles, category = 'resources', options = {}) {
    const formData = new FormData();
    if (Array.isArray(fileOrFiles)) {
      fileOrFiles.forEach(f => formData.append('files', f));
    } else {
      formData.append('file', fileOrFiles);
    }

    formData.append('category', category);
    if (options.isPrivate) {
      formData.append('is_private', 'true');
    }
    if (options.relatedModule) {
      formData.append('related_module', options.relatedModule);
    }
    if (options.relatedId) {
      formData.append('related_id', options.relatedId);
    }

    if (options.onProgress) {
      return this.uploadWithProgress('/uploads', formData, options.onProgress);
    }
    return this.upload('/uploads', formData);
  }

  recordExternalUrl(url, category = 'resources', options = {}) {
    const formData = new FormData();
    formData.append('external_url', url);
    formData.append('category', category);
    if (options.title) formData.append('title', options.title);
    if (options.relatedModule) formData.append('related_module', options.relatedModule);
    if (options.relatedId) formData.append('related_id', options.relatedId);
    return this.upload('/uploads', formData);
  }

  deleteUpload(fileId) {
    return this.delete(`/uploads/${fileId}`);
  }

  getFileDownloadUrl(fileIdOrUrl, inline = false) {
    if (!fileIdOrUrl) return '';
    const token = this.getToken();
    let url = fileIdOrUrl;
    if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) {
      url = fileIdOrUrl;
    } else if (fileIdOrUrl.startsWith('/api/')) {
      const origin = this.baseUrl.replace(/\/api\/v1\/?$/, '');
      url = `${origin}${fileIdOrUrl}`;
    } else {
      url = `${this.baseUrl}/files/download/${fileIdOrUrl}`;
    }
    const separator = url.includes('?') ? '&' : '?';
    const params = [];
    if (inline) {
      params.push('inline=true');
    } else {
      params.push('download=true');
    }
    if (token) params.push(`token=${encodeURIComponent(token)}`);
    return params.length > 0 ? `${url}${separator}${params.join('&')}` : url;
  }

  // --- Specific API Endpoints ---
  // Health & Database
  checkHealth() {
    return this.get('/health');
  }

  checkDatabaseHealth() {
    return this.get('/health/db');
  }

  // Authentication
  login(credentials) {
    return this.post('/auth/login', credentials);
  }

  register(payload) {
    return this.post('/auth/register', payload);
  }

  verifyRegistration(payload) {
    return this.post('/auth/verify-registration', payload);
  }

  resendRegistrationOtp(email) {
    return this.post('/auth/resend-registration-otp', { email });
  }

  forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  }

  verifyForgotPasswordOtp(payload) {
    return this.post('/auth/verify-forgot-password-otp', payload);
  }

  resetPassword(payload) {
    return this.post('/auth/reset-password', payload);
  }

  testUserOtpRequest(email) {
    return this.post('/auth/test-user-otp-request', { email });
  }

  testUserOtpLogin(payload) {
    return this.post('/auth/test-user-otp-login', payload);
  }

  // Demo Login (Instant access)
  demoLogin(roleOrEmail) {
    return this.post('/auth/demo-login', { role: roleOrEmail, email: roleOrEmail });
  }

  // Auth
  syncProfile(profileData) {
    return this.post('/auth/sync-profile', profileData);
  }

  getCurrentUser() {
    return this.get('/auth/me');
  }

  logout() {
    return this.post('/auth/logout');
  }

  // Users & Alumni Directory
  searchAlumni(params) {
    return this.get('/users/alumni', params);
  }

  getUserProfile(userId) {
    return this.get(`/users/${userId}`);
  }

  updateProfile(profileData) {
    return this.put('/users/profile', profileData);
  }

  uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.upload('/users/avatar', formData);
  }

  getStudents() {
    return this.get('/users/students');
  }

  promoteToAlumni(data) {
    return this.post('/users/promote-to-alumni', data);
  }

  // Connections & Mentorship
  sendConnectionRequest(recipientId, message) {
    return this.post('/connections/request', { recipientId, message });
  }

  getConnections() {
    return this.get('/connections');
  }

  updateConnectionStatus(requestId, status) {
    return this.put(`/connections/${requestId}/status`, { status });
  }

  requestMentorship(mentorId, goals, message) {
    return this.post('/mentorship/request', { mentorId, goals, message });
  }

  getMentorships() {
    return this.get('/mentorship');
  }

  updateMentorshipStatus(requestId, status) {
    return this.put(`/mentorship/${requestId}/status`, { status });
  }

  updateMentorshipPreferences(preferences) {
    return this.put('/mentorship/preferences', preferences);
  }

  // Human-to-Human Chat
  getConversations() {
    return this.get('/chat/conversations');
  }

  startConversation(recipientId) {
    return this.post('/chat/conversations', { recipientId });
  }

  getMessages(conversationId) {
    return this.get(`/chat/conversations/${conversationId}/messages`);
  }

  sendMessage(conversationId, text) {
    return this.post(`/chat/conversations/${conversationId}/messages`, { text });
  }

  // Opportunities
  getOpportunities() {
    return this.get('/opportunities');
  }

  getPendingOpportunities() {
    return this.get('/opportunities/pending');
  }

  postOpportunity(oppData) {
    return this.post('/opportunities', oppData);
  }

  reviewOpportunity(oppId, status, reviewNotes) {
    return this.put(`/opportunities/${oppId}/review`, { status, reviewNotes });
  }

  toggleSaveOpportunity(oppId) {
    return this.post(`/opportunities/${oppId}/save`);
  }

  getSavedOpportunities() {
    return this.get('/opportunities/saved');
  }

  getApplications() {
    return this.get('/opportunities/applications');
  }

  trackApplication(oppId, status, notes, resumeUrl = null, resumeFilename = null) {
    const payload = { status, notes };
    if (resumeUrl) payload.resumeUrl = resumeUrl;
    if (resumeFilename) payload.resumeFilename = resumeFilename;
    return this.post(`/opportunities/${oppId}/apply`, payload);
  }

  // Events
  getEvents() {
    return this.get('/events');
  }

  getPendingEvents() {
    return this.get('/events/pending');
  }

  createEvent(eventData) {
    return this.post('/events', eventData);
  }

  reviewEvent(eventId, status) {
    return this.put(`/events/${eventId}/review`, { status });
  }

  registerForEvent(eventId) {
    return this.post(`/events/${eventId}/register`);
  }

  cancelEventRegistration(eventId) {
    return this.delete(`/events/${eventId}/register`);
  }

  getMyRegistrations() {
    return this.get('/events/my-registrations');
  }

  getEventAttendees(eventId) {
    return this.get(`/events/${eventId}/attendees`);
  }

  // Achievements
  getAchievements() {
    return this.get('/achievements');
  }

  getPendingAchievements() {
    return this.get('/achievements/pending');
  }

  getMyAchievements() {
    return this.get('/achievements/my');
  }

  submitAchievement(data) {
    return this.post('/achievements', data);
  }

  reviewAchievement(achievementId, status, reviewNotes) {
    return this.put(`/achievements/${achievementId}/review`, { status, reviewNotes });
  }

  // Birthdays
  getBirthdays() {
    return this.get('/birthdays');
  }

  sendBirthdayGreeting(recipientId, greetingText) {
    return this.post('/birthdays/greet', { recipientId, greetingText });
  }

  getMyGreetings() {
    return this.get('/birthdays/my-greetings');
  }

  markGreetingAsRead(greetingId) {
    return this.put(`/birthdays/my-greetings/${greetingId}/read`);
  }

  updateMyDob(data) {
    return this.put('/birthdays/my-dob', data);
  }

  // Batches & BatchVerse
  getBatches() {
    return this.get('/batches');
  }

  getMyBatches() {
    return this.get('/batches/my');
  }

  getEligibleBatches() {
    return this.get('/batches/eligible');
  }

  getBatchHighlights() {
    return this.get('/batches/highlights');
  }

  getBatch(batchId) {
    return this.get(`/batches/${batchId}`);
  }

  joinBatch(batchId) {
    return this.post(`/batches/${batchId}/join`);
  }

  getBatchMembers(batchId, params = {}) {
    return this.get(`/batches/${batchId}/members`, params);
  }

  getBatchPosts(batchId) {
    return this.get(`/batches/${batchId}/posts`);
  }

  createBatchPost(batchId, data) {
    // Accepts either (batchId, { title, content, postType, imageUrl }) or legacy (batchId, title, content)
    const payload = typeof data === 'object' ? data : { title: arguments[1], content: arguments[2] };
    return this.post(`/batches/${batchId}/posts`, payload);
  }

  updateBatchPost(postId, data) {
    return this.put(`/batches/posts/${postId}`, data);
  }

  deleteBatchPost(postId) {
    return this.delete(`/batches/posts/${postId}`);
  }

  toggleLikePost(postId) {
    return this.post(`/batches/posts/${postId}/like`);
  }

  getPostComments(postId) {
    return this.get(`/batches/posts/${postId}/comments`);
  }

  addComment(postId, content, parentCommentId = null) {
    return this.post(`/batches/posts/${postId}/comments`, { content, parentCommentId });
  }

  updateComment(commentId, content) {
    return this.put(`/batches/comments/${commentId}`, { content });
  }

  deleteComment(commentId) {
    return this.delete(`/batches/comments/${commentId}`);
  }

  reportBatchPost(postId, reason, details = '') {
    return this.post(`/batches/posts/${postId}/report`, { reason, details });
  }

  getReportedBatchPosts() {
    return this.get('/batches/reported-posts');
  }

  // Phase 2: Batch Events & Reunions
  getBatchEvents(batchId, status = null) {
    const params = status ? { status } : {};
    return this.get(`/batches/${batchId}/events`, params);
  }

  getBatchEvent(eventId) {
    return this.get(`/batches/events/${eventId}`);
  }

  createBatchEvent(batchId, data) {
    return this.post(`/batches/${batchId}/events`, data);
  }

  updateBatchEvent(eventId, data) {
    return this.put(`/batches/events/${eventId}`, data);
  }

  cancelBatchEvent(eventId) {
    return this.put(`/batches/events/${eventId}/cancel`);
  }

  deleteBatchEvent(eventId) {
    return this.delete(`/batches/events/${eventId}`);
  }

  rsvpBatchEvent(eventId, status) {
    return this.post(`/batches/events/${eventId}/rsvp`, { status });
  }

  getEventAttendees(eventId, status = null) {
    const params = status ? { status } : {};
    return this.get(`/batches/events/${eventId}/attendees`, params);
  }

  // Phase 2: Batch Announcements
  getBatchAnnouncements(batchId) {
    return this.get(`/batches/${batchId}/announcements`);
  }

  createBatchAnnouncement(batchId, data) {
    return this.post(`/batches/${batchId}/announcements`, data);
  }

  updateBatchAnnouncement(announcementId, data) {
    return this.put(`/batches/announcements/${announcementId}`, data);
  }

  deleteBatchAnnouncement(announcementId) {
    return this.delete(`/batches/announcements/${announcementId}`);
  }

  togglePinAnnouncement(announcementId) {
    return this.post(`/batches/announcements/${announcementId}/pin`);
  }

  // Phase 2: Batch Polls & Voting
  getBatchPolls(batchId) {
    return this.get(`/batches/${batchId}/polls`);
  }

  getBatchPoll(pollId) {
    return this.get(`/batches/polls/${pollId}`);
  }

  createBatchPoll(batchId, data) {
    return this.post(`/batches/${batchId}/polls`, data);
  }

  voteBatchPoll(pollId, optionId) {
    return this.post(`/batches/polls/${pollId}/vote`, { optionId });
  }

  closeBatchPoll(pollId) {
    return this.put(`/batches/polls/${pollId}/close`);
  }

  deleteBatchPoll(pollId) {
    return this.delete(`/batches/polls/${pollId}`);
  }

  // Phase 3: Batch Memories Gallery & Community Memories
  getBatchMemories(batchId, params = {}) {
    return this.get(`/batches/${batchId}/memories`, params);
  }

  getBatchMemory(memoryId) {
    return this.get(`/batches/memories/${memoryId}`);
  }

  uploadBatchMemories(batchId, formData) {
    return this.upload(`/batches/${batchId}/memories`, formData);
  }

  createBatchMemory(batchId, data) {
    return this.post(`/batches/${batchId}/memories`, data);
  }

  updateBatchMemory(memoryId, data) {
    return this.put(`/batches/memories/${memoryId}`, data);
  }

  deleteBatchMemory(memoryId) {
    return this.delete(`/batches/memories/${memoryId}`);
  }

  toggleLikeMemory(memoryId) {
    return this.post(`/batches/memories/${memoryId}/like`);
  }

  getMemoryComments(memoryId) {
    return this.get(`/batches/memories/${memoryId}/comments`);
  }

  addMemoryComment(memoryId, content) {
    return this.post(`/batches/memories/${memoryId}/comments`, { content });
  }

  deleteMemoryComment(commentId) {
    return this.delete(`/batches/memories/comments/${commentId}`);
  }

  reportBatchMemory(memoryId, reason, details = '') {
    return this.post(`/batches/memories/${memoryId}/report`, { reason, details });
  }

  getMemoryReports(status = null) {
    const params = status ? { status } : {};
    return this.get('/batches/memories/reports', params);
  }

  moderateMemoryReport(reportId, action, note = '') {
    return this.put(`/batches/memories/reports/${reportId}/moderate`, { action, note });
  }

  getBatchAlbums(batchId) {
    return this.get(`/batches/${batchId}/albums`);
  }

  getMemoryTimeline(batchId) {
    return this.get(`/batches/${batchId}/memories/timeline`);
  }

  // Resources & Announcements
  getResources(courseId, category) {
    return this.get('/resources', { courseId, category });
  }

  createResource(data) {
    return this.post('/resources', data);
  }

  deleteResource(resourceId) {
    return this.delete(`/resources/${resourceId}`);
  }

  getAnnouncements() {
    return this.get('/announcements');
  }

  createAnnouncement(data) {
    return this.post('/announcements', data);
  }

  // Career Growth Tracker & Guide
  getCareerGuide(track) {
    return this.get('/career/guide', { track });
  }

  getGoals() {
    return this.get('/career/goals');
  }

  createGoal(goalData) {
    return this.post('/career/goals', goalData);
  }

  addMilestone(goalId, title) {
    return this.post(`/career/goals/${goalId}/milestones`, { title });
  }

  toggleMilestone(milestoneId, isCompleted) {
    return this.put(`/career/milestones/${milestoneId}/toggle`, { isCompleted });
  }

  getProjects() {
    return this.get('/career/projects');
  }

  addProject(data) {
    return this.post('/career/projects', data);
  }

  deleteProject(projectId) {
    return this.delete(`/career/projects/${projectId}`);
  }

  getCertifications() {
    return this.get('/career/certifications');
  }

  addCertification(data) {
    return this.post('/career/certifications', data);
  }

  // Notifications
  getNotifications() {
    return this.get('/notifications');
  }

  getUnreadNotificationCount() {
    return this.get('/notifications/unread-count');
  }

  markNotificationAsRead(id) {
    return this.put(`/notifications/${id}/read`);
  }

  markAllNotificationsAsRead() {
    return this.post('/notifications/read-all');
  }

  // Admin & Support Tickets
  getAdminStats() {
    return this.get('/admin/stats');
  }

  getAdminUsers() {
    return this.get('/admin/users');
  }

  updateUserRole(userId, role) {
    return this.put(`/admin/users/${userId}/role`, { role });
  }

  updateUserStatus(userId, status) {
    return this.put(`/admin/users/${userId}/status`, { status });
  }

  getCourses() {
    return this.get('/admin/courses');
  }

  createCourse(data) {
    return this.post('/admin/courses', data);
  }

  deleteCourse(courseId) {
    return this.delete(`/admin/courses/${courseId}`);
  }

  getAcademicYears() {
    return this.get('/admin/academic-years');
  }

  createAcademicYear(data) {
    return this.post('/admin/academic-years', data);
  }

  updateAcademicYear(yearId, data) {
    return this.put(`/admin/academic-years/${yearId}`, data);
  }

  deleteAcademicYear(yearId) {
    return this.delete(`/admin/academic-years/${yearId}`);
  }

  submitSupportTicket(ticketData) {
    return this.post('/admin/tickets', ticketData);
  }

  getMyTickets() {
    return this.get('/admin/my-tickets');
  }

  getAllTickets(status) {
    const params = {};
    if (status && status !== 'all') {
      params.status = status;
    }
    return this.get('/admin/tickets', params);
  }

  respondToTicket(ticketId, response, status) {
    return this.put(`/admin/tickets/${ticketId}/respond`, { response, status });
  }

  getAuditLogs(limit) {
    return this.get('/admin/audit-logs', { limit });
  }

  createReport(reportData) {
    return this.post('/admin/reports', reportData);
  }
}

export const api = new ApiService();

