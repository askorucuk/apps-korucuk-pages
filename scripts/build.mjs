import { mkdir, readFile, rm, writeFile, copyFile, readdir, cp, stat } from "node:fs/promises";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, "src", "apps.json");
const distPath = join(root, "dist");
const publicPath = join(root, "public");
const screenshotsSrc = join(publicPath, "screenshots");
const marketingSrc = join(publicPath, "marketingcontents");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

const listScreenshots = async (slug) => {
  const dir = join(screenshotsSrc, slug);
  try {
    const entries = await readdir(dir);
    return entries
      .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
      .sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
        return a.localeCompare(b);
      })
      .map((f) => `/screenshots/${slug}/${f}`);
  } catch {
    return [];
  }
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const slugify = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const asList = (items) =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const defaultDataUsage = (app) => [
  `To operate, display, sync, update, and delete your ${app.name} app data`,
  "To provide account sign-in, account management, and optional profile features",
  "To save app preferences and settings",
  "To send notifications when you enable notification features",
  "To maintain app security, prevent abuse, and troubleshoot service issues",
  "To respond to support requests and privacy requests"
];

const defaultRetention = (app) =>
  `We keep your account information, app content, preferences, and settings while your account remains active or as needed to provide ${app.name}. If you delete your account or request deletion, we work to delete or de-identify associated app data unless retention is required by law or needed for legitimate security, integrity, dispute, or operational purposes.`;

const defaultChoices = (app) =>
  `You can update information in the app where available, sign out, disable optional permissions in your device settings, and request access, correction, or deletion of your personal information by contacting us at ${app.supportEmail}.`;

const defaultAccountDeletionData = (app) => [
  `Your ${app.name} account identifier and account profile data controlled by the app`,
  "App content, settings, and preferences stored for your account",
  "Optional notification or device records tied to your account where applicable"
];

const writePage = async (route, html) => {
  const pageDir = join(distPath, route);
  await mkdir(pageDir, { recursive: true });
  await writeFile(join(pageDir, "index.html"), html);
};

let site = { owner: {}, apps: [] };
let assetVersion = "";

const DEFAULT_DARK = { accent: "#5eead4", on: "#04201d", deep: "#0a1716", from: "#10211f", to: "#16302c", bg: "#0a1413", card: "#12201e" };
const DEFAULT_THEME = { accent: "#0f766e", ink: "#16213a", from: "#f4f7f6", to: "#e3efec", dark: DEFAULT_DARK };
const BRAND_THEME = {
  accent: "#2563eb",
  ink: "#12182b",
  from: "#f3f5fb",
  to: "#e2e8f8",
  dark: { accent: "#60a5fa", on: "#0b1220", deep: "#0a0f1f", from: "#121a30", to: "#1a2646", bg: "#0b1020", card: "#141c32" }
};

const appTheme = (app) => ({
  ...DEFAULT_THEME,
  ...(app?.theme || {}),
  dark: { ...DEFAULT_DARK, ...(app?.theme?.dark || {}) }
});

// Emits both palettes; .mk-themed in site.css picks one based on html[data-theme].
const themeStyle = (t) =>
  Object.entries({
    "--t-accent-l": t.accent,
    "--t-strong": t.accent,
    "--t-ink-l": t.ink,
    "--t-from-l": t.from,
    "--t-to-l": t.to,
    "--t-accent-d": t.dark.accent,
    "--t-on-d": t.dark.on,
    "--t-deep-d": t.dark.deep,
    "--t-from-d": t.dark.from,
    "--t-to-d": t.dark.to,
    "--t-bg-d": t.dark.bg,
    "--t-card-d": t.dark.card
  })
    .map(([k, v]) => `${k}:${escapeHtml(v)}`)
    .join(";");

const themeToggle = `<button class="mk-theme-toggle" type="button" aria-pressed="false" aria-label="Switch to dark mode">
  <svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
  <svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
</button>`;

const iconSrc = (app) => `/icons/${app.slug}.png`;

