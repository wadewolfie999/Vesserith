const runtimeEnvironment = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env;

const sourceCommit =
  runtimeEnvironment?.VESSERITH_SOURCE_COMMIT ?? 'local-uncommitted';
const buildTimestamp = runtimeEnvironment?.VESSERITH_BUILD_TIMESTAMP ?? null;
const environment = runtimeEnvironment?.VESSERITH_BUILD_ENVIRONMENT ?? 'local';

export function GET() {
  return Response.json(
    {
      schema: 'https://vesserith.xyz/schemas/build-provenance-v1.json',
      projectId: 'vesserith',
      sourceCommit,
      buildTimestamp,
      environment,
      registrySchema: 'ecosystem-registry/v1',
      evidenceSchema: 'public-evidence/v1',
    },
    {
      headers: {
        'cache-control':
          sourceCommit === 'local-uncommitted'
            ? 'no-store'
            : 'public, max-age=300',
      },
    },
  );
}
