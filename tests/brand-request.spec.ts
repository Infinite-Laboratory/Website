import { test, expect } from '@playwright/test';
import { buildAndServe, type StaticSite } from './helpers/static-site';
import { validateRequest, isHttps, type BrandRequest } from '../src/lib/brand-request';

const ENDPOINT = 'https://forms.example.test/brand';
const good: BrandRequest = { name: 'Cleo', email: 'cleo@example.test', discord: '', uses: ['video'], files: 'logo', link: 'https://example.test/v/1', description: 'A review.', agree: true };

test.describe('without a backend (what ships today)', () => {
  test('says requests open soon and points to Discord, with no form that sends nothing', async ({ page }) => {
    await page.goto('/brand');
    await expect(page.locator('form#brandreq')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Requests open soon' })).toBeVisible();
    await expect(page.locator('#req-closed').getByRole('link', { name: 'Discord' })).toHaveAttribute('href', 'https://discord.gg/FQe3Mt6nA');
  });

  test('explains what happens next and that small uses need no request', async ({ page }) => {
    await page.goto('/brand');
    const aside = page.locator('.req-aside');
    await expect(aside).toContainText('A person reads every request and replies by email. Nothing is approved automatically.');
    await expect(aside).toContainText('Linking to us, writing about us and showing your support need no request.');
    await expect(aside).toContainText('only to answer your request, and delete them if you ask');
  });

  test('sits at the bottom of the Brand kit page, above the footer', async ({ page }) => {
    await page.goto('/brand');
    const req = (await page.locator('#request').boundingBox())!;
    const using = (await page.locator('#using').boundingBox())!;
    const footer = (await page.getByRole('contentinfo').boundingBox())!;
    expect(req.y).toBeGreaterThan(using.y);
    expect(req.y + req.height).toBeLessThanOrEqual(footer.y + 1);
  });
});

test.describe('with a backend configured', () => {
  test.describe.configure({ mode: 'serial' });
  let site: StaticSite;
  test.beforeAll(async () => {
    site = await buildAndServe('dist-form', { LAB_BRAND_ENDPOINT: ENDPOINT });
  });
  test.afterAll(() => site?.close());

  const fill = async (page: import('@playwright/test').Page, o: Partial<Record<string, string>> = {}) => {
    await page.getByLabel('Name or channel').fill(o.name ?? 'Cleo');
    await page.getByLabel('Email').fill(o.email ?? 'cleo@example.test');
    await page.getByLabel('Video or stream').check();
    await page.getByLabel('Logo and mark').check();
    await page.getByLabel(/Where will it appear/).fill(o.link ?? 'https://example.test/v/1');
    await page.getByLabel('About it').fill(o.description ?? 'A review of the server.');
    await page.getByLabel(/I have read the guidelines/).check();
  };

  test('shows a clear error for each missing or invalid field and focuses the first', async ({ page }) => {
    await page.goto(site.url('/brand'));
    await page.getByRole('button', { name: 'Send request' }).click();
    for (const [id, msg] of [['name', 'Tell us your name or channel.'], ['email', 'Enter your email'], ['uses', 'Choose at least one use.'], ['files', 'Choose which files'], ['link', 'Add a link'], ['description', 'Tell us a little'], ['agree', 'Please agree']]) {
      await expect(page.locator(`#e-${id}`)).toContainText(msg);
    }
    await expect(page.getByLabel('Name or channel')).toBeFocused();
    await expect(page.getByLabel('Name or channel')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Name or channel').fill('Cleo');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel(/Where will it appear/).fill('http://insecure.test');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#e-email')).toContainText('does not look like an email');
    await expect(page.locator('#e-link')).toContainText('https://');
    await expect(page.locator('#e-name')).toBeEmpty();
  });

  test('counts the description and refuses more than 600 characters', async ({ page }) => {
    await page.goto(site.url('/brand'));
    await fill(page, { description: 'x'.repeat(601) });
    await expect(page.locator('#r-count')).toHaveText('601 / 600');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#e-description')).toContainText('600 characters');
  });

  test('sends a valid request as JSON, shows a confirmation and clears the form', async ({ page }) => {
    let body: any = null;
    await page.route(ENDPOINT, async (route) => {
      body = JSON.parse(route.request().postData()!);
      await route.fulfill({ status: 200, json: { ok: true }, headers: { 'access-control-allow-origin': '*' } });
    });
    await page.goto(site.url('/brand'));
    await fill(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#req-status')).toContainText('Thank you. Your request is in.');
    expect(body).toEqual({ name: 'Cleo', email: 'cleo@example.test', discord: '', uses: ['video'], files: 'logo', link: 'https://example.test/v/1', description: 'A review of the server.', agree: true });
    await expect(page.getByLabel('Name or channel')).toHaveValue('');
  });

  test('says it could not send, and keeps what was typed, when the backend fails', async ({ page }) => {
    await page.route(ENDPOINT, (r) => r.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' } }));
    await page.goto(site.url('/brand'));
    await fill(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#req-status')).toContainText('could not send your request');
    await expect(page.getByLabel('Name or channel')).toHaveValue('Cleo');
    await expect(page.getByRole('button', { name: 'Send request' })).toBeEnabled();
  });

  test('never echoes what you typed as HTML', async ({ page }) => {
    await page.route(ENDPOINT, (r) => r.fulfill({ status: 200, json: {}, headers: { 'access-control-allow-origin': '*' } }));
    await page.goto(site.url('/brand'));
    await fill(page, { name: '<img src=x onerror="window.__xss=1">', description: '<script>window.__xss=1</script>' });
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#req-status')).toContainText('Thank you');
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    await expect(page.locator('#req-status img, #req-status script')).toHaveCount(0);
  });

  test('a bot that fills the hidden field is told it worked, but nothing is sent', async ({ page }) => {
    let sent = false;
    await page.route(ENDPOINT, (r) => { sent = true; return r.fulfill({ status: 200, json: {} }); });
    await page.goto(site.url('/brand'));
    await fill(page);
    await page.locator('#r-site').evaluate((el: HTMLInputElement) => (el.value = 'http://spam.test'));
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#req-status')).toContainText('Thank you');
    expect(sent).toBe(false);
  });

  test('is keyboard friendly: every control is labelled and the hidden field is not reachable', async ({ page }) => {
    await page.goto(site.url('/brand'));
    const unlabeled = await page.locator('#brandreq input:not(#r-site), #brandreq textarea').evaluateAll((els) =>
      els.filter((e) => !(e as HTMLInputElement).labels?.length).map((e) => (e as HTMLInputElement).name));
    expect(unlabeled).toEqual([]);
    await expect(page.locator('#r-site')).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('validation rules', () => {
  test('a good request passes', () => expect(validateRequest(good)).toEqual({}));
  test('each rule is enforced', () => {
    expect(validateRequest({ ...good, name: ' ' }).name).toBeTruthy();
    expect(validateRequest({ ...good, email: 'a@b' }).email).toBeTruthy();
    expect(validateRequest({ ...good, uses: [] }).uses).toBeTruthy();
    expect(validateRequest({ ...good, uses: ['nope'] }).uses).toBeTruthy();
    expect(validateRequest({ ...good, files: '' }).files).toBeTruthy();
    expect(validateRequest({ ...good, link: 'javascript:alert(1)' }).link).toBeTruthy();
    expect(validateRequest({ ...good, link: 'http://x.test' }).link).toBeTruthy();
    expect(validateRequest({ ...good, description: 'a'.repeat(601) }).description).toBeTruthy();
    expect(validateRequest({ ...good, description: 'a'.repeat(600) }).description).toBeUndefined();
    expect(validateRequest({ ...good, agree: false }).agree).toBeTruthy();
    expect(validateRequest({ ...good, discord: '' }).discord).toBeUndefined();
  });
  test('only https links with a real host are accepted', () => {
    expect(isHttps('https://example.test/a')).toBe(true);
    for (const bad of ['http://example.test', 'ftp://example.test', 'https://localhost', 'data:text/html,x', 'not a url', '']) expect(isHttps(bad), bad).toBe(false);
  });
});
