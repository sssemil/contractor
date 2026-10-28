import { defaultRecipe, emptyRecipe, type RecipeConfig } from './config';

export const presets = [
  { id: 'web', label: 'Web app', description: 'A full app setup with login, storage, and review tools.', detail: 'Postgres · Redis · Cloudflare DNS', color: '#137a6d' },
  { id: 'workers', label: 'Cloudflare app', description: 'The same foundations, built for Workers.', detail: 'Workers · D1 · Email + Google', color: '#ae6627' },
  { id: 'vps', label: 'VPS app', description: 'Own the stack on a Hetzner server.', detail: 'Hetzner · Docker · Cloudflare DNS', color: '#6654aa' },
  { id: 'lean', label: 'Lean prototype', description: 'A light starting point to test an idea.', detail: 'Local · Git · Quality checks', color: '#4e7395' },
] as const;
export type PresetId = typeof presets[number]['id'];

export function createPreset(id: PresetId): RecipeConfig {
  const config = id === 'lean' ? emptyRecipe() : defaultRecipe();
  if (id === 'workers' || id === 'vps') {
    config.selected = config.selected.filter((module) => !['password', 'redis', 'tailnet', 'demo', 'wrapup'].includes(module));
  }
  if (id === 'lean') {
    config.selected = ['git', 'cleanup', 'verification'];
    config.workflow.questions = 'native';
  }
  if (id === 'workers') {
    config.selected = config.selected.filter((module) => module !== 'docker');
    config.deployment.target = 'workers';
    config.deployment.cloudflareDns = true;
  }
  if (id === 'vps') {
    config.deployment.target = 'vps';
    config.deployment.cloudflareDns = true;
  }
  return config;
}

export function applyPreset(current: RecipeConfig, id: PresetId): RecipeConfig {
  const preset = createPreset(id);
  return {
    ...preset,
    product: { ...current.product },
    emailFrom: current.emailFrom,
    deployment: { ...preset.deployment, domain: current.deployment.domain },
    ui: { ...preset.ui, notes: current.ui.notes },
    workflow: { ...preset.workflow, remote: current.workflow.remote },
  };
}

export function matchingPreset(config: RecipeConfig): PresetId | undefined {
  const signature = (recipe: RecipeConfig) => JSON.stringify([
    [...recipe.selected].sort(),
    recipe.deployment.target, recipe.deployment.vpsProvider, recipe.deployment.cloudflareDns,
    recipe.ui.style, recipe.ui.navigation, recipe.ui.theme, recipe.ui.color,
    recipe.workflow.tracker, recipe.workflow.pr, recipe.workflow.questions,
  ]);
  return presets.find(({ id }) => {
    return signature(config) === signature(createPreset(id));
  })?.id;
}
