/**
 * Responsive WebP — libwebp cwebp (makeup-artist-demo mintára).
 * Futtatás: node scripts/generate-responsive-images-cwebp.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesRoot = path.join(__dirname, '..', 'assets', 'images');

const HERO_WIDTHS = [640, 960, 1280];
const CONTENT_WIDTHS = [640, 960, 1280];
const CARD_WIDTHS = [400, 600, 800];
const QUALITY = '82';

function findCwebp() {
  if (process.env.LIBWEBP_CWEBP && fs.existsSync(process.env.LIBWEBP_CWEBP)) {
    return process.env.LIBWEBP_CWEBP;
  }
  const temp = path.join(process.env.TEMP || '/tmp', 'libwebp');
  if (fs.existsSync(temp)) {
    for (const root of walk(temp)) {
      if (root.endsWith('cwebp.exe') || root.endsWith('cwebp')) return root;
    }
  }
  return 'cwebp';
}

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function webpWidth(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return 0;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buf.length >= 30) {
    return (buf[24] | (buf[25] << 8) | (buf[26] << 16) | ((buf[27] & 0x0f) << 24)) + 1;
  }
  if (chunk === 'VP8 ' && buf.length >= 30) {
    return buf[26] | ((buf[27] & 0x3f) << 8);
  }
  return 9999;
}

function runCwebp(cwebp, input, output, extraArgs = []) {
  const r = spawnSync(cwebp, ['-quiet', ...extraArgs, input, '-o', output, '-q', QUALITY], {
    stdio: 'inherit',
  });
  if (r.status !== 0) throw new Error(`cwebp failed: ${input} -> ${output}`);
}

function ensureWebpMaster(cwebp, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webp') return filePath;
  const out = filePath.slice(0, -ext.length) + '.webp';
  if (!fs.existsSync(out) || fs.statSync(filePath).mtimeMs > fs.statSync(out).mtimeMs) {
    runCwebp(cwebp, filePath, out);
    console.log('  master', path.relative(imagesRoot, out));
  }
  return out;
}

function variantsFor(filePath, widths, cwebp) {
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  const origW = webpWidth(filePath);

  for (const w of widths) {
    if (origW > 0 && origW <= w) {
      console.log(`  skip ${w}w (source ${origW}px)`);
      continue;
    }
    const out = `${base}-${w}w${ext}`;
    runCwebp(cwebp, filePath, out, ['-resize', String(w), '0']);
    console.log('  +', path.relative(imagesRoot, out));
  }
}

function isVariantName(name) {
  return /-\d+w\.(webp|jpg|jpeg|png)$/i.test(name);
}

const cwebp = findCwebp();
console.log('cwebp:', cwebp);

if (!fs.existsSync(imagesRoot)) {
  console.error('Missing images folder:', imagesRoot);
  process.exit(1);
}

/** Hero / full-bleed */
const heroMasters = ['hero.webp'];
for (const name of heroMasters) {
  const p = path.join(imagesRoot, name);
  if (!fs.existsSync(p)) continue;
  console.log(name);
  variantsFor(p, HERO_WIDTHS, cwebp);
}

/** Mobile hero crop — ha van külön master; különben a desktop hero-ból */
const heroMobileMaster = path.join(imagesRoot, 'hero-mobile.webp');
if (fs.existsSync(heroMobileMaster)) {
  console.log('hero-mobile.webp');
  variantsFor(heroMobileMaster, [640, 960], cwebp);
} else if (fs.existsSync(path.join(imagesRoot, 'hero.webp'))) {
  console.log('hero-mobile (from hero.webp)');
  const hero = path.join(imagesRoot, 'hero.webp');
  for (const w of [640, 960]) {
    const out = path.join(imagesRoot, `hero-mobile-${w}w.webp`);
    runCwebp(cwebp, hero, out, ['-resize', String(w), '0']);
    console.log('  +', path.relative(imagesRoot, out));
  }
}

/** Content / split / CTA */
const contentSources = [
  'why.webp',
  'why.jpg',
  'about.jpg',
  'about.webp',
  'cta-woman-relax.webp',
  'faq.webp',
];
const seenContent = new Set();
for (const name of contentSources) {
  const p = path.join(imagesRoot, name);
  if (!fs.existsSync(p)) continue;
  const master = ensureWebpMaster(cwebp, p);
  if (seenContent.has(master)) continue;
  seenContent.add(master);
  console.log(path.basename(master));
  variantsFor(master, CONTENT_WIDTHS, cwebp);
}

/** Service / card images */
const cardSources = [
  'service-home.webp',
  'service-office.webp',
  'service-stairs.webp',
  'service-construction.webp',
  'service-windows.webp',
  'service-upholstery.webp',
  'service-warehouse.webp',
];
const seenCards = new Set();
for (const name of cardSources) {
  const p = path.join(imagesRoot, name);
  if (!fs.existsSync(p)) continue;
  const master = ensureWebpMaster(cwebp, p);
  if (seenCards.has(master)) continue;
  seenCards.add(master);
  console.log(path.basename(master));
  variantsFor(master, CARD_WIDTHS, cwebp);
}

/** Generált / tartalék hero fotók — minden master webp, ami nem variant */
for (const name of fs.readdirSync(imagesRoot)) {
  if (!name.endsWith('.webp') || isVariantName(name)) continue;
  if (
    name === 'hero.webp' ||
    name === 'hero-mobile.webp' ||
    seenContent.has(path.join(imagesRoot, name)) ||
    seenCards.has(path.join(imagesRoot, name))
  ) {
    continue;
  }
  const p = path.join(imagesRoot, name);
  console.log(name);
  variantsFor(p, HERO_WIDTHS, cwebp);
}

console.log('Done.');
