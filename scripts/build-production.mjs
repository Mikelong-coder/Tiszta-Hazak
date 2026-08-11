/**
 * Éles (production) csomag MagyarHosting / cPanel feltöltéshez.
 *
 * Futtatás: node scripts/build-production.mjs
 * Eredmény: dist/ — ennek a TARTALMÁT tedd a public_html-be.
 *
 * = preview, DE:
 *  - nincs noindex (keresők indexelhetnek),
 *  - robots.txt + sitemap.xml benne van,
 *  - critical.css inline, CSS/JS minifikálva.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'dist');

const SKIP = new Set([
  'preview',
  'dist',
  'scripts',
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'README.md',
]);

const SKIP_IMAGE = /^(hero-cleaning-|about(\.|-)|logo-full\.|logo-icon\.|why\.jpg$|gabriella\.jpg$|cta-woman-relax\.webp$|cta-woman-relax-960w\.webp$|.*\.tmp\.webp$|hero-mobile-\d+w\.webp$)/i;

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

function minifyJs(js) {
  let out = '';
  let i = 0;
  let inS = null;
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

function inlineCriticalCss(html) {
  const re = /<link\s+rel=["']stylesheet["']\s+href=["']assets\/css\/critical\.css[^"']*["']\s*>/i;
  if (!re.test(html)) return html;
  const criticalPath = path.join(root, 'assets', 'css', 'critical.css');
  if (!fs.existsSync(criticalPath)) return html;
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
    if (depth === 0 && SKIP.has(entry.name)) continue;
    if (/\.zip$/i.test(entry.name) || entry.name.startsWith('.lighthouse')) continue;

    const src = path.join(from, entry.name);
    const out = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDir(src, out, depth + 1);
      continue;
    }

    if (from.endsWith(`${path.sep}images`) && SKIP_IMAGE.test(entry.name)) continue;

    if (entry.name.toLowerCase().endsWith('.html')) {
      let html = fs.readFileSync(src, 'utf8');
      const before = html;
      html = inlineCriticalCss(html);
      if (html !== before) inlinedCritical += 1;
      fs.writeFileSync(out, html, 'utf8');
      htmlCount += 1;
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.css')) {
      fs.writeFileSync(out, minifyCss(fs.readFileSync(src, 'utf8')), 'utf8');
      minifiedCss += 1;
      assetCount += 1;
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.js')) {
      fs.writeFileSync(out, minifyJs(fs.readFileSync(src, 'utf8')), 'utf8');
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

console.log(`Kész: dist/ (éles MagyarHosting csomag)`);
console.log(`  ${htmlCount} HTML (indexelhető, critical inline ahol volt)`);
console.log(`  ${inlinedCritical}× critical.css inline`);
console.log(`  ${assetCount} egyéb fájl (${minifiedCss} CSS + ${minifiedJs} JS minifikálva)`);
console.log(`  robots.txt + sitemap.xml benne`);
console.log('');
console.log('Feltöltés: a dist/ mappa TARTALMÁT tedd a public_html-be.');
