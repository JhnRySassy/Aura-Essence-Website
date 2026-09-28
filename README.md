# AURA & ESSENCE

Static frontend for the AURA & ESSENCE perfume store.

## Folder structure

```text
aura-essence/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── products.js
│   │   └── app.js
│   └── images/
│       ├── sauvage.jpg
│       ├── invictus.jpg
│       ├── strongerwithyou.jpg
│       ├── aquadigio.jpg
│       ├── eros.jpg
│       ├── missdior.jpg
│       ├── blackop.jpg
│       ├── valaya.jpg
│       ├── paradoxe.jpg
│       └── eclat.jpg
└── README.md
```

`index.html` is intentionally at the repository root so GitHub Pages/Vercel can serve it directly.

## GitHub

1. Create a new GitHub repository.
2. Open the repository and click **Add file → Upload files**.
3. Upload `index.html` and the whole `assets` folder.
4. Commit the files.
5. Your repository root should show `index.html` directly, NOT `Aura Site/index.html`.

For GitHub Pages:
- **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/ (root)`

For Vercel:
- Import the GitHub repository.
- **Root Directory:** leave it empty / repository root.
- No build command is required for this static frontend.
- The entry point is the root `index.html`.

## Local development

Because `app.js` is an ES module, do not open `index.html` with `file://` if your browser blocks modules. Use a simple local server, for example VS Code Live Server.

## Editing products

`assets/js/products.js` contains the seed product catalog and product model. The live Admin Dashboard can manage products through the Google Apps Script API.

## Google Apps Script

Keep the Google Apps Script project separate from this frontend repository if you do not want server-side credentials/configuration exposed in GitHub.
