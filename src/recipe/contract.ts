import { modules } from './catalog';
import type { ModuleId, RecipeConfig, SourceId } from './config';
import { blockSources, resolveRecipe, type Resolution } from './resolve';

export const sections = [
  'Product brief', 'Stack and structure', 'Infrastructure', 'Authentication',
  'UI / UX', 'Working rules', 'Acceptance requirements',
] as const;
export type Section = typeof sections[number];
export interface ContractBlock {
  id: string;
  section: Section;
  markdown: string;
  sources: SourceId[];
}
interface Context {
  config: RecipeConfig;
  resolved: Resolution;
}
interface Template {
  section: Section;
  title: string;
  render: (context: Context) => string;
}

const paragraphs = (...parts: string[]) => parts.filter(Boolean).join('\n\n');
const literal = (value: string) => value.replace(/[\\\u0060*_{}[\]<>()#+.!|~-]/g, '\\$&');
const valueOr = (value: string, placeholder: string) => literal(value.trim() || placeholder);
const field = (label: string, value: string) => value.trim()
  ? '### ' + label + '\n\n' + value.trim().split('\n').map((line) => '> ' + literal(line)).join('\n')
  : '';
const trackerName = (config: RecipeConfig) => ({
  none: 'the task', jira: 'the Jira ticket', linear: 'the Linear issue', markdown: 'the local Markdown ticket',
})[config.workflow.tracker];

const templates: Record<ModuleId, Template> = {
  monorepo: {
    section: 'Stack and structure', title: 'Workspace',
    render: () => 'Use a pnpm workspace managed by Turborepo. Put the application in apps/web and shared UI and domain code in packages/ui and packages/core. Keep build, typecheck, lint, and test tasks scoped to actual packages; do not create empty services.',
  },
  database: {
    section: 'Stack and structure', title: 'Persistence',
    render: ({ config }) => config.deployment.target === 'workers'
      ? 'Use Cloudflare D1 with Drizzle and its D1 adapter. Keep the schema and migrations in the repository. Use local Wrangler D1 for development and separate bindings and databases for staging and production. Document local and remote migration commands; apply migrations only to the intended environment.'
      : 'Use Postgres with Drizzle. Keep the schema and generated migrations in the repository. Read the connection string from DATABASE_URL, supplied through an ignored local environment file or deployment secrets. Document database creation and migration commands. Keep development and production data separate.',
  },
  redis: {
    section: 'Stack and structure', title: 'Cache',
    render: () => 'Use Redis only for explicitly needed cache or coordination behavior. Configure REDIS_URL through environment variables. Define expiration and cache-miss behavior; do not treat cached values as durable product data. Document how to start or connect to the development instance.',
  },
  docker: {
    section: 'Infrastructure', title: 'Containers',
    render: ({ resolved, config }) => paragraphs(
      config.deployment.target === 'vps'
        ? 'Provide a multi-stage application Dockerfile and Docker Compose deployment. Run the production Node.js build with a non-root user, a health check, and persistent storage only where needed.'
        : resolved.active.has('database') || resolved.active.has('redis')
          ? 'Provide Docker Compose for local development services. Keep the application runnable directly with pnpm dev.'
          : 'Provide a Dockerfile and Compose service for the application so it can run locally in a container. Also keep it runnable directly with pnpm dev.',
      'Include only the selected services' + (resolved.active.has('database') || resolved.active.has('redis')
        ? ': ' + [resolved.active.has('database') ? 'Postgres' : '', resolved.active.has('redis') ? 'Redis' : ''].filter(Boolean).join(' and ')
        : '') + '. Document service start, stop, logs, and data-volume behavior. Do not include credentials in images or committed Compose files.',
    ),
  },
  auth: {
    section: 'Authentication', title: 'Authentication foundation',
    render: ({ config }) => 'Use Better Auth with its Drizzle adapter and ' +
      (config.deployment.target === 'workers' ? 'D1' : 'Postgres') +
      '. Configure BETTER_AUTH_SECRET, the application base URL, trusted origins, and secure session cookies per environment. Enable only the selected login methods. Provide session-aware navigation, signout, protected routes, and appropriate server-side authorization. Keep signin and signup intent clear and preserve the intended post-login destination.',
  },
  email: {
    section: 'Infrastructure', title: 'Email delivery',
    render: ({ config }) => paragraphs(
      'Use Resend for transactional email. Configure RESEND_API_KEY as a secret and EMAIL_FROM as ' +
        valueOr(config.emailFrom, '<verified sender address>') + '. Verify the sender domain and document its DNS requirements.',
      'Write concise, accessible email templates for the selected authentication flows. For local development, document how to configure a test sender; show an actionable configuration error when email is unavailable. Never claim that an email was sent when the provider rejected it. Keep tokens and codes out of committed files and logs.',
    ),
  },
  password: {
    section: 'Authentication', title: 'Email and password',
    render: () => 'Provide distinct signup and signin flows, email verification and resend, forgot-password, and reset-password screens. Use Better Auth for hashing, tokens, and session handling. Cover invalid credentials, duplicate signup, unverified email, expired links, and retry states without revealing whether an arbitrary address has an account. After signup, explain the verification step; after password reset, return users to signin.',
  },
  emailCode: {
    section: 'Authentication', title: 'Email code',
    render: () => 'Use the Better Auth email OTP flow with short-lived, single-use codes. Distinguish signing in from creating an account; do not silently create an account from the signin-only journey. Provide email entry, code entry, resend cooldown, expiration, invalid-code, and retry states. Rate-limit code requests and verification attempts. After verification, continue to the intended destination.',
  },
  google: {
    section: 'Authentication', title: 'Google login',
    render: ({ resolved }) => paragraphs(
      'Add Google signin and signup through Better Auth. Document Google Cloud OAuth consent setup, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and the exact authorized origins and callback URLs for local, staging, and production environments. Keep secrets in ignored local files or deployment secrets. If credentials are missing, mark Google login unavailable with setup instructions.',
      'Handle canceled consent and provider errors, and apply explicit account-linking rules to avoid merging unrelated identities.',
      resolved.active.has('chromium')
        ? 'Use the selected persistent Chromium session for Google Console and consent setup. The user completes password and MFA prompts directly in that browser.'
        : 'Have the user complete provider authentication and MFA in their own browser when needed.',
    ),
  },
  git: {
    section: 'Working rules', title: 'Git repository',
    render: ({ config }) => paragraphs(
      'If the project is not already a Git repository, initialize it and establish the initial branch. Preserve existing history and unrelated changes. Add appropriate ignore rules for dependencies, build output, environment files, and runtime state.',
      config.workflow.remote.trim()
        ? 'Use this repository remote: ' + valueOr(config.workflow.remote, '') + '. Inspect existing remotes before adding or changing one; do not overwrite a different remote without resolving the conflict.'
        : 'Leave the remote unset until a repository URL is supplied.',
    ),
  },
  worktrees: {
    section: 'Working rules', title: 'Isolated worktrees',
    render: ({ config }) => 'Work on a dedicated branch in a separate worktree for ' + trackerName(config) +
      '. Use a project-specific directory under ~/.codex/worktrees/[project]/[branch]. Record the base revision and check ownership before reusing a worktree. Preserve unrelated work and services.',
  },
  runtime: {
    section: 'Working rules', title: 'Runtime isolation',
    render: () => 'Inspect existing listeners and containers before allocating free ports. Use a unique Compose project when containers are selected; check rendered port mappings, names, volumes, and networks. Verify actual bindings after startup. Keep a local runtime record with URLs, resource names, and scoped start/stop commands, excluding secrets. Configure APIs, WebSockets, and auth callbacks for the actual review origin.',
  },
  chromium: {
    section: 'Working rules', title: 'Persistent Chromium',
    render: ({ resolved }) => paragraphs(
      'Create a persistent project browser profile at [project-root]/.chromium, excluded from Git and restricted to its owner. Share the same visible session with the user for account setup and consent. Bind Chrome DevTools Protocol to loopback on an available port. Record scoped startup instructions and runtime details under .chromium. Reuse this profile across worktrees, preserve it during task cleanup, and detach automation clients without closing the user’s browser.',
      'The user completes passwords and MFA. Keep cookies, tokens, passwords, and client secrets out of commits, tickets, and logs.',
      resolved.active.has('tailnet')
        ? 'If remote browser control is needed, expose CDP only through a scoped, authenticated tailnet route. Record the actual reachable endpoint and verify it; never expose CDP publicly.'
        : '',
    ),
  },
  tailnet: {
    section: 'Working rules', title: 'Tailnet review access',
    render: () => 'Use Tailscale to provide a durable review URL reachable by the user’s authorized tailnet devices. Inspect existing routes before adding a project-scoped route. Keep the review instance running until task wrap-up. Verify the exact URL and peer access where possible; report access requirements and unverified limits. Record a scoped stop command and preserve unrelated routes.',
  },
  cleanup: {
    section: 'Working rules', title: 'Code cleanup',
    render: () => 'Before delivery, review every touched file and the final diff. Remove unnecessary generated comments, defensive checks, casts, abstractions, and duplication. Follow surrounding conventions and keep the implementation proportional to the problem.',
  },
  verification: {
    section: 'Acceptance requirements', title: 'Verification',
    render: ({ resolved }) => paragraphs(
      'Run the project’s type checks, linting, relevant automated tests, and production build. Exercise the requested MVP journeys with safe data, including desktop/mobile layouts and loading, empty, error, and success states. Fix scoped defects and rerun affected checks. Report exactly which checks passed and any incomplete checks.',
      resolved.active.has('auth')
        ? 'Verify every selected authentication method end to end, including signout, protected-route access, invalid or expired credentials, and the return destination. Distinguish mocked provider checks from live provider verification.'
        : '',
      'Confirm the chosen deployment recipe builds and starts in its intended runtime. Document required configuration and migrations without claiming an unperformed deployment succeeded.',
    ),
  },
  demo: {
    section: 'Acceptance requirements', title: 'Demo evidence',
    render: ({ config }) => paragraphs(
      'Record a playable final demo and screenshots of the acceptance journey. Inspect frames for functional defects, spacing, clipping, and readability. Leave at least 800 ms between interactions and keep typing or narration at no more than 100 words per minute. Retain evidence and the tested revision outside temporary output.',
      config.workflow.tracker === 'jira' || config.workflow.tracker === 'linear'
        ? 'Attach the useful evidence and acceptance results to ' + trackerName(config) + ' and verify attachment accessibility.'
        : 'Record evidence locations alongside the task results.',
      'Documentation-only changes need a reviewed diff and applicable checks, without a video or running instance.',
    ),
  },
  wrapup: {
    section: 'Working rules', title: 'Ticket wrap-up',
    render: ({ config, resolved }) => paragraphs(
      'An explicit user request to wrap up ' + trackerName(config) + ' authorizes the completion sequence. Complete verification and resolve scoped findings first; keep the task open if required checks remain incomplete.',
      resolved.active.has('git')
        ? 'After verification, the wrap-up request authorizes merging the task branch into the main branch. Verify the merge before marking work complete. Deployment requires separate authorization.'
        : 'Mark the task complete only after verification. This recipe has no Git merge workflow; deployment requires separate authorization.',
      'Remove only worktrees, services, containers, and routes created for this task, after preserving evidence and unrelated work. Preserve the shared Chromium profile when selected. Verify cleanup and report the resulting status, references, and remaining resources.',
    ),
  },
};

export function buildContract(config: RecipeConfig) {
  const resolved = resolveRecipe(config);
  const blocks: ContractBlock[] = [];
  const add = (id: string, section: Section, markdown: string, sources: SourceId[]) => {
    if (markdown) blocks.push({ id, section, markdown, sources: [...new Set(sources)] });
  };
  const title = (config.product.name.trim() || 'Untitled project').replace(/[\r\n]+/g, ' ') + ' — Project contract';
  add('product', 'Product brief', paragraphs(
    'Build the project described below from a fresh repository. Treat this contract as the project brief. Keep the implementation self-contained; do not depend on another project’s source code or private configuration.',
    field('Purpose', config.product.description || '[Describe the product to complete this brief.]'),
    field('Intended users', config.product.audience),
    field('MVP requirements', config.product.requirements),
    field('Out of scope', config.product.exclusions),
  ), ['product']);
  add('baseline', 'Stack and structure',
    'Use TypeScript, React, TanStack Start with Vite, and pnpm. Build the interface with Tailwind CSS and shadcn/ui. Use mutually compatible stable versions and commit the lockfile. Keep modules cohesive and expose documented development and production build commands.' +
    (resolved.active.has('monorepo') ? '' : ' Start with one application package; organize source by feature.'), resolved.active.has('monorepo') ? ['baseline', 'monorepo'] : ['baseline']);
  for (const module of modules) {
    if (!resolved.active.has(module.id)) continue;
    const template = templates[module.id];
    const attribution = blockSources(module.id, resolved);
    if (['database', 'docker', 'auth'].includes(module.id)) attribution.push('deployment');
    if (module.id === 'docker') {
      if (resolved.active.has('database')) attribution.push('database');
      if (resolved.active.has('redis')) attribution.push('redis');
    }
    if ((module.id === 'chromium' && resolved.active.has('tailnet')) ||
        (module.id === 'google' && resolved.active.has('chromium'))) {
      attribution.push(module.id === 'google' ? 'chromium' : 'tailnet');
    }
    if (['wrapup', 'worktrees', 'demo'].includes(module.id) && config.workflow.tracker !== 'none') attribution.push('tracking');
    if (module.id === 'verification' && resolved.active.has('auth')) attribution.push('auth');
    if (module.id === 'wrapup' && resolved.active.has('git')) attribution.push('git');
    add(module.id, template.section, '### ' + template.title + '\n\n' + template.render({ config, resolved }), attribution);
  }
  const target = config.deployment.target;
  add('deployment', 'Infrastructure', '### Deployment target\n\n' + (
    target === 'workers'
      ? 'Target Cloudflare Workers. Use the Cloudflare Vite plugin and Wrangler, with a compatible date and the required Node.js compatibility flag. Use Wrangler local development and environment-specific bindings. Keep staging and production separate. Store secrets using Wrangler secrets and ignored local .dev.vars files. Document build, preview, binding setup, and deployment commands. Do not combine the Workers adapter with a Node.js deployment adapter.'
      : target === 'vps'
        ? 'Target a ' + (config.deployment.vpsProvider === 'hetzner' ? 'Hetzner' : 'generic') +
          ' VPS using Docker Compose. Build TanStack Start for Node.js using its supported Nitro adapter. Configure a reverse proxy with HTTPS, application health checks, persistent service volumes where needed, and environment secrets outside the image. Document server prerequisites, deployment, restart, logs, backups for selected storage, and rollback to the previous image. Use [server-address] until supplied.'
        : 'Deliver a locally runnable Node.js application. Document pnpm install, pnpm dev, the production build, and the supported Node.js start command using TanStack Start’s Nitro deployment adapter. Document setup for selected services. No production hosting target is selected.'
  ), ['deployment']);
  if (resolved.dns) add('dns', 'Infrastructure',
    '### Domain and DNS\n\nUse Cloudflare DNS for ' + valueOr(config.deployment.domain, '<project-domain>') +
    (target === 'workers'
      ? '. Configure the Worker custom domain and document the matching application URL and OAuth callbacks when authentication is selected.'
      : target === 'vps'
        ? '. Point the required records to [server-address], configure HTTPS with the VPS reverse proxy, and document the proxy and TLS settings.'
        : '. Document domain and zone setup. Leave application DNS record targets as placeholders until a hosting target is chosen; defer live application routing and HTTPS configuration until then.') +
    ' Inspect existing DNS records and preserve unrelated records.', ['dns', 'deployment']);

  add('ui', 'UI / UX', paragraphs(
    '### Interface direction',
    'Use a ' + config.ui.style + ' visual style with ' +
      (config.ui.navigation === 'sidebar' ? 'sidebar navigation' : 'top navigation') +
      '. Set the theme to ' + (config.ui.theme === 'system' ? 'follow the system preference' : config.ui.theme) +
      ' and use a ' + config.ui.color + ' primary palette.',
    config.ui.style === 'minimal'
      ? 'Keep the design barebones, clear, and functional. Prioritize the core task over decorative elements.'
      : 'Use consistent typography, spacing, and restrained visual hierarchy. Polish the core screens without introducing unrelated features.',
    'Use responsive layouts, visible keyboard focus, labeled controls, accessible contrast, and clear loading, empty, error, and success states.',
    field('Core screens', config.product.screens),
    field('Additional interface requirements', config.ui.notes),
  ), config.product.screens.trim() ? ['ui', 'product'] : ['ui']);

  if (config.workflow.tracker !== 'none') add('tracking', 'Working rules', paragraphs(
    '### Work tracking',
    config.workflow.tracker === 'markdown'
      ? 'Track work in local Markdown files under tasks/, with a stable identifier, title, status, requirements, acceptance criteria, and progress notes. Read the matching task before substantive work. Update the same file at planning, implementation, blocker, verification, and review milestones. Awaiting review is not Done.'
      : 'Use ' + (config.workflow.tracker === 'jira' ? 'Jira' : 'Linear') +
        '. Read the supplied ticket or search for a matching issue before substantive planning or implementation. Before creating an issue, show the project, type, title, and description, ask for acknowledgement, and wait. Preserve default priority and assignment. Update the same issue at planning, implementation, blocker, verification, and review milestones; awaiting review is not Done. Report access blockers and obtain an explicit exception before substituting another tracking system.',
  ), ['tracking']);
  if (config.workflow.pr !== 'none') add('pr', 'Working rules', paragraphs(
    '### Pull requests',
    'Use ' + (config.workflow.pr === 'gh' ? 'GitHub CLI (gh)' : 'Cursor Origin (origin)') +
      ' for pull requests, reviews, and checks; inspect installed command help. Find the existing branch PR before creating a draft. Use a body file for multiline descriptions.',
    config.workflow.pr === 'origin'
      ? 'After further pushes, run origin pr refresh and verify that the review snapshot matches the current head revision.'
      : 'After further pushes, verify that the PR references the current head revision and inspect its required checks.',
    config.workflow.tracker !== 'none' ? 'Link the verified pull request from ' + trackerName(config) + '.' : '',
    'Merge and deployment require explicit authorization, including the selected wrap-up authorization if applicable.',
  ), config.workflow.tracker !== 'none' ? ['pr', 'tracking'] : ['pr']);
  if (config.workflow.questions !== 'none') add('questions', 'Working rules',
    '### Agent questions\n\nUse the native agent question tool when user input is needed; use chat if it is unavailable.' +
    ' Wait for an answer before continuing dependent work; continue independent work where possible.', ['questions']);

  const ordered = sections.flatMap((section) => blocks.filter((block) => block.section === section));
  const markdown = '# ' + literal(title) + '\n\n' + sections.flatMap((section) => {
    const content = ordered.filter((block) => block.section === section);
    return content.length ? ['## ' + section + '\n\n' + content.map((block) => block.markdown).join('\n\n')] : [];
  }).join('\n\n') + '\n';
  return { title, blocks: ordered, markdown, resolved };
}
