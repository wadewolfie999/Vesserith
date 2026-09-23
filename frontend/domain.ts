export const SIGNALS = ['understand', 'execute', 'explain'] as const;
export const LEVELS = ['not_yet', 'practicing', 'independent'] as const;
export type Signal = typeof SIGNALS[number];
export type Level = typeof LEVELS[number];
export type Lens = 'overview' | Signal;
export type Tab = 'brief' | 'self-check' | 'notes';
export type Kind = 'stage' | 'gate' | 'route';
export type Field<T> = { value: T; revision: number };
export interface TrailNode {
  id: string; kind: Kind; origin: string | null; code: string | null;
  title: string; content: Record<string, string>; order: number;
  x: number; y: number; placed: boolean; archived: boolean;
  threshold: 'practicing' | 'independent'; prerequisites: string[];
}
export interface TrailEdge { source: string; target: string }
export interface Graph { nodes: TrailNode[]; edges: TrailEdge[] }
export interface Learning {
  mastery: Record<string, Record<Signal, Field<Level>>>;
  notes: Record<string, Field<string>>;
}
export interface UIState {
  selected: string | null; lens: Lens; tab: Tab; about: boolean; deferred: boolean;
  concept: { open: boolean; view: 'lab' | 'host'; step: number; participant: string };
  expanded: boolean;
}
export interface Revisions { curriculum: number; learning: number; ui: number }
export interface Snapshot {
  curriculumId: string; revisions: Revisions; graph: Graph; learning: Learning; ui: UIState;
}
export interface Changes {
  curriculumId: string; revisions: Revisions; graph?: Graph; learning?: Learning; ui?: UIState;
}
export interface Operation {
  requestId: string; kind: string; expected: number; payload: Record<string, unknown>;
}
export type MutationResult = { ok: true; revisions: Revisions; value?: unknown } |
  { ok: false; code: 'conflict' | 'invalid' | 'unauthenticated'; message: string; current?: unknown; revision?: number };
