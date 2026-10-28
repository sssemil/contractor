import type { CSSProperties, ReactNode } from 'react';
import { sources } from '@/recipe/catalog';
import type { SourceId } from '@/recipe/config';

export function sourceStyle(id: SourceId): CSSProperties {
  return { '--source-color': sources[id].color } as CSSProperties;
}

export function SourceBadge({ id, onClick }: { id: SourceId; onClick?: () => void }) {
  return <button type="button" className="source-badge" style={sourceStyle(id)} onClick={onClick}
    aria-label={'Configure ' + sources[id].label}>
    <span className="source-dot" />{sources[id].label}
  </button>;
}

export function SourceControl({ id, active, onHighlight, children, className = '' }: {
  id: SourceId;
  active: SourceId | null;
  onHighlight: (id: SourceId | null) => void;
  children: ReactNode;
  className?: string;
}) {
  return <div id={'control-' + id} tabIndex={-1}
    className={'source-control ' + (active === id ? 'source-active ' : '') + className}
    style={sourceStyle(id)}
    onMouseEnter={() => onHighlight(id)} onMouseLeave={() => onHighlight(null)}
    onFocusCapture={() => onHighlight(id)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onHighlight(null); }}>
    {children}
  </div>;
}
