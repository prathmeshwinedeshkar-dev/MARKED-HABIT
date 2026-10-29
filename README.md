# Marked

A daily habit tracker built for college students, with a personal **Habit ID** card that grows with your streaks.
No sign-up, no tracking, no third-party requests. Installs on your phone like an app.

<p>
  <img src="docs/today.png" width="240" alt="Today screen">
  <img src="docs/id.png" width="240" alt="Habit ID card">
  <img src="docs/today-dark.png" width="240" alt="Dark mode">
</p>

**Live:** _add your GitHub Pages link here_

## Features
- Add, complete, rename and delete habits, with a live "done today" counter
- **Repeat on chosen days** (for example gym on Mon, Wed, Fri). Rest days never break a streak
- Streak per habit, and an **Undo** bar after deleting
- **Insights:** 7-day chart, 12-week heatmap, weekly rate, best streak, strongest habit
- **Habit ID:** a profile card with a unique generated pattern, ID code, level, archetype (Early Bird, Night Owl, Steady Hand) and badges. Download it as an image
- Starter habits made for student life (sleep, revision, water, walking, phone-free mornings, spends)
- Dark mode, reduced-motion support, keyboard focus styles
- Installable (PWA) and works offline after the first visit
- Backup and restore as a JSON file, and a one-tap **Delete all my data**

## Privacy
Everything is stored in your browser's local storage, on your device. There is no server or account. The font is hosted in this repo, so the app makes no third-party requests. Details are in [privacy.html](privacy.html).

## Tech
Plain HTML, CSS and JavaScript. No framework, no build step.

```
index.html          page structure
css/style.css       design tokens, layout, dark mode
js/store.js         data layer: Habit and Store classes (OOP), streak logic, localStorage
js/idcard.js        Habit ID generator drawn on a canvas
js/app.js           screen: rendering, events, theme, tabs
sw.js               service worker (offline support)
manifest.webmanifest, icon-*.png, icon.svg   install info
privacy.html        privacy page
fonts/              self-hosted Bricolage Grotesque
```

## How it works
- `Habit` stores a title, the weekdays it repeats on, and a log `{ "2026-10-29": 8 }` (date and hour ticked). Streaks, charts and the ID stats are all computed from that log.
- `Store` owns the list and the profile and saves to `localStorage` as JSON. The screen never edits data directly.
- The ID pattern comes from a hash of your name and join date feeding a seeded random generator, so it is unique and repeatable.

## Run it
Open `index.html` in a browser, or serve the folder (`npx serve`, or `python3 -m http.server`). Install and offline mode need `http://localhost` or `https://`.

## Deploy free on GitHub Pages
Repo **Settings > Pages > Deploy from a branch > `main` / root**. Open the link on your phone in Chrome and choose **Add to Home Screen**.

## Roadmap
Cloud accounts and sync (Firebase), reminders, friend streaks and campus boards, per-habit notes, exam mode.

## Licence
MIT