export const LABELS: Record<Level, string> = { not_yet: 'Not yet', practicing: 'Practicing', independent: 'Independent' };
export const LEVEL_HELP = ['I cannot do this yet', 'I can do this with help', 'I can do this without help'];
export const LENSES: { id: Lens; label: string; purpose: string }[] = [
  { id: 'overview', label: 'Overview', purpose: 'See the whole route and your next waypoint.' },
  { id: 'understand', label: 'Understand', purpose: 'Check whether the concept is clear.' },
  { id: 'execute', label: 'Execute', purpose: 'Check whether you can perform the action.' },
  { id: 'explain', label: 'Explain', purpose: 'Check whether you can teach it back.' },
];
export const defaultUI = (): UIState => ({ selected: null, lens: 'overview', tab: 'brief', about: false, deferred: false, expanded: false, concept: { open: false, view: 'lab', step: 0, participant: 'application' } });
export const activeNodes = (graph: Graph) => graph.nodes.filter(n => !n.archived && n.placed).sort((a,b) => a.order - b.order || a.id.localeCompare(b.id));
export function gateState(gate: TrailNode, graph: Graph, learning: Learning) {
  const prereqs = gate.prerequisites.map(id => graph.nodes.find(n => n.id === id));
  if (!prereqs.length || prereqs.some(n => !n || n.archived || !n.placed)) return { ready: false, label: 'Prerequisite unavailable' };
  const ready = prereqs.every(n => SIGNALS.every(s => LEVELS.indexOf(learning.mastery[n!.id]?.[s]?.value ?? 'not_yet') >= LEVELS.indexOf(gate.threshold)));
  return { ready, label: ready ? 'Ready to self-test' : 'Building readiness' };
}
export function nextWaypoint(state: Snapshot) {
  const nodes = activeNodes(state.graph);
  return nodes.find(n => n.kind === 'stage' && SIGNALS.some(s => state.learning.mastery[n.id]?.[s]?.value === 'not_yet')) ?? nodes.find(n => n.kind === 'gate') ?? nodes[0];
}
export function englishCode(index: number): string {
  if (!Number.isInteger(index) || index < 1) throw new Error('Code index must be positive');
  let code = ''; while (index) { index--; code = String.fromCharCode(65 + index % 26) + code; index = Math.floor(index / 26); } return code;
}
export function reorderNode(graph: Graph, id: string, direction: -1 | 1): Graph {
  const ordered = graph.nodes.filter(n=>!n.archived).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const index = ordered.findIndex(n=>n.id===id), target = index + direction;
  if (index<0 || target<0 || target>=ordered.length) return graph;
  [ordered[index],ordered[target]]=[ordered[target],ordered[index]];
  const order = new Map(ordered.map((n,i)=>[n.id,i]));
  return {...graph,nodes:graph.nodes.map(n=>order.has(n.id)?{...n,order:order.get(n.id)!}:n)};
}
export function validateGraph(graph: Graph): string | null {
  if (graph.nodes.length > 200 || graph.edges.length > 400) return 'A trail supports up to 200 nodes and 400 connections.';
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  if (nodes.size !== graph.nodes.length) return 'Node IDs must be unique.';
  const pairs = new Set<string>();
  for (const n of graph.nodes) {
    if (!n.title.trim() || [...n.title].length > 120) return 'Titles need 1–120 characters.';
    if (Object.values(n.content).some(s => typeof s !== 'string' || [...s].length > 4000)) return 'Content fields support up to 4,000 characters.';
  }
  const adjacency = new Map<string,string[]>(), retained = new Map<string,string[]>();
  for (const e of graph.edges) {
    const a = nodes.get(e.source), b = nodes.get(e.target), key = `${e.source}:${e.target}`;
    if (!a || !b || a.id === b.id || pairs.has(key)) return 'Connections need distinct, existing endpoints and cannot be duplicated.';
    pairs.add(key);
    if (a.kind === 'route') return 'Routes are terminal destinations.';
    // Archived endpoints retain dependency paths, but do not participate in the active DAG.
    retained.set(a.id, [...(retained.get(a.id) ?? []), b.id]);
    if (a.archived || b.archived) continue;
    adjacency.set(a.id, [...(adjacency.get(a.id) ?? []), b.id]);
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const cycle = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); for (const t of adjacency.get(id) ?? []) if (cycle(t)) return true; visiting.delete(id); visited.add(id); return false; };
  if (graph.nodes.some(n => cycle(n.id))) return 'A trail cannot contain a cycle.';
  const reaches = (a: string,b: string, seen = new Set<string>()): boolean => { if (a === b) return true; if (seen.has(a)) return false; seen.add(a); return (retained.get(a) ?? []).some(t => reaches(t,b,seen)); };
  for (const gate of graph.nodes.filter(n => n.kind === 'gate' && n.placed && !n.archived)) {
    if (!gate.prerequisites.length) return 'A gate needs at least one prerequisite stage.';
    for (const id of gate.prerequisites) {
      const stage = nodes.get(id);
      if (!stage || stage.kind !== 'stage') return 'Gate prerequisites must be stages.';
      if (!stage.archived && !reaches(id,gate.id)) return 'Gate prerequisites must be upstream stages.';
    }
  }
  return null;
}
export function automaticPositions(graph: Graph): Record<string,{x:number;y:number}> {
  const nodes = activeNodes(graph), depth = new Map(nodes.map(n => [n.id,0]));
  for (let i=0;i<nodes.length;i++) for (const e of graph.edges) if (depth.has(e.source) && depth.has(e.target)) depth.set(e.target, Math.max(depth.get(e.target)!, depth.get(e.source)!+1));
  const max = Math.max(1,...depth.values());
  const columns = new Map<number,TrailNode[]>();
  for (const n of nodes) columns.set(depth.get(n.id)!, [...(columns.get(depth.get(n.id)!) ?? []),n]);
  return Object.fromEntries(nodes.map(n => { const d=depth.get(n.id)!, siblings=columns.get(d)!; return [n.id,{x:8+84*d/max,y:siblings.length>1 ? 12+76*siblings.indexOf(n)/(siblings.length-1) : 50+22*Math.sin(d*1.9)}]; }));
}
export function validUI(value: unknown): value is UIState {
  if (!value || typeof value !== 'object') return false;
  const v=value as UIState;
  return (v.selected === null || typeof v.selected === 'string') && LENSES.some(l=>l.id===v.lens) && ['brief','self-check','notes'].includes(v.tab) &&
    ['about','deferred','expanded'].every(k=>typeof (v as unknown as Record<string,unknown>)[k]==='boolean') &&
    !!v.concept && ['lab','host'].includes(v.concept.view) && Number.isInteger(v.concept.step) && v.concept.step>=0 && v.concept.step<=6 && typeof v.concept.open==='boolean' && typeof v.concept.participant==='string' && v.concept.participant.length<=80;
}
