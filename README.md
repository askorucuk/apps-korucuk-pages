# Korucuk Apps Pages

Static policy, terms, support, and referer pages for apps hosted under:

```text
https://apps.korucuk.com/swipe-todos/privacy/
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
