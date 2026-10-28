import { moduleById, modules } from './catalog';
import type { ModuleId, RecipeConfig, SourceId } from './config';

export interface Resolution {
  active: Set<ModuleId>;
  requiredBy: Map<ModuleId, Set<SourceId>>;
  excluded: ModuleId[];
  dns: boolean;
}

export function resolveRecipe(config: RecipeConfig): Resolution {
  const active = new Set<ModuleId>();
  const requiredBy = new Map<ModuleId, Set<SourceId>>();
  const excluded = config.selected.filter((id) =>
    config.deployment.target === 'workers' && moduleById(id).workersExcluded,
  );
  const add = (id: ModuleId, ancestors: SourceId[] = []) => {
    active.add(id);
    const reasons = requiredBy.get(id) ?? new Set<SourceId>();
    ancestors.forEach((source) => reasons.add(source));
    requiredBy.set(id, reasons);
    moduleById(id).requires.forEach((dependency) => add(dependency, [...ancestors, id]));
  };
  config.selected.filter((id) => !excluded.includes(id)).forEach((id) => add(id));
  if (config.deployment.target === 'vps') add('docker', ['deployment']);
  if (config.workflow.pr !== 'none') add('git', ['pr']);
  return {
    active,
    requiredBy,
    excluded,
    dns: config.deployment.cloudflareDns,
  };
}

export function blockSources(id: ModuleId, resolved: Resolution): SourceId[] {
  const causes = resolved.requiredBy.get(id) ?? new Set();
  const order: SourceId[] = ['deployment', 'pr', ...modules.map((module) => module.id)];
  return [id, ...order.filter((source) => source !== id && causes.has(source))];
}
