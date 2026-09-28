# AURA & ESSENCE

## GitHub structure
`index.html` and `admin.html` are both at the repository root. Do not put them inside an `Aura Site` folder.

```text
aura-essence/
├── index.html
├── admin.html
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   ├── js/
│   │   ├── products.js
│   │   ├── app.js
│   │   ├── admin.js
│   │   └── admin-api.js
│   └── images/
└── Aura_Essence_Google_Apps_Script_ADMIN.gs
```

## Admin login
1. In Google Apps Script, change `ADMIN_USERNAME`, `ADMIN_LOGIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_KEY`.
2. Deploy the Apps Script as a Web App: Execute as **Me**, access **Anyone**.
3. In `assets/js/admin.js`, replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with the `/exec` URL.
4. Open `/admin.html` on your Vercel/GitHub Pages domain.
5. Enter username/email + password, then the admin key.

## Vercel
Root Directory must be blank. No build command or output directory is required.

## Notes
The admin backend creates/uses these sheets in the order spreadsheet: Products, Promotions, Site Settings, Admin Audit, and Orders. Existing Reviews remain in the configured review spreadsheet.

Admin features include dashboard analytics, order status management, CSV export, product CRUD, inventory, badges, sort order, promotions, homepage controls, low-stock threshold, customer count, top-product sales, and audit log.
