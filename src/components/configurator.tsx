import { Box, Check, CircleHelp, Layers3, LockKeyhole, FileText, Palette, SlidersHorizontal, Cloud } from 'lucide-react';
import type { ReactNode } from 'react';
import { modules, sources, type Module } from '@/recipe/catalog';
import type { Group, RecipeConfig, SourceId } from '@/recipe/config';
import type { Resolution } from '@/recipe/resolve';
import { Checkbox } from './ui/checkbox';
import { SelectField, TextField } from './fields';
import { SourceControl } from './source';

export const groups: { id: Group; label: string; title: string; description: string }[] = [
  { id: 'product', label: 'Product', title: 'The product brief', description: 'What you’re building, who it’s for, and what comes first.' },
  { id: 'stack', label: 'Stack', title: 'Stack & services', description: 'Solid foundations, with only the extras you need.' },
  { id: 'infrastructure', label: 'Infra', title: 'Infrastructure', description: 'From your machine to a home on the internet.' },
  { id: 'interface', label: 'UI / UX', title: 'Look & feel', description: 'Give the first build a clear visual direction.' },
  { id: 'workflow', label: 'Rules', title: 'Working rules', description: 'Set the standards. Keep the workflow yours.' },
];
const groupIcons = { product: FileText, stack: Layers3, infrastructure: Cloud, interface: Palette, workflow: SlidersHorizontal };

interface Props {
  config: RecipeConfig;
  onChange: (next: RecipeConfig) => void;
  group: Group;
  resolved: Resolution;
  active: SourceId | null;
  onHighlight: (id: SourceId | null) => void;
}

