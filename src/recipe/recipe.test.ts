import { describe, expect, it } from 'vitest';
import { buildContract, sections } from './contract';
import { defaultRecipe, emptyRecipe, exportReady, filename, MAX_RECIPE_BYTES, moduleIds, parseRecipe } from './config';
import { moduleById, modules, sources } from './catalog';
import { resolveRecipe } from './resolve';
import { minimalFixture, vpsFixture, workersFixture } from './fixtures';

describe('recipe resolution', () => {
  it('supports a fully empty recipe independently of the recommended defaults', () => {
    const config = emptyRecipe();
    expect(resolveRecipe(config).active.size).toBe(0);
    const output = buildContract(config).markdown;
    expect(output).not.toMatch(/Better Auth|Postgres|D1|Jira|Linear|worktree|Chromium|ASKTOOL|## Working rules|## Acceptance/);
    expect(exportReady(config)).toBe(false);
    config.product.name = '  ';
    config.product.description = 'Description';
    expect(exportReady(config)).toBe(false);
    config.product.name = 'Project';
    expect(exportReady(config)).toBe(true);
  });

  it('adds transitive auth dependencies and explains their causes', () => {
    const config = minimalFixture();
    config.selected = ['emailCode'];
    const resolved = resolveRecipe(config);
    expect([...resolved.active].sort()).toEqual(['auth', 'database', 'email', 'emailCode']);
    expect(resolved.requiredBy.get('database')).toEqual(new Set(['emailCode', 'auth']));
    const contract = buildContract(config);
    expect(contract.blocks.find((block) => block.id === 'database')?.sources).toEqual(['database', 'auth', 'emailCode', 'deployment']);
    expect(contract.markdown).not.toMatch(/Google login|Email and password/);
  });

  it('removes unused prerequisites but retains explicit and shared ones', () => {
    const config = minimalFixture();
    config.selected = ['database', 'emailCode', 'google'];
    expect(resolveRecipe(config).active.has('email')).toBe(true);
    config.selected = ['database', 'google'];
    expect(resolveRecipe(config).active.has('email')).toBe(false);
    expect(resolveRecipe(config).active.has('auth')).toBe(true);
    config.selected = ['database'];
    expect([...resolveRecipe(config).active]).toEqual(['database']);
    config.selected = [];
    expect(resolveRecipe(config).active.size).toBe(0);
  });

  it('adapts storage and excludes Node-only selections without deleting preferences', () => {
    const config = vpsFixture();
    config.selected.push('docker');
    const before = JSON.stringify(config.selected);
    expect(buildContract(config).markdown).toContain('Postgres');
    config.deployment.target = 'workers';
    const contract = buildContract(config);
    expect(contract.resolved.excluded).toEqual(['redis', 'docker']);
    expect(contract.markdown).toContain('Cloudflare D1');
    expect(contract.markdown).not.toMatch(/Postgres|Redis|Docker|Nitro|Hetzner/);
    expect(JSON.stringify(config.selected)).toBe(before);
    config.deployment.target = 'vps';
    expect(resolveRecipe(config).active.has('redis')).toBe(true);
    expect(resolveRecipe(config).active.has('docker')).toBe(true);
  });

  it('does not preserve derived Docker after leaving the VPS target', () => {
    const config = vpsFixture();
    expect(resolveRecipe(config).requiredBy.get('docker')).toEqual(new Set(['deployment']));
    config.deployment.target = 'local';
    expect(resolveRecipe(config).active.has('docker')).toBe(false);
    expect(resolveRecipe(config).dns).toBe(true);
    expect(config.deployment.cloudflareDns).toBe(true);
    expect(buildContract(config).blocks.find((block) => block.id === 'dns')?.markdown).toContain('Leave application DNS record targets as placeholders');
  });

  it('keeps Google login, Chromium, and tailnet independent, composing selected combinations', () => {
    const config = minimalFixture();
    config.selected = ['google'];
    expect(resolveRecipe(config).active.has('chromium')).toBe(false);
    expect(buildContract(config).markdown).not.toContain('Chromium');
    config.selected.push('chromium');
    expect(buildContract(config).blocks.find((block) => block.id === 'google')?.sources).toContain('chromium');
    expect(resolveRecipe(config).active.has('tailnet')).toBe(false);
    config.selected.push('tailnet');
    expect(buildContract(config).markdown).toContain('expose CDP only through');
    config.selected = ['tailnet'];
    expect(resolveRecipe(config).active.has('chromium')).toBe(false);
    expect(buildContract(config).markdown).not.toContain('CDP');
  });

  it('keeps Git separate from PR tooling and never selects a tracker implicitly', () => {
    const config = minimalFixture();
    config.workflow.pr = 'origin';
    expect(resolveRecipe(config).active.has('git')).toBe(true);
    expect(config.workflow.tracker).toBe('none');
    expect(buildContract(config).markdown).toContain('origin pr refresh');
    expect(buildContract(config).markdown).not.toMatch(/Jira|Linear/);
    config.workflow.pr = 'gh';
    expect(buildContract(config).markdown).toContain('GitHub CLI');
    expect(buildContract(config).markdown).not.toContain('origin pr refresh');
    config.workflow.pr = 'none';
    expect(resolveRecipe(config).active.has('git')).toBe(false);
  });

  it.each(['jira', 'linear', 'markdown'] as const)('only generates the selected %s tracker rules', (tracker) => {
    const config = minimalFixture();
    config.workflow.tracker = tracker;
    config.selected = ['worktrees', 'demo', 'wrapup'];
    const output = buildContract(config).markdown;
    expect(output).toContain({ jira: 'Jira', linear: 'Linear', markdown: 'tasks/' }[tracker]);
    if (tracker !== 'jira') expect(output).not.toContain('Jira');
    if (tracker !== 'linear') expect(output).not.toContain('Linear');
    if (tracker === 'markdown') expect(output).not.toContain('Before creating an issue');
  });

  it('has a complete acyclic dependency catalog and valid source metadata', () => {
    expect(new Set(modules.map((module) => module.id))).toEqual(new Set(moduleIds));
    function visit(id: typeof moduleIds[number], ancestors: string[]) {
      expect(ancestors).not.toContain(id);
      expect(sources[id].label).toBeTruthy();
      moduleById(id).requires.forEach((child) => visit(child, [...ancestors, id]));
    }
    moduleIds.forEach((id) => visit(id, []));
  });
});

describe('contract generation', () => {
  it.each([minimalFixture, vpsFixture, workersFixture])('generates a complete, stable, standalone contract for %s', (fixture) => {
    const config = fixture();
    const contract = buildContract(config);
    expect(contract.markdown).toMatch(/^# Field Notes/);
    expect(contract.markdown).toContain('independent researchers');
    expect(contract.markdown).toContain('Core screens');
    expect(new Set(contract.blocks.map((block) => block.id)).size).toBe(contract.blocks.length);
    expect(contract.markdown).not.toMatch(/\/(?:home|Users)\/|PRIVATE KEY|(?:github_pat_|gh[pousr]_)[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{20,}/);
    expect(contract.blocks.every((block) => block.sources.every((id) => sources[id]))).toBe(true);
    expect(contract.blocks.map((block) => sections.indexOf(block.section))).toEqual(
      contract.blocks.map((block) => sections.indexOf(block.section)).sort((a, b) => a - b),
    );
    expect(buildContract(config)).toEqual(contract);
    expect(buildContract({ ...config, selected: [...config.selected].reverse() }).markdown).toBe(contract.markdown);
    expect(contract.markdown).toMatchSnapshot();
  });

  it('deduplicates shared auth foundations and retains all source selections', () => {
    const contract = buildContract(workersFixture());
    expect(contract.blocks.filter((block) => block.id === 'auth')).toHaveLength(1);
    expect(contract.blocks.find((block) => block.id === 'auth')?.sources).toEqual(['auth', 'password', 'emailCode', 'google', 'deployment']);
    expect(contract.blocks.filter((block) => block.id === 'email')).toHaveLength(1);
  });

  it('escapes entered Markdown/HTML as content and sanitizes export filenames', () => {
    const config = minimalFixture();
    config.product.name = '../../<script> # title';
    config.product.description = '# injected\n<script>alert(1)</script>\n[link](javascript:alert(1))';
    const contract = buildContract(config);
    expect(contract.markdown).toContain('> \\# injected');
    expect(contract.markdown).toContain('\\<script\\>');
    expect(contract.markdown).not.toContain('\n# injected');
    expect(filename(config, 'md')).toBe('script-title-contract.md');
    expect(filename(defaultRecipe(), 'json')).toBe('project-recipe.json');
  });

  it('makes Docker useful without silently adding a database or cache', () => {
    const config = minimalFixture();
    config.selected = ['docker'];
    const contract = buildContract(config);
    expect(contract.markdown).toContain('Compose service for the application');
    expect(contract.markdown).not.toMatch(/Postgres|Redis/);
    config.selected.push('database', 'redis');
    const containers = buildContract(config).blocks.find((block) => block.id === 'docker');
    expect(containers?.sources).toEqual(['docker', 'deployment', 'database', 'redis']);
    expect(containers?.markdown).toContain('Postgres and Redis');
  });
});

describe('recipe files', () => {
  it('round-trips explicit settings, including inactive target preferences', () => {
    const config = vpsFixture();
    config.deployment.target = 'workers';
    const raw = JSON.stringify(config);
    expect(parseRecipe(raw)).toEqual(config);
    expect(buildContract(parseRecipe(raw)).markdown).toBe(buildContract(config).markdown);
  });

  it('can reimport maximum-length Unicode fields exported by the builder', () => {
    const config = minimalFixture();
    const content = '界'.repeat(30_000);
    config.product = { name: '研究', description: content, audience: content, requirements: content, exclusions: content, screens: content };
    config.ui.notes = content;
    expect(parseRecipe(JSON.stringify(config))).toEqual(config);
  });

  it.each([
    'not JSON', 'null', '{}',
    JSON.stringify({ ...defaultRecipe(), version: 2 }),
    JSON.stringify({ ...defaultRecipe(), selected: ['unknown'] }),
    JSON.stringify({ ...defaultRecipe(), selected: ['google', 'google'] }),
    JSON.stringify({ ...defaultRecipe(), product: { ...defaultRecipe().product, name: 42 } }),
    JSON.stringify({ ...defaultRecipe(), extra: true }),
    JSON.stringify({ ...defaultRecipe(), ui: { ...defaultRecipe().ui, theme: 'invalid' } }),
    ' '.repeat(MAX_RECIPE_BYTES + 1),
  ])('rejects invalid or unsupported input', (raw) => {
    expect(() => parseRecipe(raw)).toThrow();
  });
});
