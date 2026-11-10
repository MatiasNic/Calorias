#!/usr/bin/env node
// Builds the public legal site (privacy, terms, account deletion) from web/legal/*.md into
// static HTML. No dependencies: the pages use a small Markdown subset (headings, paragraphs,
// lists, **bold**, [links](url)). Usage: node scripts/build-legal-site.mjs [outDir] [--draft]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'legal');
const args = process.argv.slice(2);
const draft = args.includes('--draft');
const outDir = args.find((a) => !a.startsWith('--')) ?? join(root, 'dist');

const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const missing = Object.entries(config)
  .filter(([, v]) => !String(v).trim())
  .map(([k]) => k);
if (missing.length && !draft) {
  console.error(`web/legal/site.config.json: fill in ${missing.join(', ')} (or pass --draft)`);
  process.exit(1);
}

const PAGES = [
  { slug: '', file: 'index.md', title: 'Bocado' },
  { slug: 'privacidad', file: 'privacidad.md', title: 'Política de privacidad' },
  { slug: 'terminos', file: 'terminos.md', title: 'Términos y condiciones' },
  { slug: 'eliminar-cuenta', file: 'eliminar-cuenta.md', title: 'Eliminar tu cuenta' },
];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

function toHtml(md) {
  const out = [];
  let para = [];
  let list = false;
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
    if (list) out.push('</ul>');
    list = false;
  };
  for (const line of md.split('\n')) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const item = /^-\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      if (para.length) flush();
      if (!list) out.push('<ul>');
      list = true;
      out.push(`<li>${inline(item[1])}</li>`);
    } else if (!line.trim()) {
      flush();
    } else {
      if (list) flush();
      para.push(line.trim());
    }
  }
  flush();
  return out.join('\n');
}

const fill = (s) =>
  s.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in config)) throw new Error(`Unknown placeholder {{${key}}}`);
    return String(config[key]).trim() || `[${key}]`;
  });

const page = (title, body, base) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}${title === 'Bocado' ? '' : ' · Bocado'}</title>
<link rel="stylesheet" href="${base}style.css">
</head>
<body>
<header><a class="brand" href="${base}">bocado</a></header>
<main>
${body}
</main>
<footer>
<a href="${base}privacidad/">Privacidad</a>
<a href="${base}terminos/">Términos</a>
<a href="${base}eliminar-cuenta/">Eliminar cuenta</a>
</footer>
</body>
</html>
`;

for (const p of PAGES) {
  const dir = join(outDir, p.slug);
  mkdirSync(dir, { recursive: true });
  const body = toHtml(fill(readFileSync(join(root, p.file), 'utf8')));
  writeFileSync(join(dir, 'index.html'), page(p.title, body, p.slug ? '../' : './'));
}
writeFileSync(join(outDir, 'style.css'), readFileSync(join(root, 'style.css')));
console.log(`Legal site written to ${outDir}${draft && missing.length ? ' (draft)' : ''}`);
