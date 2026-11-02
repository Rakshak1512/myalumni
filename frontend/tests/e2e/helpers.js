import { expect } from '@playwright/test';

export async function installMockAdminSession(page, options = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('myalumni_token', 'playwright-test-token');
    localStorage.setItem('myalumni_role', 'admin');
  });

  const state = {
    resourceExists: true,
    connectionRequests: [],
    alumni: [{
      id: 'alumni-test-1',
      uid: 'alumni-test-1',
      displayName: 'Test Alumni',
      role: 'alumni',
      accountStatus: 'active',
      avatarUrl: '',
      bio: 'Playwright test profile',
      profile: {
        company: 'Example Labs',
        jobTitle: 'Software Engineer',
        graduationYear: '2022',
        skills: ['Python', 'JavaScript'],
        isMentoringAvailable: true
      }
    }],
    ...options
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'Authorization, Content-Type, X-Requested-With',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    const json = async (data, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: 'Mock response', data })
    });

    if (path.endsWith('/auth/me')) {
      await json({
        uid: 'admin-test-1',
        id: 'admin-test-1',
        email: 'admin@example.test',
        displayName: 'Test Admin',
        role: 'admin',
        accountStatus: 'active',
        avatarUrl: ''
      });
      return;
    }

    if (path.endsWith('/notifications/unread-count')) {
      await json({ unreadCount: 0 });
      return;
    }

    if (path.endsWith('/announcements') && method === 'GET') {
      await json([]);
      return;
    }

    if (path.endsWith('/resources') && method === 'GET') {
      await json(state.resourceExists ? [{
        id: 'resource-test-1',
        title: 'Test Academic Resource',
        description: 'Resource used by the browser interaction test.',
        category: 'study_materials',
        targetCourseName: 'All Courses',
        fileSize: '1 KB',
        fileUrl: 'https://example.test/resource.pdf',
        originalFilename: 'resource.pdf',
        mimeType: 'application/pdf'
      }] : []);
      return;
    }

    if (path.endsWith('/resources/resource-test-1') && method === 'DELETE') {
      state.resourceExists = false;
      await json(null);
      return;
    }

    if (path.endsWith('/users/alumni') && method === 'GET') {
      await json(state.alumni);
      return;
    }

    if (path.endsWith('/connections/request') && method === 'POST') {
      state.connectionRequests.push(request.postDataJSON());
      await json({ id: 'connection-test-1', status: 'pending' }, 201);
      return;
    }

    if (path.endsWith('/chat/conversations') && method === 'GET') {
      await json([]);
      return;
    }

    // Read-only/default route responses keep unrelated widgets isolated in these UI tests.
    await json([]);
  });

  return state;
}