const topBar = (app, active) => {
  const items = app
    ? [
        ["Overview", `/${app.slug}/`, "overview"],
        ["Support", `/${app.slug}/support/`, "support"],
        ["Privacy", `/${app.slug}/policy/`, "policy"],
        ["Terms", `/${app.slug}/terms/`, "terms"]
      ]
    : site.apps.map((a) => [a.name, `/${a.slug}/`, a.slug]);

  const nav = items
    .map(([label, href, key]) => `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`)
    .join("");

  const home = `<a class="mk-bar__home" href="/"><span class="mk-logo" aria-hidden="true">K</span><span>Korucuk Apps</span></a>`;
  const crumb = app
    ? `${home}<span class="mk-bar__sep" aria-hidden="true">/</span><a class="mk-bar__brand" href="/${app.slug}/"><img src="${escapeHtml(iconSrc(app))}" alt="" width="28" height="28"><span>${escapeHtml(app.name)}</span></a>`
    : home;
  const cta = app
    ? `<a class="mk-btn" href="/${app.slug}/#download">Download</a>`
    : `<a class="mk-btn" href="#apps">Explore apps</a>`;

  return `<header class="mk-bar">
    <div class="mk-wrap mk-bar__inner">
      ${crumb}
      <nav class="mk-bar__nav" aria-label="${app ? "App pages" : "Apps"}">${nav}</nav>
      ${cta}
    </div>
    <div class="mk-progress" aria-hidden="true"></div>
  </header>`;
};

const siteFooter = (app) => {
  const owner = site.owner;
  const email = app?.supportEmail || owner.contactEmail;
  const creatorSite = owner.personalSite || owner.website;
  const others = site.apps.filter((a) => !app || a.slug !== app.slug);

  const appLinks = app
    ? `<h3>${escapeHtml(app.name)}</h3>
        <ul>
          <li><a href="/${app.slug}/">Overview</a></li>
          <li><a href="/${app.slug}/support/">Support</a></li>
          <li><a href="/${app.slug}/policy/">Privacy Policy</a></li>
          <li><a href="/${app.slug}/terms/">Terms of Use</a></li>
          <li><a href="/${app.slug}/account-deletion/">Account Deletion</a></li>
        </ul>`
    : `<h3>Apps</h3>
        <ul>${site.apps.map((a) => `<li><a href="/${a.slug}/">${escapeHtml(a.name)}</a></li>`).join("")}</ul>`;

  const moreApps = others.length
    ? `<h3>${app ? "More from Korucuk Apps" : "Explore"}</h3>
        <ul>${others
          .map(
            (a) => `<li><a class="mk-footer__app" href="/${a.slug}/">
              <img src="${escapeHtml(iconSrc(a))}" alt="" width="40" height="40" loading="lazy">
              <span><strong>${escapeHtml(a.name)}</strong><span>${escapeHtml(a.platforms.join(" · "))}</span></span>
            </a></li>`
          )
          .join("")}</ul>`
    : "";

  return `<footer class="mk-footer">
    <div class="mk-wrap">
      <div class="mk-footer__top">
        <div>
          <p class="mk-eyebrow">Feedback</p>
          <h2>Got a question or an idea?</h2>
          <p>Tell us what works, what breaks, or what you want next.</p>
        </div>
        <a class="mk-btn mk-btn--light" href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
      </div>
      <div class="mk-footer__grid">
        <div class="mk-footer__about">
          <a class="mk-bar__home" href="/"><span class="mk-logo" aria-hidden="true">K</span><span>Korucuk Apps</span></a>
          <p>Thoughtfully crafted apps for iOS and Android.</p>
        </div>
        <div>${appLinks}</div>
        <div>${moreApps}</div>
        <div>
          <h3>Creator</h3>
          <p class="mk-footer__creator-name">${escapeHtml(owner.name)}</p>
          <p>Independent maker of thoughtfully crafted apps.</p>
          <a class="mk-footer__creator-link" href="${escapeHtml(creatorSite)}">${escapeHtml(creatorSite.replace(/^https?:\/\//, ""))} <span aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
      <div class="mk-footer__bar">
        <span>Copyright ${new Date().getFullYear()} Korucuk Apps. All rights reserved.</span>
        <span>${escapeHtml((owner.website || "").replace(/^https?:\/\//, ""))}</span>
      </div>
    </div>
  </footer>`;
};

