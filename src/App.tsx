import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Braces, Copy, Download, FileDown, FileUp, PanelLeft, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { Configurator, groups } from './components/configurator';
import { Preview } from './components/preview';
import { PresetPicker } from './components/preset-picker';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { buildContract } from './recipe/contract';
import { sources } from './recipe/catalog';
import { defaultRecipe, exportReady, filename, MAX_RECIPE_BYTES, parseRecipe, type RecipeConfig, type SourceId } from './recipe/config';
import { applyPreset, presets, type PresetId } from './recipe/presets';
import { downloadFile, useDraft } from './lib/draft';

type Pending = { kind: 'import'; config: RecipeConfig } | { kind: 'reset' };

export default function App() {
  const { config, updateConfig, storageIssue, saved } = useDraft();
  const [active, setActive] = useState<SourceId | null>(null);
  const [mobilePane, setMobilePane] = useState<'configure' | 'preview'>('configure');
  const [raw, setRaw] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [manualCopy, setManualCopy] = useState(false);
  const [presetUndo, setPresetUndo] = useState<RecipeConfig | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const configScroll = useRef<HTMLDivElement>(null);
  const contract = useMemo(() => buildContract(config), [config]);
  const ready = exportReady(config);
  const includedCount = new Set(contract.blocks.flatMap((block) => block.sources)).size;
  const wordCount = contract.markdown.trim().split(/\s+/).length;
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function changeRecipe(next: RecipeConfig) {
    updateConfig(next);
    setPresetUndo(null);
  }
  function selectPreset(id: PresetId) {
    setPresetUndo(config);
    updateConfig(applyPreset(config, id));
    setMessage(presets.find((preset) => preset.id === id)!.label + ' preset applied. Your project details are preserved.');
    setActive(null);
  }
  function navigateSource(id: SourceId) {
    setMobilePane('configure');
    setActive(id);
    window.setTimeout(() => {
      const control = document.getElementById('control-' + id);
      control?.scrollIntoView({ block: 'center', behavior: 'instant' });
      control?.focus({ preventScroll: true });
    }, 0);
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > MAX_RECIPE_BYTES) throw new Error('Recipe is too large. Choose a JSON export under 2 MB.');
      const imported = parseRecipe(await file.text());
      setPending({ kind: 'import', config: imported });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not read this file. Your current draft has not changed.');
    }
  }
  function confirmReplacement() {
    if (!pending) return;
    changeRecipe(pending.kind === 'import' ? pending.config : defaultRecipe());
    setMessage(pending.kind === 'import' ? 'Recipe imported. Your prompt is ready to review.' : 'Fresh draft started with the Web app defaults.');
    setPending(null);
    setActive(null);
    configScroll.current?.scrollTo({ top: 0 });
    setMobilePane('configure');
  }
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(contract.markdown);
      setMessage('Prompt copied. Paste it into your coding agent.');
    } catch {
      setManualCopy(true);
    }
  }

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="./" aria-label="Contractor home"><span className="brand-symbol"><Braces size={22} /></span><strong>contractor<span className="brand-period">.</span></strong></a>
      <span className="brand-caption">PROJECT RECIPE BUILDER</span>
      <div className="header-actions">
        <span className={'save-status ' + (storageIssue ? 'save-warning' : '')}><span />{storageIssue ? 'Not saved' : saved ? 'Saved locally' : 'Saving…'}</span>
        <Button variant="ghost" size="sm" onClick={() => input.current?.click()}><FileUp /><span>Import</span></Button>
        <Button variant="outline" size="sm" onClick={() => {
          downloadFile(JSON.stringify(config, null, 2) + '\n', filename(config, 'json'), 'application/json');
          setMessage('Recipe exported. Import this file to continue later.');
        }}><FileDown /><span>Export recipe</span></Button>
        <Button variant="ghost" size="icon" aria-label="Reset recipe" title="Reset recipe" onClick={() => setPending({ kind: 'reset' })}><RotateCcw /></Button>
      </div>
      <input ref={input} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="Import recipe file" onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
    </header>

    {storageIssue && <div className="storage-alert" role="alert">{storageIssue}</div>}
    <div className="mobile-tabs" aria-label="Workspace view">
      <button type="button" aria-pressed={mobilePane === 'configure'} onClick={() => setMobilePane('configure')}><PanelLeft size={15} />Configure</button>
      <button type="button" aria-pressed={mobilePane === 'preview'} onClick={() => setMobilePane('preview')}><Braces size={15} />Preview<span>{contract.blocks.length}</span></button>
    </div>

    <main className={'workspace mobile-' + mobilePane}>
      <section className="configure-pane" aria-label="Recipe configuration">
        <nav className="jump-nav" aria-label="Jump to section">
          <span>Jump to<ArrowDown size={12} /></span>
          {groups.map((item) => <a key={item.id} href={'#section-' + item.id} onClick={(event) => {
            event.preventDefault();
            document.getElementById('section-' + item.id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
            document.getElementById('section-' + item.id)?.focus({ preventScroll: true });
          }}>{item.label}</a>)}
        </nav>
        <div className="config-scroll" ref={configScroll}>
          <PresetPicker config={config} onSelect={selectPreset} />
          {presetUndo && <div className="preset-undo"><span>Changed your mind?</span><button type="button" onClick={() => {
            changeRecipe(presetUndo);
            setMessage('Previous settings restored.');
          }}>Undo preset</button></div>}
          {groups.map(({ id }) => <Configurator key={id} config={config} onChange={changeRecipe} group={id} resolved={contract.resolved} active={active} onHighlight={setActive} />)}
          <div className="config-end"><ShieldCheck size={16} /><div><strong>Your recipe, your rules.</strong><p>Everything above is editable. Copy your prompt whenever you’re ready.</p></div></div>
        </div>
      </section>

      <section className="preview-pane" aria-label="Live prompt">
        <div className="preview-toolbar">
          <div className="preview-title"><span className="live-dot" /><strong>Live contract</strong><span className="read-only">READ ONLY</span></div>
          <div className="view-toggle" aria-label="Preview format">
            <button type="button" aria-pressed={!raw} onClick={() => setRaw(false)}>Document</button>
            <button type="button" aria-pressed={raw} onClick={() => setRaw(true)}>Markdown</button>
          </div>
        </div>
        {contract.resolved.excluded.length > 0 && <div className="exclusion-notice" role="status">Excluded on Workers: {contract.resolved.excluded.map((id) => sources[id].label).join(', ')}. Your Node.js choices are saved.</div>}
        <Preview contract={contract} active={active} onSource={navigateSource} raw={raw} />
        <footer className="preview-footer">
          <div className="contract-meta"><span>{includedCount} sources<span className="meta-separator">·</span>{wordCount.toLocaleString()} words</span>
            <small>{ready ? 'Ready for your coding agent' : 'Add a project name and description to export.'}</small></div>
          <div className="export-actions"><Button variant="outline" disabled={!ready} onClick={() => {
            downloadFile(contract.markdown, filename(config, 'md'), 'text/markdown;charset=utf-8');
            setMessage('Markdown contract downloaded.');
          }} aria-label="Download Markdown"><Download /><span className="download-label">.md</span></Button>
            <Button disabled={!ready} onClick={() => void copyPrompt()}><Copy />Copy prompt</Button>
          </div>
        </footer>
      </section>
    </main>
    <footer className="app-footer"><span><ShieldCheck size={12} />Your recipe stays in this browser.</span><span>One clear brief. A better starting point.</span></footer>

    {message && <div className="toast" role="status"><span>{message}</span><Button variant="ghost" size="icon" aria-label="Dismiss message" onClick={() => setMessage('')}><X /></Button></div>}
    <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}
      title={pending?.kind === 'import' ? 'Replace this draft?' : 'Start a fresh recipe?'}
      description={pending?.kind === 'import' ? 'The imported recipe will replace your current draft. Export your current recipe first if you want to keep it.' : 'This clears the current draft and starts with the recommended Web app defaults. Export your recipe first if you want to keep it.'}>
      <div className="dialog-actions"><Button variant="outline" onClick={() => setPending(null)}>Keep current draft</Button><Button onClick={confirmReplacement}>{pending?.kind === 'import' ? 'Replace draft' : 'Reset draft'}</Button></div>
    </Dialog>
    <Dialog open={manualCopy} onOpenChange={setManualCopy} title="Copy your prompt manually"
      description="Clipboard access is unavailable. Select the text below and copy it, or download the Markdown file.">
      <textarea aria-label="Prompt to copy" className="manual-copy" value={contract.markdown} readOnly onFocus={(event) => event.target.select()} />
      <div className="dialog-actions"><Button onClick={() => {
        downloadFile(contract.markdown, filename(config, 'md'), 'text/markdown;charset=utf-8');
      }}><Download />Download Markdown</Button></div>
    </Dialog>
  </div>;
}
