import { test, expect } from '@playwright/test';
import { installMockAdminSession } from './helpers.js';

test('mobile sidebar toggle opens and closes exactly once', async ({ page }) => {
  await installMockAdminSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/resources');

  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  const sidebar = page.locator('#app-sidebar');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(sidebar).toHaveClass(/open/);
  const closeButton = page.getByRole('button', { name: 'Close navigation' });
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(sidebar).not.toHaveClass(/open/);
});

test('resource Delete button calls the API and removes the resource', async ({ page }) => {
  const state = await installMockAdminSession(page);
  page.on('dialog', dialog => dialog.accept());

  await page.goto('/#/resources');
  await page.getByRole('button', { name: 'Study Materials & Question Papers' }).click();
  const deleteButton = page.getByRole('button', { name: 'Delete resource Test Academic Resource' });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  await expect.poll(() => state.resourceExists).toBe(false);
  await expect(page.getByText('No study materials found')).toBeVisible();
});

test('Messages page opens New Chat and starts a direct conversation', async ({ page }) => {
  const state = await installMockAdminSession(page);
  await page.goto('/#/messages');

  await page.getByRole('button', { name: '+ New Chat' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Test Alumni')).toBeVisible();

  await page.getByRole('button', { name: 'Chat ➔' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect.poll(() => state.conversationStarts.length).toBe(1);
  expect(state.conversationStarts[0]).toMatchObject({ recipientId: 'alumni-test-1' });
});

test('directory filters, Connect modal, and request action work', async ({ page }) => {
  const state = await installMockAdminSession(page);
  await page.goto('/#/directory');

  await expect(page.getByText('Test Alumni')).toBeVisible();
  await page.getByLabel('Alumnus Name').fill('Test');
  await page.getByRole('button', { name: 'Apply Filters' }).click();

  const connect = page.getByRole('button', { name: 'Connect' });
  await expect(connect).toBeVisible();
  await connect.click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#connect-msg').fill('Hello, I would like to connect.');
  await page.getByRole('button', { name: 'Send Connection Request' }).click();

  await expect.poll(() => state.connectionRequests.length).toBe(1);
  expect(state.connectionRequests[0]).toMatchObject({
    recipientId: 'alumni-test-1',
    message: 'Hello, I would like to connect.'
  });
});
