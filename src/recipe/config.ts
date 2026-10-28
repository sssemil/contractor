import { z } from 'zod';

export const moduleIds = [
  'monorepo', 'database', 'redis', 'docker', 'auth', 'email',
  'password', 'emailCode', 'google', 'git', 'worktrees', 'runtime',
  'chromium', 'tailnet', 'cleanup', 'verification', 'demo', 'wrapup',
] as const;
export type ModuleId = typeof moduleIds[number];
export type Group = 'product' | 'stack' | 'infrastructure' | 'interface' | 'workflow';
export type SourceId = ModuleId | 'product' | 'baseline' | 'deployment' | 'dns' | 'ui' | 'tracking' | 'pr' | 'questions';
export const MAX_RECIPE_BYTES = 2_000_000;

const text = z.string().max(30_000);
export const recipeSchema = z.object({
  version: z.literal(1),
  product: z.object({
    name: z.string().max(160),
    description: text,
    audience: text,
    requirements: text,
    exclusions: text,
    screens: text,
  }).strict(),
  selected: z.array(z.enum(moduleIds)).max(moduleIds.length)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate selections'),
  deployment: z.object({
    target: z.enum(['local', 'vps', 'workers']),
    vpsProvider: z.enum(['hetzner', 'generic']),
    cloudflareDns: z.boolean(),
    domain: z.string().max(253),
  }).strict(),
  ui: z.object({
    style: z.enum(['minimal', 'polished']),
    navigation: z.enum(['sidebar', 'top']),
    theme: z.enum(['light', 'dark', 'system']),
    color: z.enum(['neutral', 'blue', 'green', 'violet', 'orange']),
    notes: text,
  }).strict(),
  workflow: z.object({
    tracker: z.enum(['none', 'jira', 'linear', 'markdown']),
    pr: z.enum(['none', 'gh', 'origin']),
    questions: z.preprocess((value) => value === 'asktool' ? 'native' : value, z.enum(['none', 'native'])),
    remote: z.string().max(2_048),
  }).strict(),
  emailFrom: z.string().max(320),
}).strict();

export type RecipeConfig = z.infer<typeof recipeSchema>;

export function emptyRecipe(): RecipeConfig {
  return {
    version: 1,
    product: { name: '', description: '', audience: '', requirements: '', exclusions: '', screens: '' },
    selected: [],
    deployment: { target: 'local', vpsProvider: 'hetzner', cloudflareDns: false, domain: '' },
    ui: { style: 'minimal', navigation: 'sidebar', theme: 'system', color: 'neutral', notes: '' },
    workflow: { tracker: 'none', pr: 'none', questions: 'none', remote: '' },
    emailFrom: '',
  };
}

export function defaultRecipe(): RecipeConfig {
  const config = emptyRecipe();
  config.selected = ['monorepo', 'database', 'redis', 'password', 'emailCode', 'google', 'docker', 'git', 'worktrees', 'runtime', 'chromium', 'tailnet', 'cleanup', 'verification', 'demo', 'wrapup'];
  config.deployment.cloudflareDns = true;
  config.ui.style = 'polished';
  config.ui.color = 'blue';
  config.workflow = { tracker: 'markdown', pr: 'gh', questions: 'native', remote: '' };
  return config;
}

export function parseRecipe(raw: string): RecipeConfig {
  if (new TextEncoder().encode(raw).byteLength > MAX_RECIPE_BYTES) {
    throw new Error('Recipe is too large. Choose a Contractor JSON file under 2 MB.');
  }
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error('This is not valid JSON. Choose a Contractor recipe export.'); }
  const parsed = recipeSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Unsupported or invalid recipe. Use a version 1 Contractor export. Your current draft has not changed.');
  }
  return parsed.data;
}

export function exportReady(config: RecipeConfig): boolean {
  return Boolean(config.product.name.trim() && config.product.description.trim());
}

export function filename(config: RecipeConfig, extension: 'md' | 'json'): string {
  const name = config.product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return (name || 'project') + '-' + (extension === 'md' ? 'contract' : 'recipe') + '.' + extension;
}
