/**
 * Bumps the ?v= cache-busting numbers on style.css and main.js in every HTML file.
 * Reads and writes UTF-8 explicitly, so accented characters are never re-encoded.
 *
 * Usage: node scripts/bump-cache-version.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = fs.readdirSync(root).filter((f) => f.endsWith('.html'));

const patterns = [
  { label: 'style.css', re: /style\.css\?v=(\d+)/g },
  { label: 'main.js', re: /main\.js\?v=(\d+)/g },
  { label: 'critical.css', re: /critical\.css\?v=(\d+)/g },
];

const sources = files.map((file) => ({
  file,
  text: fs.readFileSync(path.join(root, file), 'utf8'),
}));

for (const { label, re } of patterns) {
  let max = 0;
  for (const { text } of sources) {
    for (const m of text.matchAll(re)) max = Math.max(max, Number(m[1]));
  }
  if (!max) {
    console.log(`${label}: no ?v= reference found, skipped`);
    continue;
  }
  const next = max + 1;
  for (const entry of sources) {
    entry.text = entry.text.replace(re, `${label}?v=${next}`);
  }
  console.log(`${label}: v=${max} -> v=${next}`);
}

for (const { file, text } of sources) {
  fs.writeFileSync(path.join(root, file), text, 'utf8');
}

console.log(`Updated ${sources.length} HTML files.`);
