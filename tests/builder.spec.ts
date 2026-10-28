import { test, expect, type Page } from '@playwright/test';
import { defaultRecipe, type RecipeConfig } from '../src/recipe/config';
import { buildContract } from '../src/recipe/contract';
import { minimalFixture, vpsFixture, workersFixture } from '../src/recipe/fixtures';

async function openGroup(page: Page, label: string) {
  await page.getByRole('navigation', { name: 'Jump to section' }).getByRole('link', { name: label, exact: true }).click();
}
async function importRecipe(page: Page, config: RecipeConfig) {
  await page.getByLabel('Import recipe file').setInputFiles({
    name: 'recipe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(config)),
  });
  await page.getByRole('button', { name: 'Replace draft', exact: true }).click();
}
async function downloadText(page: Page, button: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf-8') };
}

test('builds a prompt, highlights its sources, and persists the current draft', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Lean prototype', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy prompt', exact: true })).toBeDisabled();
  await page.getByLabel('Project name', { exact: false }).fill('Field Notes');
  await page.getByLabel('What are you building?').fill('A notebook for independent researchers.');
  await expect(page.getByRole('button', { name: 'Copy prompt', exact: true })).toBeEnabled();
  await expect(page.getByRole('article')).toContainText('Field Notes — Project contract');
  await openGroup(page, 'Stack');
  await page.getByRole('checkbox', { name: 'Google login', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('checkbox', { name: 'Database + Drizzle', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Database + Drizzle', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Resend email', exact: true })).not.toBeChecked();
  await page.locator('#control-google').hover();
  await expect(page.locator('[data-block="google"]')).toHaveClass(/block-highlighted/);
  await expect(page.locator('[data-block="database"]')).toHaveClass(/block-highlighted/);
  await openGroup(page, 'Rules');
  await page.locator('[data-block="google"]').getByRole('button', { name: 'Configure Google login', exact: true }).click();
  await expect(page.locator('#control-google')).toBeFocused();
  await expect(page.getByRole('checkbox', { name: 'Google login', exact: true })).toBeChecked();
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  await page.reload();
  await openGroup(page, 'Stack');
  await expect(page.getByRole('checkbox', { name: 'Google login', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Google login', exact: true }).uncheck();
  await expect(page.getByRole('checkbox', { name: 'Database + Drizzle', exact: true })).not.toBeChecked();
  await expect(page.locator('[data-block="auth"]')).toHaveCount(0);
});

test('switches deployment targets while preserving explicit Node selections', async ({ page }) => {
  await page.goto('./');
  await importRecipe(page, vpsFixture());
  await openGroup(page, 'Infra');
  await expect(page.getByRole('checkbox', { name: 'Docker', exact: true })).toBeChecked();
  await page.getByLabel('Deployment target', { exact: true }).selectOption('workers');
  await expect(page.getByRole('checkbox', { name: 'Docker', exact: true })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Docker', exact: true })).toBeDisabled();
  await expect(page.getByText('Excluded on Workers:', { exact: false })).toContainText('Redis');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByLabel('Generated Markdown')).toHaveValue(/Cloudflare D1/);
  await expect(page.getByLabel('Generated Markdown')).not.toHaveValue(/Postgres|Redis|Docker|Hetzner/);
  await page.getByLabel('Deployment target', { exact: true }).selectOption('vps');
  await expect(page.getByLabel('Generated Markdown')).toHaveValue(/Postgres/);
  await expect(page.getByLabel('Generated Markdown')).toHaveValue(/Redis/);
});

test('exports identical raw Markdown and copy content, and round-trips JSON', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  const config = workersFixture();
  await importRecipe(page, config);
  const expected = buildContract(config).markdown;
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByLabel('Generated Markdown')).toHaveValue(expected);
  const markdown = await downloadText(page, 'Download Markdown');
  expect(markdown.name).toBe('field-notes-contract.md');
  expect(markdown.text).toBe(expected);
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  const json = await downloadText(page, 'Export recipe');
  expect(JSON.parse(json.text)).toEqual(config);
  await page.getByRole('button', { name: 'Reset recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Reset draft', exact: true }).click();
  await expect(page.getByLabel('Project name', { exact: false })).toHaveValue('');
  await importRecipe(page, JSON.parse(json.text));
  await expect(page.getByLabel('Generated Markdown')).toHaveValue(expected);
});

test('rejects invalid imports and confirms replacement without losing the draft', async ({ page }) => {
  await page.goto('./');
  await importRecipe(page, minimalFixture());
  await page.getByLabel('Import recipe file').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":2}'),
  });
  await expect(page.getByRole('status')).toContainText('Unsupported or invalid recipe');
  await expect(page.getByLabel('Project name', { exact: false })).toHaveValue('Field Notes');
  await page.getByLabel('Import recipe file').setInputFiles({
    name: 'blank.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(defaultRecipe())),
  });
  await page.getByRole('button', { name: 'Keep current draft', exact: true }).click();
  await expect(page.getByLabel('Project name', { exact: false })).toHaveValue('Field Notes');
  await page.getByRole('button', { name: 'Reset recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Keep current draft', exact: true }).click();
  await expect(page.getByLabel('Project name', { exact: false })).toHaveValue('Field Notes');
});

