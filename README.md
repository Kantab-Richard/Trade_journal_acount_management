# Journalit web workspace

A browser based trading journal that saves every edit on this device first. It can optionally sync a private copy to the user's own Google Drive through Google Apps Script.

## Offline use

Open the app once while online from its HTTPS deployment (or localhost). The service worker caches the app shell and the journal is stored in browser local storage, so it remains available offline on that same browser/device. Offline edits are queued and sync when the device is online again while a Google sync session is connected.

## Google Apps Script setup

1. Sign into Google and create an Apps Script project.
2. Add `apps-script/Code.gs` as `Code.gs` and `apps-script/Bridge.html` as an HTML file named `Bridge`.
3. In **Project Settings → Script properties**, set `JOURNALIT_ALLOWED_ORIGINS` to the exact deployed site origin, such as `https://acountmanagement.vercel.app`. Add `http://127.0.0.1:4173` too only if you use the local site.
4. Deploy as a web app restricted to **Only myself** and run it as the user accessing the web app. This keeps the journal private to the Google account that owns and authorizes the script.
5. Copy the web app `/exec` URL into `web/apps-script-config.js`.
6. After updating either Apps Script file, deploy a **new version**. Open Journalit and click **Connect Google**. The Google sync popup may ask you to sign in and authorize spreadsheet access. Keep that popup open while syncing.

The popup is intentional: a private `Only myself` deployment cannot be read silently from a hidden cross-site iframe. The app uses a one-time nonce and a transferred `MessageChannel` to connect the popup to Journalit. It does not place a shared secret in the public Vercel app. If you reload or close the popup, connect again for that browser session. Local changes remain available even when disconnected.

When a cloud journal exists, the app asks before loading it over the local copy. When no cloud journal exists, it asks before uploading local data. Google Apps Script and Sheets have usage quotas and are not a replacement for a managed production database.

## Deploy the web app

Import this repository into Vercel. Root `vercel.json` publishes the `web` folder. HTTPS hosting is required for installable offline app behavior.

## Features

- Home and performance dashboards, trade log, setup summaries, reviews, calendar, and session timer
- Trading accounts with user-defined risk rules and an illustrative 30-step growth scenario
- Position sizing estimate using broker details entered by the user
- CSV import and JSON backup/restore
- Offline local storage, app-shell caching, and queued Google Drive sync
- Responsive desktop and mobile layout

The growth ladder is an illustrative scenario, not a forecast or recommended return. Position size calculations are estimates and depend on accurate broker specifications, fees, and execution.
