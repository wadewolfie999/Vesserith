import rawShowcase from '../registry/mynyra-showcase.json' with { type: 'json' };

const schemaId =
  'https://wadewolfie999.github.io/Vesserith/schemas/mynyra-showcase-v1.json';
const sourceRepository = 'https://github.com/wadewolfie999/Mynyra';
const sourceRevision = '3c02009897dd552f1a0592afe15c602baa882aea';
const pipelineIds = ['manifest', 'replay', 'evidence'] as const;
const signalIds = ['mode', 'provider', 'orders', 'backend'] as const;

export type MynyraPipelineStage = {
  id: (typeof pipelineIds)[number];
  label: string;
  detail: string;
};

export type MynyraSignal = {
  id: (typeof signalIds)[number];
  label: string;
  value: string;
  detail: string;
};

export type MynyraShowcase = {
  schema: string;
  projectId: 'mynyra';
  source: {
    repository: string;
    revision: string;
    reviewedAt: string;
  };
  title: string;
  summary: string;
  mode: 'BACKTEST';
  pipeline: MynyraPipelineStage[];
  signals: MynyraSignal[];
  nextGate: string;
  links: {
    evidenceRecord: string;
    repository: string;
    offlineReplay: string;
  };
};

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'must be an object');
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  path: string,
  allowed: readonly string[],
) {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail(`${path}.${key}`, 'unsupported field');
  }
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'must be a non-empty string');
  }
  return value;
}

function https(value: unknown, path: string): string {
  const raw = string(value, path);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    fail(path, 'must be a valid URL');
  }
  if (url.protocol !== 'https:') fail(path, 'must use HTTPS');
  return raw;
}

function date(value: unknown, path: string): string {
  const raw = string(value, path);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(raw) ||
    Number.isNaN(Date.parse(`${raw}T00:00:00Z`))
  ) {
    fail(path, 'must be an ISO calendar date');
  }
  return raw;
}

function parseStage(value: unknown, index: number): MynyraPipelineStage {
  const path = `pipeline[${index}]`;
  const item = object(value, path);
  exactKeys(item, path, ['id', 'label', 'detail']);
  const id = string(item.id, `${path}.id`) as MynyraPipelineStage['id'];
  if (pipelineIds[index] !== id) {
    fail(`${path}.id`, `expected ${pipelineIds[index]}`);
  }
  return {
    id,
    label: string(item.label, `${path}.label`),
    detail: string(item.detail, `${path}.detail`),
  };
}

function parseSignal(value: unknown, index: number): MynyraSignal {
  const path = `signals[${index}]`;
  const item = object(value, path);
  exactKeys(item, path, ['id', 'label', 'value', 'detail']);
  const id = string(item.id, `${path}.id`) as MynyraSignal['id'];
  if (signalIds[index] !== id)
    fail(`${path}.id`, `expected ${signalIds[index]}`);
  return {
    id,
    label: string(item.label, `${path}.label`),
    value: string(item.value, `${path}.value`),
    detail: string(item.detail, `${path}.detail`),
  };
}

export function validateMynyraShowcase(value: unknown): MynyraShowcase {
  const item = object(value, 'showcase');
  exactKeys(item, 'showcase', [
    'schema',
    'projectId',
    'source',
    'title',
    'summary',
    'mode',
    'pipeline',
    'signals',
    'nextGate',
    'links',
  ]);
  if (string(item.schema, 'showcase.schema') !== schemaId) {
    fail('showcase.schema', 'must use the public Pages schema identity');
  }
  if (string(item.projectId, 'showcase.projectId') !== 'mynyra') {
    fail('showcase.projectId', 'must be mynyra');
  }
  const source = object(item.source, 'showcase.source');
  exactKeys(source, 'showcase.source', [
    'repository',
    'revision',
    'reviewedAt',
  ]);
  if (
    https(source.repository, 'showcase.source.repository') !== sourceRepository
  ) {
    fail(
      'showcase.source.repository',
      'must match the reviewed Mynyra repository',
    );
  }
  if (string(source.revision, 'showcase.source.revision') !== sourceRevision) {
    fail('showcase.source.revision', 'must match the reviewed Mynyra revision');
  }
  const reviewedAt = date(source.reviewedAt, 'showcase.source.reviewedAt');
  if (string(item.mode, 'showcase.mode') !== 'BACKTEST') {
    fail('showcase.mode', 'must remain BACKTEST');
  }
  if (!Array.isArray(item.pipeline) || item.pipeline.length !== 3) {
    fail('showcase.pipeline', 'must contain exactly three ordered stages');
  }
  if (!Array.isArray(item.signals) || item.signals.length !== 4) {
    fail('showcase.signals', 'must contain exactly four ordered signals');
  }
  const links = object(item.links, 'showcase.links');
  exactKeys(links, 'showcase.links', [
    'evidenceRecord',
    'repository',
    'offlineReplay',
  ]);
  const parsedLinks = {
    evidenceRecord: https(
      links.evidenceRecord,
      'showcase.links.evidenceRecord',
    ),
    repository: https(links.repository, 'showcase.links.repository'),
    offlineReplay: https(links.offlineReplay, 'showcase.links.offlineReplay'),
  };
  if (parsedLinks.repository !== sourceRepository) {
    fail('showcase.links.repository', 'must match the source repository');
  }
  return {
    schema: schemaId,
    projectId: 'mynyra',
    source: {
      repository: sourceRepository,
      revision: sourceRevision,
      reviewedAt,
    },
    title: string(item.title, 'showcase.title'),
    summary: string(item.summary, 'showcase.summary'),
    mode: 'BACKTEST',
    pipeline: item.pipeline.map(parseStage),
    signals: item.signals.map(parseSignal),
    nextGate: string(item.nextGate, 'showcase.nextGate'),
    links: parsedLinks,
  };
}

export const mynyraShowcase = validateMynyraShowcase(rawShowcase);
