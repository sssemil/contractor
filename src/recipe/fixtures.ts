import { emptyRecipe, type RecipeConfig } from './config';

export function minimalFixture(): RecipeConfig {
  const config = emptyRecipe();
  config.product = {
    name: 'Field Notes',
    description: 'A small notebook for independent researchers to collect observations.',
    audience: 'Independent researchers',
    requirements: 'Create and organize notes.\nSearch existing observations.',
    exclusions: 'Team collaboration and billing',
    screens: 'Notes list, note editor, settings',
  };
  return config;
}

export function vpsFixture(): RecipeConfig {
  const config = minimalFixture();
  config.selected = ['monorepo', 'redis', 'password', 'emailCode', 'google', 'chromium', 'worktrees', 'verification'];
  config.deployment = { target: 'vps', vpsProvider: 'hetzner', cloudflareDns: true, domain: 'notes.example.com' };
  config.workflow = { tracker: 'jira', pr: 'origin', questions: 'native', remote: 'https://github.com/example/field-notes.git' };
  config.emailFrom = 'hello@example.com';
  return config;
}

export function workersFixture(): RecipeConfig {
  const config = minimalFixture();
  config.selected = ['password', 'emailCode', 'google', 'verification'];
  config.deployment = { target: 'workers', vpsProvider: 'hetzner', cloudflareDns: true, domain: 'notes.example.com' };
  config.workflow.tracker = 'markdown';
  return config;
}