const shell = ({ title, description, app, active, path, ogImage, jsonLd, main, rail = "" }) => {
  const theme = app ? appTheme(app) : BRAND_THEME;
  const origin = site.owner.website || "https://apps.korucuk.com";
  const url = `${origin}${path}`;
  const desc = description || "Thoughtfully crafted apps for iOS and Android by Ahmet Said Korucuk.";
  const icon = iconSrc(app || site.apps[0]);
  const image = ogImage || `${origin}${icon}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc)}">
    <meta name="robots" content="index,follow">
    <meta name="theme-color" content="${escapeHtml(theme.from)}" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="${escapeHtml(theme.dark.bg)}" media="(prefers-color-scheme: dark)">
    <link rel="canonical" href="${escapeHtml(url)}">
    <link rel="icon" type="image/png" href="${escapeHtml(icon)}">
    <link rel="apple-touch-icon" href="${escapeHtml(icon)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Korucuk Apps">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(desc)}">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(desc)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
    <script>document.documentElement.className+=" js";try{var t=localStorage.getItem("mk-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}try{if(sessionStorage.getItem("mk-enter")){sessionStorage.removeItem("mk-enter");document.documentElement.classList.add("mk-entering")}}catch(e){}</script>
    <link rel="stylesheet" href="/site.css?v=${assetVersion}">
    <script src="/site.js?v=${assetVersion}" defer></script>
  </head>
  <body class="mk-body mk-themed${app ? "" : " mk-home"}" style="${themeStyle(theme)}">
    ${themeToggle}
    ${topBar(app, active)}
    ${rail}
    <main>
      ${main}
    </main>
    ${siteFooter(app)}
  </body>
</html>`;
};

const DOC_TABS = [
  ["policy", "Privacy Policy"],
  ["terms", "Terms of Use"],
  ["support", "Support"],
  ["account-deletion", "Account Deletion"]
];

