import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import assert from 'node:assert/strict';

// Publication is an allow-list: never upload the checkout, fixtures or private exports.
const root = resolve('dist');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory)) {
    const path = resolve(directory, entry), stat = await lstat(path);
    assert(!stat.isSymbolicLink(), 'The Pages artifact cannot contain links');
    if (stat.isDirectory()) await walk(path);
    else files.push(relative(root, path));
  }
}
await walk(root);
assert(files.includes('index.html') && files.includes('vesserith.svg'), 'Missing entry point or favicon');
for (const file of files) {
  assert(/^(index\.html|vesserith\.svg|assets\/[\w-]+\.(js|css))$/.test(file), `Unexpected public file: ${file}`);
  const content = await readFile(resolve(root, file), 'utf8');
  const forbidden = [
    /sb_secret_[A-Za-z0-9_-]+/, /(?:ghp_|github_pat_)[A-Za-z0-9_]+/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /["']role["']\s*:\s*["']service_role["']/,
    /\/Users\/[\w.-]+\//, /\/home\/[\w.-]+\//,
    /127\.0\.0\.1:4181/, /Isolated test fixture/, /temporary persistence check/,
    /appgprj_6aa8548980b881919c4be1615d30e861/,
  ];
  assert(!forbidden.some(pattern => pattern.test(content)), `Private or development-only content in ${file}`);
}
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert(html.includes('<title>Vesserith — Learning Observatory</title>'), 'Incorrect branding');
for (const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^https:\/\//.test(url)) continue;
  assert(url.startsWith('/Vesserith/'), `Asset is outside the Pages subpath: ${url}`);
  assert(files.includes(url.slice('/Vesserith/'.length)), `Missing static asset: ${url}`);
}
const js = (await Promise.all(files.filter(f => f.endsWith('.js')).map(f => readFile(resolve(root,f),'utf8')))).join('\n');
assert(js.includes('https://kpayfphiaukctbkfoodn.supabase.co'), 'The production account service is not configured');
assert(js.includes('sb_publishable_'), 'The public build has no publishable key');
console.log(`Pages artifact verified: ${files.length} allow-listed files; /Vesserith/ asset references resolve; account configuration present.`);
