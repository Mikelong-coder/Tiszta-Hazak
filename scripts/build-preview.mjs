/**
 * Bemutató (preview) csomag készítése a megrendelőnek.
 *
 * Futtatás: node scripts/build-preview.mjs
 * Eredmény: preview/ mappa, aminek a TARTALMA feltölthető bárhova.
 *
 * Amiben különbözik az éles feltöltéstől:
 *  - minden HTML-be bekerül a noindex, hogy a Google ne indexelje a bemutatót
 *    (a kitalált vélemények és a helyőrző telefonszám ne kerüljön a keresőbe),
 *  - a robots.txt mindent letilt, a sitemap.xml kimarad,
 *  - a fejlesztői fájlok (scripts/, package.json, README) nem kerülnek bele.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'preview');

/** Ezek soha nem kerülnek a csomagba. */
const SKIP = new Set([
  'preview',
  'scripts',
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'README.md',
  /* Bemutatónál nem kell — az éles domainre mutató URL-eket tartalmaz. */
  'sitemap.xml',
]);

const NOINDEX = '<meta name="robots" content="noindex, nofollow">';

const PREVIEW_ROBOTS = `# Bemutató változat — a keresők ne indexeljék.
User-agent: *
Disallow: /
`;

/** A noindex a charset után a legjobb helyen; ha nincs, a <head> után. */
function injectNoindex(html) {
  if (/name=["']robots["']/i.test(html)) return html;

  const charset = html.match(/<meta[^>]+charset[^>]*>/i);
  if (charset) {
    return html.replace(charset[0], `${charset[0]}\n${NOINDEX}`);
  }
  const head = html.match(/<head[^>]*>/i);
  if (head) {
    return html.replace(head[0], `${head[0]}\n${NOINDEX}`);
  }
  return html;
}

let htmlCount = 0;
let assetCount = 0;

function copyDir(from, to, depth = 0) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    /* A kizárt neveket csak a gyökérben szűrjük, hogy pl. egy assets/scripts
       nevű alkönyvtár véletlenül ne maradjon ki. */
    if (depth === 0 && SKIP.has(entry.name)) continue;

    const src = path.join(from, entry.name);
    const out = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDir(src, out, depth + 1);
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.html')) {
      /* Kifejezett UTF-8 be- és kiolvasás, hogy az ékezetek ne sérüljenek. */
      const html = fs.readFileSync(src, 'utf8');
      fs.writeFileSync(out, injectNoindex(html), 'utf8');
      htmlCount += 1;
      continue;
    }

    fs.copyFileSync(src, out);
    assetCount += 1;
  }
}

fs.rmSync(dest, { recursive: true, force: true });
copyDir(root, dest);
fs.writeFileSync(path.join(dest, 'robots.txt'), PREVIEW_ROBOTS, 'utf8');

console.log(`Kész: preview/`);
console.log(`  ${htmlCount} HTML noindex jelöléssel`);
console.log(`  ${assetCount} egyéb fájl`);
console.log(`  robots.txt: minden kereső letiltva`);
console.log('');
console.log('Feltöltés: a preview/ mappa TARTALMÁT tedd a szerverre.');
console.log('Éles indulásnál ne ezt használd — lásd README → Indulás előtt.');
