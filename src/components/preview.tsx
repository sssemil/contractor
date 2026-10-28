import Markdown from 'react-markdown';
import { ArrowUpRight, FileText } from 'lucide-react';
import { sections, type buildContract } from '@/recipe/contract';
import { sources } from '@/recipe/catalog';
import type { SourceId } from '@/recipe/config';
import { SourceBadge, sourceStyle } from './source';

export function Preview({ contract, active, onSource, raw }: {
  contract: ReturnType<typeof buildContract>;
  active: SourceId | null;
  onSource: (id: SourceId) => void;
  raw: boolean;
}) {
  if (raw) return <div className="raw-container"><label className="sr-only" htmlFor="raw-prompt">Generated Markdown</label>
    <textarea id="raw-prompt" className="raw-prompt" value={contract.markdown} readOnly spellCheck={false} />
  </div>;
  return <div className="document-scroll">
    <div className="preview-hint"><span className="colored-dots"><i /><i /><i /></span><span>Every choice leaves a trace. Click a source label to find its control.</span><ArrowUpRight size={13} /></div>
    <article className="document" aria-label="Contract preview">
      <div className="document-masthead"><span><FileText size={13} /> PROJECT CONTRACT</span><span>V1 / MARKDOWN</span></div>
      <h1>{contract.title}</h1>
      <p className="document-subtitle">A shared brief for your next build.</p>
      {sections.map((section) => {
        const blocks = contract.blocks.filter((block) => block.section === section);
        if (!blocks.length) return null;
        return <section className="document-section" key={section} aria-label={section}>
          <h2>{section}</h2>
          {blocks.map((block) => <div key={block.id} data-block={block.id}
            className={'contract-block ' + (active && block.sources.includes(active) ? 'block-highlighted' : '')}
            style={sourceStyle(active && block.sources.includes(active) ? active : block.sources[0])}>
            <div className="block-sources">{block.sources.map((id) => <SourceBadge key={id} id={id} onClick={() => onSource(id)} />)}</div>
            <div className="markdown"><Markdown skipHtml>{block.markdown}</Markdown></div>
          </div>)}
        </section>;
      })}
      <div className="document-end"><span />End of contract<span /></div>
    </article>
    {active && <div className="highlight-status" role="status" style={sourceStyle(active)}><span className="source-dot" />Highlighting {sources[active].label}</div>}
  </div>;
}