export function Configurator({ config, onChange, group, resolved, active, onHighlight }: Props) {
  const description = groups.find((item) => item.id === group)!;
  const Icon = groupIcons[group];
  const updateProduct = (key: keyof RecipeConfig['product'], value: string) =>
    onChange({ ...config, product: { ...config.product, [key]: value } });
  const updateUI = <K extends keyof RecipeConfig['ui']>(key: K, value: RecipeConfig['ui'][K]) =>
    onChange({ ...config, ui: { ...config.ui, [key]: value } });
  const updateWorkflow = <K extends keyof RecipeConfig['workflow']>(key: K, value: RecipeConfig['workflow'][K]) =>
    onChange({ ...config, workflow: { ...config.workflow, [key]: value } });
  const updateDeployment = <K extends keyof RecipeConfig['deployment']>(key: K, value: RecipeConfig['deployment'][K]) =>
    onChange({ ...config, deployment: { ...config.deployment, [key]: value } });
  const wrap = (id: SourceId, children: ReactNode) =>
    <SourceControl key={id} id={id} active={active} onHighlight={onHighlight}>{children}</SourceControl>;

  function option(module: Module) {
    const excluded = config.deployment.target === 'workers' && module.workersExcluded;
    const reasons = [...(resolved.requiredBy.get(module.id) ?? [])];
    const checked = resolved.active.has(module.id);
    if (module.internal && !checked) return null;
    return wrap(module.id, <label className={'option-row ' + (excluded ? 'option-excluded' : '')} htmlFor={'option-' + module.id}>
      <Checkbox id={'option-' + module.id} checked={checked} disabled={excluded || reasons.length > 0}
        aria-label={module.label}
        aria-describedby={'option-help-' + module.id}
        onCheckedChange={(value) => onChange({ ...config, selected: value === true
          ? [...config.selected, module.id] : config.selected.filter((id) => id !== module.id) })} />
      <span className="option-text">
        <span className="option-label">{module.label}<span className="source-dot" style={{ background: module.color }} /></span>
        <span className="option-description" id={'option-help-' + module.id}>{module.description}</span>
        {reasons.length > 0 && <span className="dependency"><LockKeyhole size={10} />Required by {reasons.map((id) => sources[id].label).join(', ')}</span>}
        {excluded && <span className="dependency">Not included on Workers{config.selected.includes(module.id) ? ' · saved for Node.js' : ''}</span>}
      </span>
    </label>);
  }
  const options = (ids: string[]) => <div className="option-list">{modules.filter((module) => ids.includes(module.id)).map(option)}</div>;

  return <section className="config-content" id={'section-' + group} aria-labelledby={'heading-' + group} tabIndex={-1}>
    <div className="group-intro"><span className="group-icon"><Icon size={19} /></span><div><h2 id={'heading-' + group}>{description.title}</h2><p>{description.description}</p></div></div>
    {group === 'product' && wrap('product', <>
      <TextField label="Project name" value={config.product.name} onChange={(value) => updateProduct('name', value)} placeholder="e.g. Field Notes" required maxLength={160} />
      <TextField label="What are you building?" value={config.product.description} onChange={(value) => updateProduct('description', value)} placeholder="A notebook for researchers to collect observations and organize their findings." multiline required />
      <TextField label="Who is it for?" value={config.product.audience} onChange={(value) => updateProduct('audience', value)} placeholder="Independent researchers" />
      <TextField label="MVP requirements" value={config.product.requirements} onChange={(value) => updateProduct('requirements', value)} placeholder="What must the first version do?" multiline />
      <TextField label="Out of scope" value={config.product.exclusions} onChange={(value) => updateProduct('exclusions', value)} placeholder="What should wait until later?" multiline />
      <TextField label="Core screens" value={config.product.screens} onChange={(value) => updateProduct('screens', value)} placeholder="Notes list, note editor, settings" multiline hint="These also appear in the UI / UX section of your prompt." />
    </>)}
    {group === 'stack' && <>
      {wrap('baseline', <div className="baseline-card">
        <div className="card-heading"><Layers3 size={17} /><strong>The application stack</strong><span className="included"><Check size={12} />Included</span></div>
        <p>TanStack Start + React</p><div className="tech-tags">{['TypeScript', 'Vite', 'pnpm', 'Tailwind', 'shadcn/ui'].map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>)}
      <h3 className="control-heading">Structure & data</h3>
      {options(['monorepo', 'database', 'redis'])}
      <h3 className="control-heading">Login methods</h3>
      <p className="section-note">Selecting a method includes Better Auth and its prerequisites.</p>
      {options(['password', 'emailCode', 'google', 'auth'])}
      <h3 className="control-heading">Email delivery</h3>
      {options(['email'])}
      {resolved.active.has('email') && <TextField label="Sender address" value={config.emailFrom} onChange={(emailFrom) => onChange({ ...config, emailFrom })} placeholder="hello@your-domain.com" maxLength={320} hint="Optional. Leave blank to generate a setup placeholder." />}
    </>}
    {group === 'infrastructure' && <>
      {wrap('deployment', <>
        <SelectField label="Deployment target" value={config.deployment.target} onChange={(value) => updateDeployment('target', value)}>
          <option value="local">Local development only</option><option value="vps">Docker on a VPS</option><option value="workers">Cloudflare Workers</option>
        </SelectField>
        {config.deployment.target === 'vps' && <SelectField label="VPS provider" value={config.deployment.vpsProvider} onChange={(value) => updateDeployment('vpsProvider', value)}><option value="hetzner">Hetzner</option><option value="generic">Generic VPS</option></SelectField>}
        <div className="info-card"><Box size={17} /><p>{config.deployment.target === 'workers' ? 'Workers uses local Wrangler development and D1 when storage is selected. Node.js-only services are left out of this recipe.' : config.deployment.target === 'vps' ? 'The VPS recipe includes Docker automatically. Selected Postgres and Redis services run alongside your application.' : 'A runnable Node.js application, without production hosting instructions. Add Docker if you want containerized local services.'}</p></div>
      </>)}
      <h3 className="control-heading">Local services</h3>{options(['docker'])}
      {wrap('dns', <>
        <h3 className="control-heading">Domain</h3>
        <label className="option-row" htmlFor="option-dns"><Checkbox id="option-dns" aria-label="Cloudflare DNS" checked={resolved.dns}
          onCheckedChange={(value) => updateDeployment('cloudflareDns', value === true)} />
          <span className="option-text"><span className="option-label">Cloudflare DNS<span className="source-dot" style={{ background: sources.dns.color }} /></span><span className="option-description">{config.deployment.target === 'local' ? 'Plan domain setup now; configure application routing when hosting is chosen.' : 'DNS and HTTPS instructions for your deployment target.'}</span></span>
        </label>
        {resolved.dns && <TextField label="Project domain" value={config.deployment.domain} onChange={(value) => updateDeployment('domain', value)} placeholder="your-project.com" maxLength={253} hint="Optional. No server addresses or credentials are needed here." />}
      </>)}
    </>}
    {group === 'interface' && wrap('ui', <>
      <SelectField label="Visual style" value={config.ui.style} onChange={(value) => updateUI('style', value)}><option value="minimal">Minimal & functional</option><option value="polished">Polished & considered</option></SelectField>
      <SelectField label="Navigation" value={config.ui.navigation} onChange={(value) => updateUI('navigation', value)}><option value="sidebar">Sidebar navigation</option><option value="top">Top navigation</option></SelectField>
      <SelectField label="Theme" value={config.ui.theme} onChange={(value) => updateUI('theme', value)}><option value="system">Follow system preference</option><option value="light">Light</option><option value="dark">Dark</option></SelectField>
      <SelectField label="Primary color" value={config.ui.color} onChange={(value) => updateUI('color', value)}><option value="neutral">Neutral</option><option value="blue">Blue</option><option value="green">Green</option><option value="violet">Violet</option><option value="orange">Orange</option></SelectField>
      <div className="palette-preview" aria-hidden style={{ '--palette': { neutral: '#526176', blue: '#3157cf', green: '#28755c', violet: '#7c53a7', orange: '#aa5336' }[config.ui.color] } as React.CSSProperties}>
        <span /><span /><span /><span /><p>Your project’s accent</p>
      </div>
      <TextField label="Interface notes" value={config.ui.notes} onChange={(value) => updateUI('notes', value)} placeholder="Any interaction patterns, wording, or visual constraints?" multiline />
      <div className="info-card"><CircleHelp size={17} /><p>These choices describe the project you’ll build. They don’t change Contractor’s interface.</p></div>
    </>)}
    {group === 'workflow' && <>
      {wrap('tracking', <SelectField label="Work tracking" value={config.workflow.tracker} onChange={(value) => updateWorkflow('tracker', value)}>
        <option value="none">None</option><option value="jira">Jira</option><option value="linear">Linear</option><option value="markdown">Local Markdown tickets</option>
      </SelectField>)}
      {wrap('pr', <SelectField label="PR & review tooling" value={config.workflow.pr} onChange={(value) => updateWorkflow('pr', value)} hint="Git manages the repository. These tools manage pull requests.">
        <option value="none">None</option><option value="gh">GitHub CLI (gh)</option><option value="origin">Cursor Origin</option>
      </SelectField>)}
      {wrap('questions', <SelectField label="Agent questions" value={config.workflow.questions} onChange={(value) => updateWorkflow('questions', value)}>
        <option value="none">No additional rules</option><option value="native">Native question tool</option>
      </SelectField>)}
      <h3 className="control-heading">Repository & workspace</h3>
      {options(['git', 'worktrees', 'runtime'])}
      {resolved.active.has('git') && <TextField label="Repository remote" value={config.workflow.remote} onChange={(value) => updateWorkflow('remote', value)} placeholder="https://github.com/you/project.git" maxLength={2_048} hint="Optional. Existing remotes are preserved until conflicts are resolved." />}
      <h3 className="control-heading">Shared review environment</h3>{options(['chromium', 'tailnet'])}
      <h3 className="control-heading">Delivery standards</h3>{options(['cleanup', 'verification', 'demo', 'wrapup'])}
    </>}
  </section>;
}
