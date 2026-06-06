import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'docs', 'src', 'content', 'docs');
const checkedExtensions = new Set(['.md', '.mdx']);
const ignoredDirectories = new Set(['node_modules', 'dist', '.astro']);
const scannedFiles = [
  join(root, 'README.md'),
  join(root, 'AGENTS.md'),
  join(root, 'llms.txt'),
  ...walk(join(root, 'docs')).filter((file) => checkedExtensions.has(extname(file))),
];

const errors = [];

for (const file of scannedFiles) {
  const body = readFileSync(file, 'utf8');
  for (const link of markdownLinks(body)) {
    validateLink(file, link);
  }
  for (const href of hrefAttributes(body)) {
    validateLink(file, href);
  }
}

validateDeepWikiSteering();

if (errors.length > 0) {
  console.error(`Docs check failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Docs check passed for ${scannedFiles.length} Markdown/MDX files.`);

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (entry.isDirectory()) files.push(...walk(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

function markdownLinks(body) {
  const links = [];
  const pattern = /(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of body.matchAll(pattern)) links.push(match[1]);
  return links;
}

function hrefAttributes(body) {
  const links = [];
  const pattern = /\bhref=["']([^"']+)["']/g;
  for (const match of body.matchAll(pattern)) links.push(match[1]);
  return links;
}

function validateLink(sourceFile, rawLink) {
  const link = rawLink.trim();
  if (
    !link ||
    link.startsWith('#') ||
    link.startsWith('http://') ||
    link.startsWith('https://') ||
    link.startsWith('mailto:') ||
    link.startsWith('tel:')
  ) {
    return;
  }

  const pathOnly = decodeURIComponent(link.split(/[?#]/)[0]);
  if (!pathOnly) return;

  const target = pathOnly.startsWith('/sg-weather-ops-dashboard/')
    ? starlightRouteToFile(pathOnly)
    : pathOnly.startsWith('/')
      ? null
      : resolve(sourceFile, '..', pathOnly);

  if (!target) return;
  if (!isInside(root, target)) {
    errors.push(`${rel(sourceFile)} links outside repo: ${link}`);
    return;
  }
  if (!existsAsFileOrDirectory(target)) {
    errors.push(`${rel(sourceFile)} has missing local link: ${link}`);
  }
}

function starlightRouteToFile(route) {
  const routePath = route.replace(/^\/sg-weather-ops-dashboard\/?/, '').replace(/\/$/, '');
  if (!routePath) return join(docsRoot, 'index.mdx');
  return firstExisting([
    join(docsRoot, `${routePath}.md`),
    join(docsRoot, `${routePath}.mdx`),
    join(docsRoot, routePath, 'index.md'),
    join(docsRoot, routePath, 'index.mdx'),
  ]);
}

function firstExisting(paths) {
  return paths.find((path) => existsAsFileOrDirectory(path)) ?? paths[0];
}

function existsAsFileOrDirectory(path) {
  if (existsSync(path)) return true;
  if (existsSync(`${path}.md`) || existsSync(`${path}.mdx`)) return true;
  return false;
}

function validateDeepWikiSteering() {
  const wikiPath = join(root, '.devin', 'wiki.json');
  if (!existsSync(wikiPath)) return;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(wikiPath, 'utf8'));
  } catch (error) {
    errors.push(`.devin/wiki.json is not valid JSON: ${error.message}`);
    return;
  }

  if (!Array.isArray(parsed.repo_notes) || !Array.isArray(parsed.pages)) {
    errors.push('.devin/wiki.json must include repo_notes and pages arrays');
  }
}

function isInside(parent, child) {
  const relPath = relative(parent, child);
  return relPath === '' || (!relPath.startsWith('..') && !normalize(relPath).startsWith('..'));
}

function rel(path) {
  return relative(root, path);
}