const docTabs = (app, key) =>
  `<nav class="mk-tabs" aria-label="Documents">
    <span class="mk-tabs__pill" aria-hidden="true"></span>
    ${DOC_TABS.map(([k, label]) => `<a href="/${app.slug}/${k}/"${k === key ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
  </nav>`;

const layout = ({ title, app, content }) => {
  const key = /Privacy/.test(title)
    ? "policy"
    : /Terms/.test(title)
      ? "terms"
      : /Account Deletion/.test(title)
        ? "account-deletion"
        : /Referer/.test(title)
          ? "referer"
          : "support";

  return shell({
    title,
    description: app.description,
    app,
    active: key,
    path: `/${app.slug}/${key === "policy" ? "policy" : key}/`,
    main: `<div class="mk-wrap mk-docwrap">
      <a class="mk-docapp" href="/${app.slug}/"><img src="${escapeHtml(iconSrc(app))}" alt="" width="46" height="46"><span>${escapeHtml(app.name)}<small>&larr; Back to overview</small></span></a>
      ${docTabs(app, key)}
      <div class="mk-doc">${content}</div>
    </div>`
  });
};

const documentHeader = (label, app, title) => `
  <article class="document">
    <p class="eyebrow">${escapeHtml(label)}</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(app.description)}</p>
    <div class="meta">
      <span class="pill">Effective ${escapeHtml(app.effectiveDate)}</span>
      <span class="pill">${escapeHtml(app.platforms.join(", "))}</span>
      <span class="pill">Contact ${escapeHtml(app.supportEmail)}</span>
    </div>`;

const policyPage = (owner, app) =>
  layout({
    title: `${app.name} Privacy Policy`,
    app,
    content: `${documentHeader("Privacy Policy", app, `${app.name} Privacy Policy`)}
      <h2>Overview</h2>
      <p>This Privacy Policy explains how ${escapeHtml(owner.company)} handles information in connection with ${escapeHtml(app.name)}. This policy applies only to ${escapeHtml(app.name)} and not to other apps, websites, or services.</p>
      <h2>Developer and Contact</h2>
      <p>${escapeHtml(app.name)} is developed by ${escapeHtml(owner.name)}. For privacy questions or data requests, contact <a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a>.</p>
      <h2>Information We Collect</h2>
      ${asList(app.dataCollected)}
      ${app.dataNotCollected ? `<h2>Information We Do Not Collect</h2>${asList(app.dataNotCollected)}` : ""}
      <h2>How We Use Information</h2>
      ${asList(app.dataUsage || defaultDataUsage(app))}
      <h2>Data Sharing</h2>
      <p>We do not sell your personal information and do not use your data for targeted advertising. We share or process information only with service providers needed to operate ${escapeHtml(app.name)}, when you ask us to, or when required by law.</p>
      <h2>Third-Party Services</h2>
      <p>${escapeHtml(app.name)} relies on trusted third-party services to provide the app features listed below.</p>
      ${asList(app.thirdParties)}
      ${app.permissions ? `<h2>App Permissions</h2>${asList(app.permissions)}` : ""}
      <h2>Security</h2>
      <p>We use reasonable technical and organizational measures to protect information handled by ${escapeHtml(app.name)}. No method of transmission or storage is completely secure, but we work to keep your information protected through platform and provider security controls.</p>
      <h2>Data Retention</h2>
      <p>${escapeHtml(app.retention || defaultRetention(app))}</p>
      <h2>Your Choices</h2>
      <p>${escapeHtml(app.choices || defaultChoices(app))}</p>
      <h2>Children</h2>
      <p>${escapeHtml(app.name)} is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, contact us so we can review and delete it where appropriate.</p>
      <h2>Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. When we make changes, we will update the effective date on this page.</p>
      <h2>Contact</h2>
      <p>${escapeHtml(owner.name)}<br>${escapeHtml(owner.country)}<br><a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a></p>
    </article>`
  });

const termsPage = (owner, app) =>
  layout({
    title: `${app.name} Terms of Use`,
    app,
    content: `${documentHeader("Terms of Use", app, `${app.name} Terms of Use`)}
      <h2>Acceptance</h2>
      <p>By using ${escapeHtml(app.name)}, you agree to these terms. If you do not agree, do not use the app.</p>
      <h2>Use of the App</h2>
      <p>You are responsible for your use of the app and for complying with applicable laws and platform rules.</p>
      <h2>Accounts and Content</h2>
      <p>You are responsible for information you provide and for keeping account credentials secure where account features exist.</p>
      ${app.termsSpecific ? `<h2>App-Specific Terms</h2>${asList(app.termsSpecific)}` : ""}
      <h2>Service Changes</h2>
      <p>We may update, suspend, or discontinue parts of the app when needed to improve or maintain the service.</p>
      <h2>Disclaimer</h2>
      <p>The app is provided on an as-is and as-available basis to the fullest extent permitted by law.</p>
      <h2>Contact</h2>
      <p>Questions about these terms can be sent to <a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a>.</p>
    </article>`
  });

const supportPage = (owner, app) =>
  layout({
    title: `${app.name} Support`,
    app,
    content: `${documentHeader("Support", app, `${app.name} Support`)}
      <h2>Contact</h2>
      <p>For help with ${escapeHtml(app.name)}, contact <a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a>.</p>
      <h2>Useful Links</h2>
      <ul>
        <li><a href="/${app.slug}/policy/">Privacy Policy</a></li>
        <li><a href="/${app.slug}/terms/">Terms of Use</a></li>
        <li><a href="/${app.slug}/referer/">Referer Page</a></li>
        <li><a href="/${app.slug}/account-deletion/">Account Deletion</a></li>
      </ul>
      ${app.supportTopics ? `<h2>Common Support Topics</h2>${asList(app.supportTopics)}` : ""}
    </article>`
  });

const accountDeletionPage = (owner, app) =>
  layout({
    title: `${app.name} Account Deletion`,
    app,
    content: `${documentHeader("Account Deletion", app, `${app.name} Account Deletion`)}
      <h2>Delete Your Account</h2>
      <p>${escapeHtml(app.accountDeletion?.inApp || `You can request deletion of your ${app.name} account by contacting support. If an in-app deletion control is available in your installed version, you may also use that control from the account or profile area.`)}</p>
      <h2>Request Deletion by Email</h2>
      <p>If you cannot access the app, email <a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a> from the email address associated with your account and include the app name, ${escapeHtml(app.name)}, in your message.</p>
      <h2>Data Deleted</h2>
      ${asList(app.accountDeletion?.dataDeleted || defaultAccountDeletionData(app))}
      <h2>Retention</h2>
      <p>Most associated app data is deleted when the deletion request is processed. Some limited records may be retained if required by law, for security, fraud prevention, dispute resolution, or legitimate operational needs.</p>
      <h2>Contact</h2>
      <p>${escapeHtml(owner.name)}<br>${escapeHtml(owner.country)}<br><a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a></p>
    </article>`
  });

const refererPage = (owner, app) =>
  layout({
    title: `${app.name} Referer`,
    app,
    content: `${documentHeader("Verified App Page", app, `${app.name} Referer`)}
      <h2>Purpose</h2>
      <p>This page verifies that ${escapeHtml(app.name)} is published by ${escapeHtml(owner.name)} and uses ${escapeHtml(owner.website)} as its official policy and reference domain.</p>
      <h2>Allowed URLs</h2>
      <ul>
        <li><code>https://apps.korucuk.com/${app.slug}/policy/</code></li>
        <li><code>https://apps.korucuk.com/${app.slug}/privacy/</code></li>
        <li><code>https://apps.korucuk.com/${app.slug}/terms/</code></li>
        <li><code>https://apps.korucuk.com/${app.slug}/support/</code></li>
        <li><code>https://apps.korucuk.com/${app.slug}/referer/</code></li>
        <li><code>https://apps.korucuk.com/${app.slug}/account-deletion/</code></li>
      </ul>
    </article>`
  });

const CATEGORY_LABELS = {
  ProductivityApplication: "Productivity",
  GameApplication: "Game",
  LifestyleApplication: "Lifestyle",
  UtilitiesApplication: "Utilities"
};

const homePage = ({ owner, apps, media }) => {
  const cardsHtml = apps
    .map((app) => {
      const m = media[app.slug] || {};
      const kicker = CATEGORY_LABELS[app.category] || "App";
      const tagline = app.marketing?.tagline || app.description;
      const headline = app.marketing?.headline || app.name;
      const blurb = tagline.startsWith(headline) ? tagline.slice(headline.length).replace(/^[\s\u2014\-:]+/, "") || tagline : tagline;
      let visual;
      if (m.video) {
        visual = `<span class="mk-tcard__screen"><video muted loop playsinline preload="metadata"${m.video.poster ? ` poster="${escapeHtml(m.video.poster)}"` : ""}><source src="${escapeHtml(m.video.src)}" type="video/mp4"></video></span><span class="mk-tcard__caption">${escapeHtml(headline)}</span>`;
      } else if (m.card) {
        visual = `<span class="mk-tcard__screen"><img src="${escapeHtml(m.card)}" alt="" width="1920" height="1080" loading="lazy"></span><span class="mk-tcard__caption">${escapeHtml(headline)}</span>`;
      } else {
        visual = `<span class="mk-tcard__headline">${escapeHtml(headline)}</span>`;
      }
      return `<a class="mk-tcard mk-themed" href="/${app.slug}/" style="${themeStyle(appTheme(app))}" aria-label="${escapeHtml(`${app.name}: ${tagline}`)}" data-reveal>
        <span class="mk-tcard__splash" aria-hidden="true"><img src="${escapeHtml(iconSrc(app))}" alt="" width="200" height="200"></span>
        <span class="mk-tcard__top">
          <img class="mk-tcard__appicon" src="${escapeHtml(iconSrc(app))}" alt="" width="64" height="64">
          <span class="mk-tcard__id"><span class="mk-tcard__name">${escapeHtml(app.name)}</span><span class="mk-tcard__kicker">${escapeHtml(kicker)}</span></span>
        </span>
        <span class="mk-tcard__visual" aria-hidden="true">${visual}</span>
        <span class="mk-tcard__bar">
          <span class="mk-tcard__tag">${escapeHtml(blurb)}</span>
          <span class="mk-tcard__get">View</span>
        </span>
      </a>`;
    })
    .join("");

  return shell({
    title: "Korucuk Apps — thoughtfully crafted apps for iOS and Android",
    description: `Your hub for iOS and Android apps made by ${owner.name}. Explore the collection.`,
    app: null,
    active: "",
    path: "/",
    main: `<section class="mk-home-hero mk-wrap mk-stagger">
        <div class="mk-orbit">${apps
          .map((a) => `<a href="/${a.slug}/" aria-label="${escapeHtml(a.name)}"><img src="${escapeHtml(iconSrc(a))}" alt="" width="96" height="96"></a>`)
          .join("")}</div>
        <p class="mk-eyebrow">Korucuk Apps</p>
        <h1>Apps crafted for <span class="mk-grad">your everyday.</span></h1>
        <p class="mk-lede">Your hub for iOS and Android apps made by ${escapeHtml(owner.name)}. Explore the collection and find your next favorite.</p>
        <a class="mk-btn" href="#apps">Explore the apps</a>
      </section>
      <section class="mk-today mk-wrap" id="apps" aria-label="Featured apps">
        <div class="mk-today__head mk-stagger">
          <div>
            <p class="mk-eyebrow">The collection</p>
            <h2>Featured apps</h2>
          </div>
          <span class="mk-today__count">${apps.length} apps &middot; iOS &amp; Android</span>
        </div>
        <div class="mk-today__list">
          ${cardsHtml}
          <div class="mk-tcard mk-tcard--soon" data-reveal>
            <strong>More apps are on the way</strong>
            <p>New apps join the collection as they launch. Check back soon.</p>
          </div>
        </div>
      </section>`
  });
};

const storeBadges = (app) => {
  const appStore = app.storeLinks?.appStore || "#";
  const playStore = app.storeLinks?.playStore || "#";
  return `<div class="store-badges">
    <a class="store-badge" href="${escapeHtml(appStore)}" aria-label="Download on the App Store">
      <img class="store-badge__icon store-badge__icon--apple" src="/badges/apple.svg" alt="" aria-hidden="true">
      <span class="store-badge__text">
        <span class="store-badge__caption">Download on the</span>
        <span class="store-badge__title">App Store</span>
      </span>
    </a>
    <a class="store-badge" href="${escapeHtml(playStore)}" aria-label="Get it on Google Play">
      <img class="store-badge__icon" src="/badges/playstore.svg" alt="" aria-hidden="true">
      <span class="store-badge__text">
        <span class="store-badge__caption">GET IT ON</span>
        <span class="store-badge__title">Google Play</span>
      </span>
    </a>
  </div>
  <p class="store-note"><span aria-hidden="true">*</span> Links will become active once the app is launched.</p>`;
};

const gallery = (shots) => {
  if (!shots.length) return "";
  const slides = shots
    .map(
      (src, i) =>
        `<figure class="gallery__slide">
          <div class="gallery__frame">
            <img src="${escapeHtml(src)}" alt="App view ${i + 1}" loading="${i < 2 ? "eager" : "lazy"}">
          </div>
        </figure>`
    )
    .join("");
  return `<div class="gallery gallery--coverflow" data-count="${shots.length}" tabindex="0" role="region" aria-roledescription="carousel" aria-label="App views">
    <button class="gallery__nav gallery__nav--prev" type="button" aria-label="Previous view">&larr;</button>
    <div class="gallery__viewport">
      <div class="gallery__track">${slides}</div>
    </div>
    <button class="gallery__nav gallery__nav--next" type="button" aria-label="Next view">&rarr;</button>
    <div class="gallery__counter" aria-live="polite"><span class="gallery__current">1</span> / ${shots.length}</div>
  </div>`;
};

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const resolveMedia = async (app) => {
  const dir = join(marketingSrc, app.slug);
  const base = `/marketingcontents/${app.slug}`;
  const m = app.marketing || {};
  let video = null;

  if (m.video?.file && (await exists(join(dir, m.video.file)))) {
    const hasPoster = m.video.poster && (await exists(join(dir, m.video.poster)));
    video = {
      src: `${base}/${m.video.file}`,
      poster: hasPoster ? `${base}/${m.video.poster}` : null
    };
  } else if (m.video?.file) {
    console.warn(`[${app.slug}] video file missing: ${m.video.file}`);
  }

  const chapters = [];
  for (const chapter of m.chapters || []) {
    const srcs = [];
    for (const file of chapter.media || []) {
      if (file === "@icon") {
        srcs.push("@icon");
      } else if (await exists(join(dir, file))) {
        srcs.push(`${base}/${file}`);
      } else {
        console.warn(`[${app.slug}] chapter media missing: ${file}`);
      }
    }
    chapters.push({ ...chapter, srcs });
  }

  const card = m.card && (await exists(join(dir, m.card))) ? `${base}/${m.card}` : video?.poster || null;
  return { video, chapters, card };
};

const soundIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>`;

