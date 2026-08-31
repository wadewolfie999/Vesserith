import rawRegistry from '@/registry/projects.json';

import { validateRegistry } from './registry-validation';

export type { Project } from './registry-validation';

export const registry = validateRegistry(rawRegistry);
export const evidenceEpoch = registry.evidenceEpoch;
export const projects = registry.projects;

export function getProject(id: string) {
  return projects.find((project) => project.id === id);
}

export function shortRevision(revision: string | null) {
  return revision ? revision.slice(0, 8) : 'uncommitted';
}

export const statusTone = {
  implementation: {
    shell: 'border-stone-500/20 bg-stone-500/10 text-stone-700',
    prototype: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
    implemented: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
  },
  operation: {
    'not-deployed': 'border-slate-500/20 bg-slate-500/10 text-slate-700',
    deferred: 'border-violet-500/20 bg-violet-500/10 text-violet-700',
    unverified: 'border-rose-500/20 bg-rose-500/10 text-rose-700',
    verified: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
  },
  evidence: {
    observed: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-800',
    'operator-recorded':
      'border-indigo-500/20 bg-indigo-500/10 text-indigo-700',
    inferred: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
    unavailable: 'border-stone-500/20 bg-stone-500/10 text-stone-700',
  },
} as const;
