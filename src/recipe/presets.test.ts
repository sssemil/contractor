import { describe, expect, it } from 'vitest';
import { defaultRecipe, emptyRecipe, parseRecipe } from './config';
import { applyPreset, createPreset, matchingPreset, presets } from './presets';
import { buildContract } from './contract';
import { resolveRecipe } from './resolve';

describe('starting points', () => {
  it('starts new drafts with a useful local app and quality checks', () => {
    const config = defaultRecipe();
    const active = resolveRecipe(config).active;
    expect(matchingPreset(config)).toBe('web');
    expect(config.deployment.target).toBe('local');
    for (const id of ['database', 'redis', 'password', 'emailCode', 'google', 'docker', 'git', 'chromium', 'tailnet', 'cleanup', 'verification', 'demo', 'wrapup'] as const) {
      expect(active.has(id)).toBe(true);
    }
    expect(resolveRecipe(config).dns).toBe(true);
    expect(buildContract(config).markdown).toContain('Leave application DNS record targets as placeholders');
    expect(config.workflow.tracker).toBe('markdown');
    expect(config.product.name).toBe('');
  });

  it.each(presets)('produces a compatible, round-trippable $label preset', ({ id }) => {
    const config = createPreset(id);
    expect(parseRecipe(JSON.stringify(config))).toEqual(config);
    expect(resolveRecipe(config).excluded).toEqual([]);
    expect(matchingPreset(config)).toBe(id);
    const output = buildContract(config).markdown;
    if (id === 'workers') {
      expect(output).toContain('Cloudflare D1');
      expect(output).not.toMatch(/Postgres|Redis|Docker|Nitro|Hetzner/);
    }
    if (id === 'vps') expect(output).toContain('Hetzner VPS');
    if (id === 'lean') expect(output).not.toMatch(/Postgres|Better Auth|Chromium|Docker/);
  });

  it('preserves entered project details while replacing setup selections', () => {
    const current = defaultRecipe();
    current.product = { name: 'My project', description: 'A brief', audience: 'Creators', requirements: 'Publish', exclusions: 'Billing', screens: 'Dashboard' };
    current.emailFrom = 'hello@example.com';
    current.deployment.domain = 'example.com';
    current.workflow.remote = 'https://github.com/example/project';
    current.ui.notes = 'Use concise labels.';
    const original = structuredClone(current);
    const next = applyPreset(current, 'workers');
    expect(next.product).toEqual(current.product);
    expect(next.emailFrom).toBe(current.emailFrom);
    expect(next.deployment.domain).toBe(current.deployment.domain);
    expect(next.workflow.remote).toBe(current.workflow.remote);
    expect(next.ui.notes).toBe(current.ui.notes);
    expect(next.selected).not.toContain('redis');
    expect(next.selected).not.toContain('docker');
    expect(matchingPreset(next)).toBe('workers');
    expect(current).toEqual(original);
  });

  it('recognizes customized recipes without depending on selection order or free text', () => {
    const config = defaultRecipe();
    config.selected.reverse();
    config.product.name = 'Custom name';
    expect(matchingPreset(config)).toBe('web');
    config.ui.theme = 'dark';
    expect(matchingPreset(config)).toBeUndefined();
    expect(matchingPreset(emptyRecipe())).toBeUndefined();
  });

  it('loads old saved choices as written instead of injecting the new defaults', () => {
    const legacy = emptyRecipe();
    legacy.product.name = 'Existing project';
    expect(parseRecipe(JSON.stringify(legacy))).toEqual(legacy);
    expect(resolveRecipe(parseRecipe(JSON.stringify(legacy))).active.size).toBe(0);
  });
});