const ribbon = (items) =>
  items?.length
    ? `<div class="mk-ribbon"><div class="mk-ribbon__track">
        <div class="mk-ribbon__set">${items.map((i) => `<span class="mk-ribbon__item">${escapeHtml(i)}</span>`).join("")}</div>
        <div class="mk-ribbon__set" aria-hidden="true">${items.map((i) => `<span class="mk-ribbon__item">${escapeHtml(i)}</span>`).join("")}</div>
      </div></div>`
    : "";

const chapterVisual = (chapter, app, reveal = true) => {
  const rv = reveal ? " data-reveal" : "";
  const [front, back] = chapter.srcs;
  if (front === "@icon") {
    return `<div class="mk-visual"${rv}><img src="${escapeHtml(iconSrc(app))}" alt="${escapeHtml(app.name)} icon" width="240" height="240"></div>`;
  }
  const alt = escapeHtml(chapter.heading);
  if (back) {
    return `<div class="mk-stack"${rv}>
      <figure class="mk-shot mk-shot--back"><img src="${escapeHtml(back)}" width="1920" height="1080" alt="${alt} (detail)" loading="lazy"></figure>
      <figure class="mk-shot mk-shot--front"><img src="${escapeHtml(front)}" width="1920" height="1080" alt="${alt}" loading="lazy"></figure>
    </div>`;
  }
  return `<figure class="mk-shot mk-shot--single"${rv} data-tilt><img src="${escapeHtml(front)}" width="1920" height="1080" alt="${alt}" loading="lazy"></figure>`;
};

