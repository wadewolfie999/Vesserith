import rawSnapshot from '../derived/github-status.json' with { type: 'json' };

import { projectIds, type ProjectId } from './registry-validation.ts';

export type GitHubRevisionState =
  | 'reviewed-match'
  | 'revision-changed'
  | 'unavailable';

export type GitHubStatusEntry = {
  projectId: ProjectId;
  repository: string;
  reviewedRevision: string;
  observedDefaultBranch: string | null;
  observedDefaultRevision: string | null;
  observedAt: string | null;
  state: GitHubRevisionState;
};

export type GitHubStatusSnapshot = {
  schema: string;
  generatedAt: string | null;
  source: 'checked-in-fallback' | 'github-api';
  status: 'complete' | 'partial' | 'unavailable';
  entries: GitHubStatusEntry[];
};

const schemaId =
  'https://wadewolfie999.github.io/Vesserith/schemas/github-status-snapshot-v1.json';
const allowedIds = new Set<string>(projectIds);
const allowedStates = new Set<GitHubRevisionState>([
  'reviewed-match',
  'revision-changed',
  'unavailable',
]);

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function optionalTimestamp(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    fail(path, 'must be null or an ISO timestamp');
  }
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'must be null or a non-empty string');
  }
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'must be a non-empty string');
  }
  return value;
}

export function validateGitHubStatusSnapshot(
  value: unknown,
): GitHubStatusSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('snapshot', 'must be an object');
  }
  const snapshot = value as Record<string, unknown>;
  if (snapshot.schema !== schemaId)
    fail('snapshot.schema', `must be ${schemaId}`);
  if (
    !['checked-in-fallback', 'github-api'].includes(String(snapshot.source))
  ) {
    fail('snapshot.source', 'unsupported source');
  }
  if (
    !['complete', 'partial', 'unavailable'].includes(String(snapshot.status))
  ) {
    fail('snapshot.status', 'unsupported status');
  }
  if (!Array.isArray(snapshot.entries))
    fail('snapshot.entries', 'must be an array');
  if (snapshot.entries.length === 0)
    fail('snapshot.entries', 'must not be empty');

  const seen = new Set<string>();
  const entries = snapshot.entries.map((raw, index) => {
    const path = `snapshot.entries[${index}]`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      fail(path, 'must be an object');
    }
    const entry = raw as Record<string, unknown>;
    const projectId = string(entry.projectId, `${path}.projectId`) as ProjectId;
    if (!allowedIds.has(projectId))
      fail(`${path}.projectId`, 'unknown project');
    if (seen.has(projectId)) fail(`${path}.projectId`, 'duplicate project');
    seen.add(projectId);
    const repository = string(entry.repository, `${path}.repository`);
    let repositoryUrl: URL;
    try {
      repositoryUrl = new URL(repository);
    } catch {
      fail(`${path}.repository`, 'must be a valid URL');
    }
    if (
      repositoryUrl.protocol !== 'https:' ||
      repositoryUrl.hostname !== 'github.com'
    ) {
      fail(`${path}.repository`, 'must be an HTTPS github.com URL');
    }
    const reviewedRevision = string(
      entry.reviewedRevision,
      `${path}.reviewedRevision`,
    );
    if (!/^[a-f0-9]{40}$/.test(reviewedRevision)) {
      fail(`${path}.reviewedRevision`, 'must be a full lowercase Git SHA');
    }
    const state = string(entry.state, `${path}.state`) as GitHubRevisionState;
    if (!allowedStates.has(state)) fail(`${path}.state`, 'unsupported state');
    const observedDefaultBranch = nullableString(
      entry.observedDefaultBranch,
      `${path}.observedDefaultBranch`,
    );
    const observedDefaultRevision = nullableString(
      entry.observedDefaultRevision,
      `${path}.observedDefaultRevision`,
    );
    if (
      observedDefaultRevision !== null &&
      !/^[a-f0-9]{40}$/.test(observedDefaultRevision)
    ) {
      fail(
        `${path}.observedDefaultRevision`,
        'must be a full lowercase Git SHA',
      );
    }
    if (
      state === 'unavailable' &&
      (observedDefaultBranch !== null || observedDefaultRevision !== null)
    ) {
      fail(path, 'unavailable entries cannot claim an observed revision');
    }
    if (
      state !== 'unavailable' &&
      (observedDefaultBranch === null || observedDefaultRevision === null)
    ) {
      fail(path, 'observed entries require a branch and revision');
    }
    if (
      state === 'reviewed-match' &&
      observedDefaultRevision !== reviewedRevision
    ) {
      fail(path, 'reviewed-match requires equal revisions');
    }
    if (
      state === 'revision-changed' &&
      observedDefaultRevision === reviewedRevision
    ) {
      fail(path, 'revision-changed requires different revisions');
    }
    const observedAt = optionalTimestamp(
      entry.observedAt,
      `${path}.observedAt`,
    );
    if (state === 'unavailable' && observedAt !== null) {
      fail(path, 'unavailable entries cannot claim an observation time');
    }
    if (state !== 'unavailable' && observedAt === null) {
      fail(path, 'observed entries require an observation time');
    }
    return {
      projectId,
      repository,
      reviewedRevision,
      observedDefaultBranch,
      observedDefaultRevision,
      observedAt,
      state,
    };
  });

  if (
    seen.size !== projectIds.length ||
    projectIds.some((projectId) => !seen.has(projectId))
  ) {
    fail('snapshot.entries', `must contain exactly ${projectIds.join(', ')}`);
  }

  const observedCount = entries.filter(
    (entry) => entry.state !== 'unavailable',
  ).length;
  const expectedStatus =
    observedCount === entries.length
      ? 'complete'
      : observedCount === 0
        ? 'unavailable'
        : 'partial';
  if (snapshot.status !== expectedStatus) {
    fail(
      'snapshot.status',
      `must be ${expectedStatus} for ${observedCount} observed entries`,
    );
  }
  if (
    snapshot.source === 'checked-in-fallback' &&
    snapshot.generatedAt !== null
  ) {
    fail(
      'snapshot.generatedAt',
      'fallback snapshots cannot claim refresh time',
    );
  }
  if (snapshot.source === 'github-api' && snapshot.generatedAt === null) {
    fail('snapshot.generatedAt', 'GitHub API snapshots require a refresh time');
  }

  return {
    schema: schemaId,
    generatedAt: optionalTimestamp(
      snapshot.generatedAt,
      'snapshot.generatedAt',
    ),
    source: snapshot.source as GitHubStatusSnapshot['source'],
    status: snapshot.status as GitHubStatusSnapshot['status'],
    entries,
  };
}

export const githubStatus = validateGitHubStatusSnapshot(rawSnapshot);

export function getGitHubStatus(projectId: string) {
  return githubStatus.entries.find((entry) => entry.projectId === projectId);
}

export const githubStateLabel: Record<GitHubRevisionState, string> = {
  'reviewed-match': 'Matches reviewed revision',
  'revision-changed': 'Revision changed since review',
  unavailable: 'Live lookup unavailable',
};
