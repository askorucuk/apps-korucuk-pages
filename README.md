# Korucuk Apps Pages

Static policy, terms, support, and referer pages for apps hosted under:

```text
https://apps.korucuk.com/swipe-todos/privacy/
https://apps.korucuk.com/mirror-art/privacy/
https://apps.korucuk.com/<app-slug>/policy/
https://apps.korucuk.com/<app-slug>/privacy/
https://apps.korucuk.com/<app-slug>/terms/
https://apps.korucuk.com/<app-slug>/support/
https://apps.korucuk.com/<app-slug>/referer/
https://apps.korucuk.com/<app-slug>/account-deletion/
```

## Add or Update an App

Edit `src/apps.json` and add a new object to the `apps` array:

```json
{
  "slug": "my-app",
  "name": "My App",
  "platforms": ["iOS", "Android", "Web"],
  "effectiveDate": "2026-05-06",
  "supportEmail": "apps-support@korucuk.com",
  "description": "Short app description.",
  "dataCollected": [
    "Account information you provide, such as name and email address",
    "Usage and diagnostics data needed to improve reliability"
  ],
  "thirdParties": [
    "App stores and platform services",
    "Analytics, hosting, authentication, and crash reporting providers used by the app"
  ]
}
```

Then run:

```bash
npm run build
```

Generated pages are written to `dist/`.

## Marketing Pages

Each app's base URL (`/<slug>/`) is its marketing page. Assets live in three places:

| Folder | Purpose |
| --- | --- |
| `public/marketingcontents/<slug>/` | Promo video and 1920x1080 promo images, placed next to the matching chapter |
| `public/screenshots/<slug>/` | In-app screens, named `1.png`, `2.png`, ... (App Views carousel) |
| `public/icons/<slug>.png` | App icon (hero, favicon, social image fallback) |

Every page (home, marketing, policy, terms, support, account deletion, referer) shares one shell: top bar, per-app theme, and footer. Styles live in `public/site.css`, behavior in `public/site.js`.

Dark mode follows the system setting and can be toggled from the top bar (the choice is remembered). Each app supplies both palettes under `theme` / `theme.dark`.

In `src/apps.json`, per app:

```json
"category": "ProductivityApplication",
"theme": {
  "accent": "#2563eb", "ink": "#0f1b3d", "from": "#eef2fb", "to": "#dbe4ff",
  "dark": { "accent": "#60a5fa", "on": "#0b1220", "deep": "#0a1020", "from": "#121a30", "to": "#1a2646", "bg": "#0b1020", "card": "#141c32" }
},
"marketing": {
  "tagline": "Hero subtitle (also used on the home page card)",
  "video": { "file": "marketing-video.mp4", "poster": "base-view-promotion-landscape.png" },
  "card": "base-view-promotion-landscape.png",
  "ribbon": ["Short keyword", "Another keyword"],
  "chapters": [
    { "id": "why", "eyebrow": "Why", "heading": "One task at a time",
      "media": ["a.png", "b.png"], "side": "right", "html": "<p>...</p>" },
    { "id": "more", "eyebrow": "And more", "heading": "...",
      "cards": [{ "title": "...", "body": "..." }], "outro": "<p>...</p>" },
    { "id": "next", "eyebrow": "Roadmap", "heading": "...", "chips": ["..."] }
  ]
}
```

- A chapter with `media` renders text beside the visual: one file is a single frame, two files are a stacked pair (front, back). Use `"@icon"` to show the app icon. `side` is `left` or `right`; it alternates by default.
- A chapter without `media` renders centered, with optional `cards`, `chips`, `html` (intro) and `outro`.
- `chapters[0]` renders first, then the App Views carousel, then the rest.
- Missing media files are skipped, so an app with an empty folder still renders (hero shows the large icon).
- The build also writes `sitemap.xml` and `robots.txt`.

## GitHub Pages Setup

1. Create a GitHub repository and push this project.
2. In GitHub, open repository Settings -> Pages.
3. Set Source to "GitHub Actions".
4. Keep `CNAME` as `apps.korucuk.com`.
5. In Cloudflare DNS, create a CNAME for the `apps` hostname:

```text
apps -> <github-username>.github.io
```

GitHub Pages will serve `dist/` after the workflow runs.

## Cloudflare Notes

Use DNS-only while GitHub validates the custom domain if validation gets stuck. After validation, proxied mode can work, but DNS-only is simpler for GitHub Pages.

The canonical app policy domain is `https://apps.korucuk.com`.

## Legal Note

The generated text is a practical starter template, not legal advice. Review and adjust it for each app, especially for ads, payments, health, finance, children, location, or user-generated content.