const renderChapter = (chapter, index, app, side) => {
  const first = index === 0;
  const id = chapter.id || `chapter-${index + 1}`;
  const num = String(index + 1).padStart(2, "0");
  const eyebrow = `<p class="mk-eyebrow"><span class="mk-num">${num}</span>${escapeHtml(chapter.eyebrow || "")}</p>`;
  const heading = `<h2>${escapeHtml(chapter.heading)}</h2>`;
  const copy = chapter.html ? `<div class="mk-copy">${chapter.html}</div>` : "";

  if (chapter.srcs.length) {
    return `<section class="mk-chapter mk-chapter--${side}${first ? " mk-chapter--first" : ""} mk-wrap" id="${escapeHtml(id)}">
      <div class="mk-chapter__text${first ? "" : " mk-stagger"}">${eyebrow}${heading}${copy}</div>
      <div class="mk-chapter__media">${chapterVisual(chapter, app, !first)}</div>
    </section>`;
  }

  const cols = chapter.cards?.length === 4 || chapter.cards?.length === 7 ? 4 : 3;
  const cards = chapter.cards?.length
    ? `<div class="mk-cards" data-cols="${cols}">${chapter.cards
        .map(
          (c, i) => `<article class="mk-card" data-reveal style="--d:${i % 3}"><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.body)}</p></article>`
        )
        .join("")}</div>`
    : "";
  const chips = chapter.chips?.length
    ? `<ul class="mk-chips" data-reveal>${chapter.chips.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
    : "";
  const outro = chapter.outro ? `<div class="mk-copy mk-copy--outro" data-reveal>${chapter.outro}</div>` : "";

  return `<section class="mk-chapter mk-chapter--center mk-wrap" id="${escapeHtml(id)}">
    <div class="mk-head${first ? "" : " mk-stagger"}">${eyebrow}${heading}${copy}</div>
    ${cards}${chips}${outro}
  </section>`;
};

const marketingPage = (owner, app, shots, media) => {
  const origin = owner.website || "https://apps.korucuk.com";
  const url = `${origin}/${app.slug}/`;
  const m = app.marketing || {};
  const tagline = m.tagline || app.description;
  const iconPath = iconSrc(app);
  const ogImage = `${origin}${media.video?.poster || media.card || iconPath}`;
  const creatorSite = owner.personalSite || owner.website;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.description,
    applicationCategory: app.category || "MobileApplication",
    operatingSystem: app.platforms.join(", "),
    url,
    image: `${origin}${iconPath}`,
    author: { "@type": "Person", name: owner.name, url: creatorSite },
    publisher: { "@type": "Organization", name: owner.company, url: origin }
  }).replaceAll("<", "\\u003c");

  const heroMedia = media.video
    ? `<div class="mk-hero__media">
        <div class="mk-video" data-tilt>
          <video muted loop playsinline autoplay preload="metadata"${media.video.poster ? ` poster="${escapeHtml(media.video.poster)}"` : ""} aria-label="${escapeHtml(app.name)} promo video">
            <source src="${escapeHtml(media.video.src)}" type="video/mp4">
          </video>
          <button class="mk-video__sound" type="button" aria-pressed="false">${soundIcon}<span>Play with sound</span></button>
        </div>
      </div>`
    : `<div class="mk-hero__media mk-hero__media--solo">
        <img class="mk-hero__bigicon" src="${escapeHtml(iconPath)}" alt="${escapeHtml(app.name)} icon" width="320" height="320">
      </div>`;

  let mediaIndex = 0;
  const chapterHtml = media.chapters.map((chapter, i) => {
    let side = "center";
    if (chapter.srcs.length) {
      side = chapter.side || (mediaIndex % 2 === 0 ? "right" : "left");
      mediaIndex += 1;
    }
    return renderChapter(chapter, i, app, side);
  });

  const appViews = shots.length
    ? `<section class="mk-views mk-wrap" id="app-views">
        <div class="mk-head mk-stagger" style="text-align:center;max-width:760px;margin:0 auto 32px">
          <p class="mk-eyebrow">In the app</p>
          <h2 class="mk-section__title">App Views</h2>
        </div>
        <div data-reveal>${gallery(shots)}</div>
      </section>`
    : "";

  const railItems = [
    ...media.chapters.map((c, i) => ({ id: c.id || `chapter-${i + 1}`, label: c.eyebrow || c.heading })),
    ...(shots.length ? [{ id: "app-views", label: "App Views" }] : []),
    { id: "download", label: "Download" }
  ];
  if (shots.length) {
    const viewsAt = railItems.findIndex((r) => r.id === "app-views");
    const [views] = railItems.splice(viewsAt, 1);
    railItems.splice(Math.min(1, media.chapters.length), 0, views);
  }
  const rail = `<nav class="mk-rail" aria-label="Page chapters">${railItems
    .map((r) => `<a href="#${escapeHtml(r.id)}" data-label="${escapeHtml(r.label)}" aria-label="${escapeHtml(r.label)}"></a>`)
    .join("")}</nav>`;

  const main = `<section class="mk-hero mk-wrap">
      <div class="mk-hero__copy">
        ${media.video ? `<img class="mk-hero__icon" src="${escapeHtml(iconPath)}" alt="" width="84" height="84">` : ""}
        <p class="mk-eyebrow">${escapeHtml(app.platforms.join(" · "))}</p>
        <h1>${escapeHtml(app.name)}</h1>
        <p class="mk-lede">${escapeHtml(tagline)}</p>
        ${storeBadges(app)}
      </div>
      ${heroMedia}
    </section>

    ${ribbon(m.ribbon)}

    ${chapterHtml[0] || ""}
    ${appViews}
    ${chapterHtml.slice(1).join("\n")}

    <section class="mk-wrap" id="download">
      <div class="mk-cta" data-reveal>
        <h2>Get ${escapeHtml(app.name)}</h2>
        <p>Built for ${escapeHtml(app.platforms.join(" and "))}.</p>
        ${storeBadges(app)}
      </div>
    </section>`;

  return shell({
    title: `${app.name} — ${app.platforms.join(" & ")} app`,
    description: app.description,
    app,
    active: "overview",
    path: `/${app.slug}/`,
    ogImage,
    jsonLd,
    main,
    rail
  });
};

const sitemap = (origin, apps) => {
  const urls = ["/"];
  for (const app of apps) {
    urls.push(`/${app.slug}/`, `/${app.slug}/policy/`, `/${app.slug}/terms/`, `/${app.slug}/support/`, `/${app.slug}/account-deletion/`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join("\n")}
</urlset>
`;
};

