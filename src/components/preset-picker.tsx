import type { CSSProperties } from 'react';
import { ArrowUpRight, Check, Cloud, FlaskConical, PanelsTopLeft, Server } from 'lucide-react';
import type { RecipeConfig } from '@/recipe/config';
import { matchingPreset, presets, type PresetId } from '@/recipe/presets';

const icons = { web: PanelsTopLeft, workers: Cloud, vps: Server, lean: FlaskConical };

export function PresetPicker({ config, onSelect }: { config: RecipeConfig; onSelect: (id: PresetId) => void }) {
  const selected = matchingPreset(config);
  return <section className="preset-section" aria-labelledby="preset-heading">
    <div className="recipe-intro"><span className="eyebrow">A BETTER STARTING POINT</span>
      <h1 id="preset-heading">Your next build, defined.</h1>
      <p>Start with a recipe. Tweak the details. Take a clear brief to your coding agent.</p>
    </div>
    <div className="preset-heading"><h2>Choose your starting point</h2><span>{selected ? 'Ready to customize' : 'Custom recipe'}</span></div>
    <div className="preset-grid">
      {presets.map((preset) => {
        const Icon = icons[preset.id];
        return <button type="button" key={preset.id} className="preset-card"
          style={{ '--preset-color': preset.color } as CSSProperties}
          aria-pressed={selected === preset.id} aria-label={preset.label}
          onClick={() => onSelect(preset.id)}>
          <span className="preset-top"><span className="preset-icon"><Icon size={19} /></span>
            {preset.id === 'web' && <span className="recommended">Recommended</span>}
            <span className="preset-check">{selected === preset.id ? <Check size={13} /> : <ArrowUpRight size={13} />}</span>
          </span>
          <strong>{preset.label}</strong><p>{preset.description}</p><span className="preset-detail">{preset.detail}</span>
        </button>;
      })}
    </div>
    <p className="preset-footnote">Presets keep your brief, notes, domain, sender, and repository URL.</p>
  </section>;
}
