import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('public authentication routes and theme toggle work', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#landing-theme-toggle')).toBeVisible();

  const initialTheme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: 'Toggle Theme' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', initialTheme);

  await page.locator('a[href="#/login"]').first().click();
  await expect(page.locator('#login-form')).toBeVisible();

  await page.locator('a[href="#/register"]').last().click();
  await expect(page.locator('#register-form')).toBeVisible();

  await page.locator('a[href="#/login"]').first().click();
  await page.locator('a[href="#/forgot-password"]').first().click();
  await expect(page.locator('#fp-email-form')).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test('every internal hash link resolves to a declared SPA route or in-page anchor', async () => {
  const sourceRoot = path.resolve(process.cwd(), 'src');
  const routerPath = path.join(sourceRoot, 'router.js');
  const routerSource = fs.readFileSync(routerPath, 'utf8');
  const routeKeys = new Set(
    [...routerSource.matchAll(/['"](#\/[^'"]*)['"]\s*:/g)].map(match => match[1])
  );

  const files = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
    }
  };
  walk(sourceRoot);

  const violations = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const linkPattern = /href\s*=\s*["'`]([^"'`]+)["'`]/gi;
    let match;
    while ((match = linkPattern.exec(source))) {
      const href = match[1];
      if (!href.startsWith('#/')) continue;
      const routePath = href.split('?')[0];
      if (!routeKeys.has(routePath)) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(`${path.relative(process.cwd(), file)}:${line} -> ${href}`);
      }
    }
  }

  expect(violations, 'Internal SPA links must point to a declared route.').toEqual([]);
});

test('all authored source buttons declare an explicit type', async () => {
  const sourceRoot = path.resolve(process.cwd(), 'src');
  const files = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
    }
  };
  walk(sourceRoot);

  const violations = [];
  const buttonPattern = /<button\b([^>]*)>/gi;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = buttonPattern.exec(source))) {
      if (!/\btype\s*=\s*["'](?:button|submit|reset)["']/i.test(match[1])) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(`${path.relative(process.cwd(), file)}:${line}`);
      }
    }
  }

  expect(violations, 'Every button must explicitly declare type="button", "submit", or "reset".').toEqual([]);
});

test('visible landing-page buttons have accessible names', async ({ page }) => {
  await page.goto('/');
  const unnamed = await page.locator('button:visible').evaluateAll(buttons => buttons
    .filter(button => {
      const name = [
        button.getAttribute('aria-label'),
        button.getAttribute('title'),
        button.innerText,
        button.textContent
      ].filter(Boolean).join(' ').trim();
      return !name;
    })
    .map(button => button.outerHTML.slice(0, 180))
  );
  expect(unnamed, 'Visible buttons must have readable text or an accessible label.').toEqual([]);
});

test('landing demo role cards are keyboard activatable', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('button', { name: 'Launch student demo account' });
  await expect(card).toBeVisible();
  await card.focus();
  await expect(card).toBeFocused();
  // The card's keyboard handler forwards Enter to the same click path.
  await card.press('Enter');
  await expect(page).toHaveURL(/#\/dashboard$/);
});

test('modal traps focus and closes with Escape', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { openModal } = await import('/src/components/modal.js');
    const invoker = document.createElement('button');
    invoker.type = 'button';
    invoker.textContent = 'Open test dialog';
    document.body.append(invoker);
    invoker.focus();

    openModal({
      title: 'Keyboard Test Dialog',
      contentHtml: '<label for="modal-test-input">Test field</label><input id="modal-test-input">',
      footerHtml: '<button type="button" id="modal-last-action">Done</button>'
    });
    return document.activeElement?.id || '';
  });

  expect(result).toBe('modal-close-btn');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#modal-last-action')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#active-modal-overlay')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open test dialog' })).toBeFocused();
});

test('file upload dropzone responds to Enter and Space', async ({ page }) => {
  await page.goto('/');
  const clicks = await page.evaluate(async () => {
    const { createUniversalFileUploader } = await import('/src/components/universalFileUploader.js');
    const container = document.createElement('div');
    container.id = 'keyboard-uploader-test';
    document.body.append(container);
    createUniversalFileUploader({ container, category: 'photos' });

    const dropzone = container.querySelector('[role="button"]');
    const input = container.querySelector('input[type="file"]');
    let clickCount = 0;
    input.click = () => { clickCount += 1; };

    dropzone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    dropzone.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    return {
      role: dropzone.getAttribute('role'),
      tabIndex: dropzone.tabIndex,
      clickCount
    };
  });

  expect(clicks).toEqual({ role: 'button', tabIndex: 0, clickCount: 2 });
});

test('mobile landing page has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});
