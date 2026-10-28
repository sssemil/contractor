import type { Group, ModuleId, SourceId } from './config';

export interface Source {
  label: string;
  color: string;
  group: Group;
}

export interface Module extends Source {
  id: ModuleId;
  description: string;
  requires: ModuleId[];
  workersExcluded?: boolean;
  internal?: boolean;
}

export const modules: Module[] = [
  { id: 'monorepo', label: 'Turborepo', description: 'Separate apps and shared packages in a pnpm workspace.', color: '#9246a1', group: 'stack', requires: [] },
  { id: 'database', label: 'Database + Drizzle', description: 'Postgres locally and on VPS; D1 on Workers.', color: '#28755c', group: 'stack', requires: [] },
  { id: 'redis', label: 'Redis', description: 'An optional cache for the Node.js recipe.', color: '#aa5336', group: 'stack', requires: [], workersExcluded: true },
  { id: 'docker', label: 'Docker', description: 'Compose services for isolated local development.', color: '#356fa4', group: 'infrastructure', requires: [], workersExcluded: true },
  { id: 'auth', label: 'Better Auth', description: 'Shared authentication and persistent sessions.', color: '#7c53a7', group: 'stack', requires: ['database'], internal: true },
  { id: 'email', label: 'Resend email', description: 'Transactional email with your sender domain.', color: '#a04f75', group: 'stack', requires: [] },
  { id: 'password', label: 'Email & password', description: 'Signup, signin, email verification, and password recovery.', color: '#6553b3', group: 'stack', requires: ['auth', 'email'] },
  { id: 'emailCode', label: 'Email code', description: 'Passwordless login with a short-lived email code.', color: '#96672a', group: 'stack', requires: ['auth', 'email'] },
  { id: 'google', label: 'Google login', description: 'Google OAuth with environment-specific callbacks.', color: '#3a7a86', group: 'stack', requires: ['auth'] },
  { id: 'git', label: 'Initialize Git', description: 'Initialize a fresh repository and optionally set its remote.', color: '#aa5336', group: 'workflow', requires: [] },
  { id: 'worktrees', label: 'Isolated worktrees', description: 'Give each task its own branch and working directory.', color: '#7f5ca3', group: 'workflow', requires: ['git'] },
  { id: 'runtime', label: 'Runtime isolation', description: 'Allocate free ports and preserve unrelated services.', color: '#267785', group: 'workflow', requires: [] },
  { id: 'chromium', label: 'Persistent Chromium', description: 'Share a local browser profile with your coding agent.', color: '#4c7396', group: 'workflow', requires: [] },
  { id: 'tailnet', label: 'Tailnet review access', description: 'Keep the review instance reachable through Tailscale.', color: '#5a6d91', group: 'workflow', requires: [] },
  { id: 'cleanup', label: 'Code cleanup', description: 'Review touched code and remove unnecessary generated clutter.', color: '#797536', group: 'workflow', requires: [] },
  { id: 'verification', label: 'Verification', description: 'Run relevant checks and exercise acceptance journeys.', color: '#28755c', group: 'workflow', requires: [] },
  { id: 'demo', label: 'Demo evidence', description: 'Record and visually inspect the final user journey.', color: '#a04f75', group: 'workflow', requires: ['verification'] },
  { id: 'wrapup', label: 'Ticket wrap-up', description: 'Define completion, merge authorization, and scoped cleanup.', color: '#96672a', group: 'workflow', requires: ['verification'] },
];

export const sources: Record<SourceId, Source> = {
  product: { label: 'Product brief', color: '#456cd0', group: 'product' },
  baseline: { label: 'Application stack', color: '#50617c', group: 'stack' },
  deployment: { label: 'Deployment', color: '#356fa4', group: 'infrastructure' },
  dns: { label: 'Cloudflare DNS', color: '#a66a24', group: 'infrastructure' },
  ui: { label: 'UI / UX', color: '#98618e', group: 'interface' },
  tracking: { label: 'Work tracking', color: '#847033', group: 'workflow' },
  pr: { label: 'PR tooling', color: '#5f68a4', group: 'workflow' },
  questions: { label: 'Agent questions', color: '#3a7a86', group: 'workflow' },
  ...Object.fromEntries(modules.map(({ id, label, color, group }) => [id, { label, color, group }])),
} as Record<SourceId, Source>;

export function moduleById(id: ModuleId): Module {
  return modules.find((module) => module.id === id)!;
}
