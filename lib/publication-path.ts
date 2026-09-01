const runtimeEnvironment = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env;

const requestedBasePath = runtimeEnvironment?.VESSERITH_BASE_PATH?.trim() ?? '';

export const publicationBasePath =
  requestedBasePath === '' || requestedBasePath === '/'
    ? ''
    : `/${requestedBasePath.replace(/^\/+|\/+$/g, '')}`;

export function publicationPath(path: string) {
  if (!path.startsWith('/')) {
    throw new Error(`Publication path must begin with /: ${path}`);
  }
  return `${publicationBasePath}${path}`;
}
