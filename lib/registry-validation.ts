export const projectIds = [
  'vesserith',
  'mynyra',
  'nyvora',
  'hova',
  'wadewolfie',
] as const;

export type ProjectId = (typeof projectIds)[number];
export type ImplementationState = 'shell' | 'prototype' | 'implemented';
export type OperationState =
  | 'not-deployed'
  | 'deferred'
  | 'unverified'
  | 'verified';
export type EvidenceState =
  | 'observed'
  | 'operator-recorded'
  | 'inferred'
  | 'unavailable';

export type ProjectVersion = {
  label: string;
  status: string;
  detail: string;
};

export type Project = {
  id: ProjectId;
  name: string;
  mark: string;
  role: string;
  summary: string;
  implementation: { state: ImplementationState; label: string };
  operation: { state: OperationState; label: string };
  evidence: { state: EvidenceState; label: string; detail: string };
  source: { repository: string | null; revision: string | null };
  surfaces: {
    repository: string | null;
    wiki: string | null;
    pages: string | null;
    site: string | null;
    domain: string;
  };
  boundaries: string[];
  nextGate: string;
  versions?: ProjectVersion[];
  reviewedAt: string;
};

export type Registry = {
  schema: string;
  evidenceEpoch: string;
  projects: Project[];
};

const schemaId = 'https://vesserith.xyz/schemas/ecosystem-registry-v1.json';
const implementationStates = new Set<ImplementationState>([
  'shell',
  'prototype',
  'implemented',
]);
const operationStates = new Set<OperationState>([
  'not-deployed',
  'deferred',
  'unverified',
  'verified',
]);
const evidenceStates = new Set<EvidenceState>([
  'observed',
  'operator-recorded',
  'inferred',
  'unavailable',
]);
const allowedIds = new Set<string>(projectIds);
const expectedDomains: Record<ProjectId, string> = {
  vesserith: 'vesserith.xyz',
  mynyra: 'mynyra.vesserith.xyz',
  nyvora: 'nyvora.vesserith.xyz',
  hova: 'hova.vesserith.xyz',
  wadewolfie: 'wadewolfie.vesserith.xyz',
};

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'must be an object');
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'must be a non-empty string');
  }
  return value;
}

function nullableHttpsUrl(value: unknown, path: string): string | null {
  if (value === null) return null;
  const raw = string(value, path);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    fail(path, 'must be a valid URL');
  }
  if (url.protocol !== 'https:') fail(path, 'must use HTTPS');
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
    fail(path, 'must not expose a local address');
  }
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

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0)
    fail(path, 'must be a non-empty array');
  return value.map((entry, index) => string(entry, `${path}[${index}]`));
}

function status<T extends string>(
  value: unknown,
  path: string,
  allowed: Set<T>,
): { state: T; label: string } {
  const item = record(value, path);
  const state = string(item.state, `${path}.state`) as T;
  if (!allowed.has(state)) fail(`${path}.state`, `unsupported value ${state}`);
  return { state, label: string(item.label, `${path}.label`) };
}

function parseProject(value: unknown, index: number): Project {
  const path = `projects[${index}]`;
  const item = record(value, path);
  const id = string(item.id, `${path}.id`) as ProjectId;
  if (!allowedIds.has(id)) fail(`${path}.id`, `unknown project ${id}`);

  const implementation = status(
    item.implementation,
    `${path}.implementation`,
    implementationStates,
  );
  const operation = status(
    item.operation,
    `${path}.operation`,
    operationStates,
  );
  const evidenceBase = status(
    item.evidence,
    `${path}.evidence`,
    evidenceStates,
  );
  const evidenceRecord = record(item.evidence, `${path}.evidence`);
  const evidence = {
    ...evidenceBase,
    detail: string(evidenceRecord.detail, `${path}.evidence.detail`),
  };

  if (implementation.state === 'shell' && operation.state === 'verified') {
    fail(path, 'a shell cannot claim verified operation');
  }
  if (operation.state === 'verified' && evidence.state !== 'observed') {
    fail(path, 'verified operation requires observed evidence');
  }

  const sourceRecord = record(item.source, `${path}.source`);
  const repository = nullableHttpsUrl(
    sourceRecord.repository,
    `${path}.source.repository`,
  );
  const revision = sourceRecord.revision;
  if (repository === null && revision !== null) {
    fail(
      `${path}.source.revision`,
      'must be null when repository is unavailable',
    );
  }
  if (
    repository !== null &&
    (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision))
  ) {
    fail(`${path}.source.revision`, 'must be a full lowercase Git SHA');
  }

  const surfaceRecord = record(item.surfaces, `${path}.surfaces`);
  const surfaceRepository = nullableHttpsUrl(
    surfaceRecord.repository,
    `${path}.surfaces.repository`,
  );
  if (surfaceRepository !== repository) {
    fail(`${path}.surfaces.repository`, 'must match the source repository');
  }
  const domain = string(surfaceRecord.domain, `${path}.surfaces.domain`);
  if (domain !== expectedDomains[id]) {
    fail(`${path}.surfaces.domain`, `must be ${expectedDomains[id]}`);
  }

  let versions: ProjectVersion[] | undefined;
  if (item.versions !== undefined) {
    if (!Array.isArray(item.versions) || item.versions.length === 0) {
      fail(`${path}.versions`, 'must be a non-empty array when present');
    }
    versions = item.versions.map((entry, versionIndex) => {
      const version = record(entry, `${path}.versions[${versionIndex}]`);
      return {
        label: string(version.label, `${path}.versions[${versionIndex}].label`),
        status: string(
          version.status,
          `${path}.versions[${versionIndex}].status`,
        ),
        detail: string(
          version.detail,
          `${path}.versions[${versionIndex}].detail`,
        ),
      };
    });
  }

  return {
    id,
    name: string(item.name, `${path}.name`),
    mark: string(item.mark, `${path}.mark`),
    role: string(item.role, `${path}.role`),
    summary: string(item.summary, `${path}.summary`),
    implementation,
    operation,
    evidence,
    source: { repository, revision: revision as string | null },
    surfaces: {
      repository: surfaceRepository,
      wiki: nullableHttpsUrl(surfaceRecord.wiki, `${path}.surfaces.wiki`),
      pages: nullableHttpsUrl(surfaceRecord.pages, `${path}.surfaces.pages`),
      site: nullableHttpsUrl(surfaceRecord.site, `${path}.surfaces.site`),
      domain,
    },
    boundaries: stringArray(item.boundaries, `${path}.boundaries`),
    nextGate: string(item.nextGate, `${path}.nextGate`),
    ...(versions ? { versions } : {}),
    reviewedAt: date(item.reviewedAt, `${path}.reviewedAt`),
  };
}

export function validateRegistry(value: unknown): Registry {
  const root = record(value, 'registry');
  if (root.schema !== schemaId) fail('registry.schema', `must be ${schemaId}`);
  const evidenceEpoch = date(root.evidenceEpoch, 'registry.evidenceEpoch');
  if (!Array.isArray(root.projects))
    fail('registry.projects', 'must be an array');

  const projects = root.projects.map(parseProject);
  const ids = new Set(projects.map((project) => project.id));
  if (ids.size !== projects.length)
    fail('registry.projects', 'project IDs must be unique');
  if (ids.size !== projectIds.length || projectIds.some((id) => !ids.has(id))) {
    fail('registry.projects', `must contain exactly ${projectIds.join(', ')}`);
  }

  return { schema: schemaId, evidenceEpoch, projects };
}
