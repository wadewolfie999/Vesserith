import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const registryPath = resolve('registry/projects.json');
const outputPath = resolve(
  process.env.GITHUB_STATUS_OUTPUT ?? 'derived/github-status.json',
);
const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const generatedAt =
  process.env.VESSERITH_STATUS_TIMESTAMP ?? new Date().toISOString();
const token = process.env.GITHUB_TOKEN;

if (Number.isNaN(Date.parse(generatedAt))) {
  throw new Error('VESSERITH_STATUS_TIMESTAMP must be an ISO timestamp');
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const projects = registry.projects.filter(
  (project) => project.source.repository && project.source.revision,
);

function repositoryCoordinates(repository) {
  const url = new URL(repository);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
    throw new Error(`Unsupported repository host: ${repository}`);
  }
  const [owner, name, ...rest] = url.pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/');
  if (!owner || !name || rest.length > 0) {
    throw new Error(`Unsupported GitHub repository URL: ${repository}`);
  }
  return { owner, name: name.replace(/\.git$/, '') };
}

async function github(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(
      new URL(path, `${apiBase.replace(/\/$/, '')}/`),
      {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'vesserith-pages-status-refresh',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new Error(`GitHub returned HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const entries = [];
for (const project of projects) {
  const fallback = {
    projectId: project.id,
    repository: project.source.repository,
    reviewedRevision: project.source.revision,
    observedDefaultBranch: null,
    observedDefaultRevision: null,
    observedAt: null,
    state: 'unavailable',
  };
  try {
    const { owner, name } = repositoryCoordinates(project.source.repository);
    const repository = await github(`repos/${owner}/${name}`);
    if (typeof repository.default_branch !== 'string') {
      throw new Error('GitHub response omitted default_branch');
    }
    const commit = await github(
      `repos/${owner}/${name}/commits/${encodeURIComponent(repository.default_branch)}`,
    );
    if (typeof commit.sha !== 'string' || !/^[a-f0-9]{40}$/.test(commit.sha)) {
      throw new Error('GitHub response omitted a full commit SHA');
    }
    entries.push({
      ...fallback,
      observedDefaultBranch: repository.default_branch,
      observedDefaultRevision: commit.sha,
      observedAt: generatedAt,
      state:
        commit.sha === project.source.revision
          ? 'reviewed-match'
          : 'revision-changed',
    });
  } catch (error) {
    console.warn(
      `[github-status] ${project.id}: live lookup unavailable (${error instanceof Error ? error.message : String(error)})`,
    );
    entries.push(fallback);
  }
}

const observedCount = entries.filter(
  (entry) => entry.state !== 'unavailable',
).length;
const status =
  observedCount === entries.length
    ? 'complete'
    : observedCount === 0
      ? 'unavailable'
      : 'partial';

const snapshot = {
  schema: 'https://vesserith.xyz/schemas/github-status-snapshot-v1.json',
  generatedAt,
  source: 'github-api',
  status,
  entries,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(
  `[github-status] wrote ${entries.length} entries to ${outputPath}; ${observedCount} observed, status ${status}`,
);