const build = async () => {
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const apps = source.apps.map((app) => ({
    ...app,
    slug: slugify(app.slug || app.name)
  }));

  await rm(distPath, { recursive: true, force: true });
  await mkdir(distPath, { recursive: true });
  await copyFile(join(root, "CNAME"), join(distPath, "CNAME"));
  await copyFile(join(publicPath, "site.css"), join(distPath, "site.css"));
  await copyFile(join(publicPath, "site.js"), join(distPath, "site.js"));
  site = { owner: source.owner, apps };
  assetVersion = createHash("sha1")
    .update(await readFile(join(publicPath, "site.css")))
    .update(await readFile(join(publicPath, "site.js")))
    .digest("hex")
    .slice(0, 10);

  const notJunk = (src) => basename(src) !== ".DS_Store";

  try {
    await stat(screenshotsSrc);
    await cp(screenshotsSrc, join(distPath, "screenshots"), { recursive: true, filter: notJunk });
  } catch {
    // no screenshots directory yet
  }

  try {
    await stat(marketingSrc);
    await cp(marketingSrc, join(distPath, "marketingcontents"), { recursive: true, filter: notJunk });
  } catch {
    // no marketing content directory yet
  }

  try {
    await stat(join(publicPath, "badges"));
    await cp(join(publicPath, "badges"), join(distPath, "badges"), { recursive: true });
  } catch {
    // no badges directory
  }

  try {
    await stat(join(publicPath, "icons"));
    await cp(join(publicPath, "icons"), join(distPath, "icons"), { recursive: true });
  } catch {
    // no icons directory
  }

  const mediaBySlug = {};
  for (const app of apps) {
    mediaBySlug[app.slug] = await resolveMedia(app);
  }
  await writePage("", homePage({ owner: source.owner, apps, media: mediaBySlug }));

  for (const app of apps) {
    const shots = await listScreenshots(app.slug);
    const media = mediaBySlug[app.slug];
    await writePage(app.slug, marketingPage(source.owner, app, shots, media));
    await writePage(`${app.slug}/policy`, policyPage(source.owner, app));
    await writePage(`${app.slug}/privacy`, policyPage(source.owner, app));
    await writePage(`${app.slug}/terms`, termsPage(source.owner, app));
    await writePage(`${app.slug}/support`, supportPage(source.owner, app));
    await writePage(`${app.slug}/referer`, refererPage(source.owner, app));
    await writePage(`${app.slug}/account-deletion`, accountDeletionPage(source.owner, app));
  }

  const origin = source.owner.website || "https://apps.korucuk.com";
  await writeFile(join(distPath, "sitemap.xml"), sitemap(origin, apps));
  await writeFile(join(distPath, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);

  console.log(`Built ${apps.length} app(s) into ${distPath}`);
};

await build();

if (process.argv.includes("--watch")) {
  console.log("Watch mode is not enabled for this minimal setup. Run npm run build after edits.");
}
