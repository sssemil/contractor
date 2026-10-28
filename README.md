# Contractor

A browser-only project recipe builder. Choose product requirements, an application stack, infrastructure, UI direction, and working rules. Contractor composes one self-contained Markdown prompt for a coding agent.

The desktop workspace pairs a continuous, scrollable form with a live document preview. All five configuration sections stay on the page; the jump links scroll to them without hiding other sections. Colored markers and source labels connect each block to its contributing choices. On mobile, Configure and Preview share the same state.

## Run locally

Requires Node.js 20.19+ and pnpm 9.15.

    pnpm install --frozen-lockfile
    pnpm dev

Open the URL printed by Vite. The default development port is 5173. Pass an available port explicitly when other projects are running:

    pnpm dev --port 5174 --strictPort

## Check and build

    pnpm check
    pnpm exec playwright install chromium
    pnpm test:e2e

- `pnpm check` runs type checking, ESLint, engine tests, and a production build.
- Browser tests run against the production build on an exclusive local port, 4173. They cover dependency changes, source navigation, target switching, persistence, imports, downloads, clipboard fallback, untrusted text, and mobile navigation.
- `pnpm test` runs the contract and configuration tests, including reviewed output fixtures.
- `pnpm build` produces the deployable static site in `dist/`.
- `pnpm preview` serves that build locally. Any static host can serve `dist/`; there is no API server or database.

The test suite saves desktop/mobile screenshots under the ignored `.local/` directory. Failure screenshots and traces live in `test-results/`.

## GitHub Pages

The site is published at [sssemil.github.io/contractor](https://sssemil.github.io/contractor/).

Pushes to `main` run the Pages workflow: frozen dependency installation, type checking, linting, unit tests, a production build, and browser tests. Only the built `dist/` directory is uploaded. The deployment uses GitHub's built-in token; no personal deployment credentials are required.

The workflow sets `VITE_BASE_PATH=/contractor/` for the project-site URL. Local development defaults to `/`. To check the Pages build locally:

    VITE_BASE_PATH=/contractor/ pnpm check
    VITE_BASE_PATH=/contractor/ pnpm test:e2e
    VITE_BASE_PATH=/contractor/ pnpm preview

Open `http://localhost:4173/contractor/` when previewing that build. Drafts remain in each visitor's browser; the published site contains only the application and its built-in recipes.

## Using the builder

1. Pick a starting point, or customize the recommended Web app defaults.
2. Supply a project name and description. Other product fields are optional.
3. Scroll through the stack, infrastructure, UI, and working rules; everything is editable in one form.
4. Review the prompt, then copy it or download Markdown.

### Starting points

| Preset | Included setup |
| --- | --- |
| Web app (default) | Turborepo, Postgres/Drizzle, Redis, password/email-code/Google login, local Docker, Cloudflare DNS, Git/worktrees, runtime isolation, persistent Chromium, tailnet review, code cleanup, verification, demo evidence, and ticket wrap-up. Local Markdown tasks, GitHub CLI, and native agent questions are selected. |
| Cloudflare app | Workers, D1, email-code and Google login, Cloudflare DNS, and the basic development workflow; no Docker, Redis, or additional review options. |
| VPS app | Hetzner, Postgres, Docker, email-code and Google login, Cloudflare DNS, and the basic development workflow. |
| Lean prototype | Local application with Git, code cleanup, verification, and native agent questions. No authentication, database, or production hosting. |

The app presets use a polished sidebar interface with a system theme and blue accent. Lean prototype uses the minimal neutral interface.

Applying a preset replaces setup choices while preserving all product fields, interface notes, sender address, domain, and repository URL. **Undo preset** restores the prior settings until you edit the recipe again. Manual setup changes mark the recipe as custom. Existing saved drafts and imported recipes keep their settings; choose a preset explicitly to apply the new defaults to an older draft.

Required modules appear automatically with a “Required by” explanation. Removing a dependent choice removes its unused prerequisites, except those explicitly selected beforehand. A required checkbox remains locked until its dependents are removed.

The Node.js recipe uses Postgres with Drizzle when storage is selected. The Workers recipe uses D1. Switching to Workers excludes Docker and Redis without deleting those explicit preferences; switching back restores them. Cloudflare DNS can also be selected in local-only mode: the prompt plans domain setup and defers live application routing until hosting is chosen.

Every preset selection can be customized. The Web app preset enables Redis, password login, Cloudflare DNS, tailnet review access, demo evidence, and ticket wrap-up by default. Git and PR tooling are separate: GitHub CLI and Cursor Origin require Git, but do not select a work tracker. Jira, Linear, and Markdown tickets contribute only their own instructions.

Hover or focus a control to highlight its prompt blocks. Click a document source label to navigate back to the corresponding control. Source labels and colors are preview aids and are absent from the exported prompt.

## Saving and exporting

The current draft is autosaved to this browser’s local storage under `contractor.recipe.v1`. No recipe content is sent to a server. Fonts and application assets are served locally.

- **Export recipe** downloads versioned JSON containing explicit choices, including inactive target preferences. Incomplete drafts can be exported.
- **Import** validates the whole file before asking to replace the current draft. Invalid or unsupported files leave it unchanged.
- **Copy prompt** and Markdown download require a nonblank name and description.
- If storage is unavailable, use JSON export. If clipboard permission is unavailable, use the manual-copy dialog or Markdown download.
- Reset and successful import both require confirmation before replacing a draft. Reset starts a fresh brief with the recommended Web app defaults.

This is not encrypted storage. The builder asks for configuration names and optional public identifiers, not credentials; the output uses placeholders for secrets and unknown infrastructure details.

## Implementation

Contractor itself is a single-package React/Vite application with TypeScript, Tailwind, and locally owned shadcn-style Radix UI primitives. The generated project recipes use TanStack Start.

- `src/recipe/`: validated configuration, presets, source catalog, dependency resolution, deterministic document composition, and output fixtures.
- `src/components/`: configuration controls, source navigation, preview, and UI primitives.
- `src/lib/`: local draft persistence, file download, and class utilities.
- `tests/`: browser acceptance journeys.

`RecipeConfig` stores version 1 inputs and explicit selections. The resolver derives effective modules and reasons without mutating the configuration. Templates produce `ContractBlock` records with stable IDs, section names, Markdown, and source IDs. Preview, clipboard, and download consume the same generated contract.

To add a module, register its ID and metadata, define its dependencies and template, place its control in a group, and add behavior tests. Dependencies must remain acyclic. Include all choices that affect a block in its source IDs. Review output changes before updating snapshots.

Template guidance was grounded in the supplied repository operating guide and these official deployment references:

- [TanStack Start hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Start on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)

Generated prompts contain no dependency on those repositories’ code, accounts, paths, or live infrastructure.

## V1 boundaries

One supported application stack, two production infrastructure variants, and local development. Contractor generates instructions, not starter code. There are no AI calls, accounts, cloud-saved recipes, provisioning actions, public sharing links, or automatic deployments.
