# Tiszta Házak Kft. — weboldal

Statikus marketingoldal (HTML / CSS / JS). Nincs build lépés: a gyökér tartalma feltölthető a tárhely `public_html` mappájába.

## Struktúra

```
/
├── index.html              # Főoldal
├── *.html                  # Aloldalak
├── favicon.svg
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/                # style.css, critical.css
    ├── js/                 # main.js
    ├── images/             # WebP / JPG / PNG
    └── fonts/              # Montserrat (woff2)
```

## cPanel feltöltés

1. Töltsd fel a **gyökér tartalmát** a `public_html` mappába (HTML + `assets/` + `favicon.svg` + `robots.txt` + `sitemap.xml`).
2. **Ne** töltsd fel: `.git`, `.vscode`, `.gitignore`, `README.md` (opcionális).
3. Domain rootja legyen a `public_html` (vagy az alkönyvtár, ha subdomain).

## Fejlesztés

Helyi előnézet: Live Server / bármely static server a projekt gyökeréből.
