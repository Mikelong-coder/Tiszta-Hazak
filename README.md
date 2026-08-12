# Tiszta Házak Kft. — weboldal

Statikus marketingoldal (HTML / CSS / JS).

## Éles feltöltés (MagyarHosting / cPanel)

1. Éles csomag: `node scripts/build-production.mjs` → `dist/`
2. A **`dist/` tartalmát** (nem a mappát magát) töltsd fel a `public_html`-be.
3. Kész zip: `Downloads/tisztahazak-magyarhosting.zip` — cPanel → Fájlkezelő → Feltöltés → kibontás a `public_html`-be.
4. **Ne** töltsd fel: `.git`, `scripts/`, `preview/`, `README.md`.

Domain: `www.tisztahazak.hu` (canonical + sitemap erre van állítva).

## Bemutató (GitHub Pages)

`node scripts/build-preview.mjs` → `preview/` (noindex, nincs sitemap).

## Fejlesztés

Helyi előnézet: Live Server a projekt gyökeréből.
