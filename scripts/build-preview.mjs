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

/** Nem hivatkozott / forrás kép — ne menjen a feltöltendő csomagba (MB-ok). */
const SKIP_IMAGE = /^(hero-cleaning-|about(\.|-)|logo-full\.|logo-icon\.|why\.jpg$|gabriella\.jpg$|cta-woman-relax\.webp$|cta-woman-relax-960w\.webp$|.*\.tmp\.webp$|hero-mobile-\d+w\.webp$)/i;

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

/** Egyszerű CSS minify — kommentek + whitespace; calc()/selektor operátorok érintetlenek. */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
    .replace(/;}/g, '}')
    .trim();
}

/** Egyszerű JS minify — blokk/sor kommentek + felesleges whitespace (stringek érintetlenek). */
function minifyJs(js) {
  let out = '';
  let i = 0;
  let inS = null; /* ' " ` */
  let inLine = false;
  let inBlock = false;
  let templateExpr = 0;

  while (i < js.length) {
    const c = js[i];
    const n = js[i + 1];

    if (inLine) {
      if (c === '\n') {
        inLine = false;
        out += '\n';
      }
      i += 1;
      continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') {
        inBlock = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (inS) {
      out += c;
      if (c === '\\' && inS !== '`') {
        out += n ?? '';
        i += 2;
        continue;
      }
      if (inS === '`') {
        if (c === '\\') {
          out += n ?? '';
          i += 2;
          continue;
        }
        if (c === '$' && n === '{') {
          templateExpr += 1;
          out += '{';
          i += 2;
          continue;
        }
        if (c === '`' && templateExpr === 0) {
          inS = null;
        }
        i += 1;
        continue;
      }
      if (c === inS) inS = null;
      i += 1;
      continue;
    }

    if (templateExpr > 0) {
      if (c === '{') templateExpr += 1;
      else if (c === '}') templateExpr -= 1;
      out += c;
      i += 1;
      continue;
    }

    if (c === '/' && n === '/') {
      inLine = true;
      i += 2;
      continue;
    }
    if (c === '/' && n === '*') {
      inBlock = true;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inS = c;
      out += c;
      i += 1;
      continue;
    }

    out += c;
    i += 1;
  }

  return out
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/;\n/g, ';')
    .replace(/\n\}/g, '}')
    .replace(/\n\{/g, '{')
    .replace(/\n,/g, ',')
    .trim();
}

/** critical.css → inline <style> (nincs extra render-blocking körút) */
function inlineCriticalCss(html) {
  const re = /<link\s+rel=["']stylesheet["']\s+href=["']assets\/css\/critical\.css[^"']*["']\s*>/i;
  if (!re.test(html)) return html;
  const criticalPath = path.join(root, 'assets', 'css', 'critical.css');
  if (!fs.existsSync(criticalPath)) return html;
  /* CSS fájlban ../fonts → HTML gyökérből assets/fonts */
  const css = minifyCss(
    fs.readFileSync(criticalPath, 'utf8').replace(/url\(\s*(['"]?)\.\.\/fonts\//g, 'url($1assets/fonts/')
  );
  return html.replace(re, `<style>${css}</style>`);
}

let htmlCount = 0;
let assetCount = 0;
let minifiedCss = 0;
let minifiedJs = 0;
let inlinedCritical = 0;

function copyDir(from, to, depth = 0) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    /* A kizárt neveket csak a gyökérben szűrjük, hogy pl. egy assets/scripts
       nevű alkönyvtár véletlenül ne maradjon ki. */
    if (depth === 0 && SKIP.has(entry.name)) continue;
    /* Feltöltő zip / lab szemét ne menjen a demóba */
    if (/\.zip$/i.test(entry.name) || entry.name.startsWith('.lighthouse')) continue;

    const src = path.join(from, entry.name);
    const out = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDir(src, out, depth + 1);
      continue;
    }

    /* Felesleges képek kihagyása (nem hivatkozott hero-változatok, forrás PNG-k). */
    if (from.endsWith(`${path.sep}images`) && SKIP_IMAGE.test(entry.name)) continue;

    if (entry.name.toLowerCase().endsWith('.html')) {
      /* Kifejezett UTF-8 be- és kiolvasás, hogy az ékezetek ne sérüljenek. */
      let html = fs.readFileSync(src, 'utf8');
      const before = html;
      html = inlineCriticalCss(html);
      if (html !== before) inlinedCritical += 1;
      fs.writeFileSync(out, injectNoindex(html), 'utf8');
      htmlCount += 1;
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.css')) {
      const css = fs.readFileSync(src, 'utf8');
      fs.writeFileSync(out, minifyCss(css), 'utf8');
      minifiedCss += 1;
      assetCount += 1;
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.js')) {
      const js = fs.readFileSync(src, 'utf8');
      fs.writeFileSync(out, minifyJs(js), 'utf8');
      minifiedJs += 1;
      assetCount += 1;
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
console.log(`  ${inlinedCritical}× critical.css inline`);
console.log(`  ${assetCount} egyéb fájl (${minifiedCss} CSS + ${minifiedJs} JS minifikálva)`);
console.log(`  robots.txt: minden kereső letiltva`);
console.log('');
console.log('Feltöltés: a preview/ mappa TARTALMÁT tedd a szerverre.');
console.log('Éles indulásnál ne ezt használd — lásd README → Indulás előtt.');