test('remains usable when local storage and clipboard access are denied', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
    });
  });
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('saved draft could not be loaded');
  await importRecipe(page, minimalFixture());
  await expect(page.getByRole('alert')).toContainText('Local saving is unavailable');
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Copy your prompt manually');
  await expect(page.getByLabel('Prompt to copy')).toHaveValue(buildContract(minimalFixture()).markdown);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  expect(JSON.parse((await downloadText(page, 'Export recipe')).text)).toEqual(minimalFixture());
});

test('handles long and hostile text as content without scripts or layout overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  const config = minimalFixture();
  config.product.name = 'LongProject'.repeat(14);
  config.product.description = '<img src=x onerror="window.INJECTED=true">\n# A heading\n' + 'word'.repeat(2_000);
  await importRecipe(page, config);
  await expect(page.locator('.document img')).toHaveCount(0);
  await expect(page.getByRole('article')).toContainText('<img src=x');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.querySelector('.document')!.scrollWidth <= document.querySelector('.document')!.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('uses mobile panes, source navigation, and export controls without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await importRecipe(page, workersFixture());
  await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Recipe configuration', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Live prompt', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: /^Preview/ }).click();
  await expect(page.getByRole('region', { name: 'Live prompt', exact: true })).toBeVisible();
  await page.locator('[data-block="google"]').getByRole('button', { name: 'Configure Google login', exact: true }).click();
  await expect(page.locator('#control-google')).toBeFocused();
  await expect(page.getByRole('checkbox', { name: 'Google login', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: /^Preview/ }).click();
  await expect(page.getByRole('button', { name: 'Copy prompt', exact: true })).toBeVisible();
  await page.screenshot({ path: '.local/mobile.png', fullPage: true });
});

test('captures the desktop workspace with a composed recipe', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await importRecipe(page, vpsFixture());
  await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();
  await openGroup(page, 'Stack');
  await page.locator('[data-block="database"]').scrollIntoViewIfNeeded();
  await page.locator('#control-database').hover();
  await page.screenshot({ path: '.local/desktop.png', fullPage: true });
});

test('shows one continuous form with defaults, editable presets, and undo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Web app', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('checkbox', { name: 'Email code', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Google login', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Verification', exact: true })).toBeChecked();
  for (const name of ['Email & password', 'Redis', 'Cloudflare DNS', 'Demo evidence', 'Ticket wrap-up', 'Tailnet review access']) {
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
  }
  await expect(page.locator('.config-content')).toHaveCount(5);
  for (const id of ['product', 'stack', 'infrastructure', 'interface', 'workflow']) {
    await expect(page.locator('#section-' + id)).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /^Next:/ })).toHaveCount(0);
  await page.getByLabel('Project name', { exact: false }).fill('A real project');
  await page.getByLabel('What are you building?').fill('Preserve my product brief.');
  await page.getByLabel('Project name', { exact: false }).blur();
  await page.locator('.config-scroll').evaluate((element) => element.scrollTop = 0);
  await page.screenshot({ path: '.local/presets-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Cloudflare app', exact: true }).click();
  await expect(page.getByLabel('Deployment target', { exact: true })).toHaveValue('workers');
  await expect(page.getByRole('checkbox', { name: 'Docker', exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Project name', { exact: false })).toHaveValue('A real project');
  await expect(page.locator('[data-block="database"]')).toContainText('Cloudflare D1');
  await page.getByRole('button', { name: 'Undo preset', exact: true }).click();
  await expect(page.getByLabel('Deployment target', { exact: true })).toHaveValue('local');
  await expect(page.getByRole('checkbox', { name: 'Docker', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Lean prototype', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Database + Drizzle', exact: true })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Redis', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Undo preset', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lean prototype', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await openGroup(page, 'Rules');
  await expect(page.getByLabel('Work tracking', { exact: true })).toBeInViewport();
  await page.getByRole('checkbox', { name: 'Demo evidence', exact: true }).check();
  await expect(page.locator('#section-product')).toBeVisible();
  await expect(page.locator('#section-stack')).toBeVisible();
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Redis', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Demo evidence', exact: true })).toBeChecked();
  await expect(page.getByLabel('Project name', { exact: false })).toHaveValue('A real project');
});

test('presets and continuous scrolling work on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.screenshot({ path: '.local/presets-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'VPS app', exact: true }).click();
  await openGroup(page, 'Infra');
  await expect(page.getByLabel('Deployment target', { exact: true })).toHaveValue('vps');
  await expect(page.getByLabel('Deployment target', { exact: true })).toBeInViewport();
  await page.getByLabel('VPS provider', { exact: true }).selectOption('generic');
  await openGroup(page, 'Rules');
  await page.getByRole('checkbox', { name: 'Tailnet review access', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Tailnet review access', exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
