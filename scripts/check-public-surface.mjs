import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['app', 'docs', 'registry', 'schemas'];
const textExtensions = new Set(['.css', '.json', '.md', '.ts', '.tsx']);
const findings = [];

async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) {
      await visit(target);
      continue;
    }
    if (!textExtensions.has(extname(entry.name))) continue;
    const text = await readFile(target, 'utf8');

    const checks = [
      [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, 'email address'],
      [/\b(?:\d{1,3}\.){3}\d{1,3}\b/, 'raw IPv4 address'],
      [
        /(?:api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']+["']/i,
        'credential-like assignment',
      ],
      [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
    ];

    for (const [pattern, label] of checks) {
      if (pattern.test(text)) findings.push(`${target}: ${label}`);
    }
  }
}

for (const root of roots) await visit(root);

if (findings.length > 0) {
  throw new Error(
    `Public-surface safety check failed:\n${findings.join('\n')}`,
  );
}

console.log(
  'Public-surface safety check passed: no email, raw IP, credential assignment, or private key.',
);
