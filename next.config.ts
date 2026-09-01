import type { NextConfig } from 'next';

const staticExport = process.env.VESSERITH_STATIC_EXPORT === '1';
const requestedBasePath = process.env.VESSERITH_BASE_PATH?.trim() ?? '';
const basePath =
  requestedBasePath === '' || requestedBasePath === '/'
    ? ''
    : `/${requestedBasePath.replace(/^\/+|\/+$/g, '')}`;

const nextConfig: NextConfig = staticExport
  ? {
      output: 'export',
      assetPrefix: basePath,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
