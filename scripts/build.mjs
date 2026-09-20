import { mkdir, readFile, rm, writeFile, copyFile, readdir, cp, stat } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, "src", "apps.json");
const distPath = join(root, "dist");
const publicPath = join(root, "public");
const screenshotsSrc = join(publicPath, "screenshots");

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
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
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

const layout = ({ title, app, content }) => {
  const nav = app
    ? `<nav class="nav" aria-label="Document navigation">
        <a href="/${app.slug}/">Overview</a>
        <a href="/${app.slug}/policy/">Policy</a>
        <a href="/${app.slug}/terms/">Terms</a>
        <a href="/${app.slug}/support/">Support</a>
        <a href="/${app.slug}/account-deletion/">Account Deletion</a>
      </nav>`
    : `<nav class="nav" aria-label="Site navigation"><a href="/">Apps</a></nav>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="robots" content="index,follow">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header class="site-header">
      <div class="site-header__inner">
        <a class="brand" href="/">Korucuk Apps</a>
        ${nav}
      </div>
    </header>
    <main class="page">
      ${content}
    </main>
    <footer class="site-footer">
      <span>Copyright ${new Date().getFullYear()} Korucuk Apps. All rights reserved.</span>
    </footer>
  </body>
</html>`;
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

const homePage = ({ owner, apps }) =>
  layout({
    title: "Korucuk Apps",
    content: `<section class="document">
      <p class="eyebrow">Apps</p>
      <h1>Korucuk Apps</h1>
      <p>Apps published by ${escapeHtml(owner.name)}.</p>
      <div class="app-grid">
        ${apps
          .map(
            (app) => `<a class="app-card" href="/${app.slug}/">
              <img class="app-card__icon" src="/icons/${escapeHtml(app.slug)}.png" alt="">
              <div class="app-card__body">
                <strong>${escapeHtml(app.name)}</strong>
                <span>${escapeHtml(app.marketing?.tagline || app.description)}</span>
              </div>
            </a>`
          )
          .join("")}
      </div>
    </section>`
  });

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
  if (!shots.length) {
    return `<div class="gallery gallery--empty">
      <p>Screenshots coming soon.</p>
    </div>`;
  }
  const slides = shots
    .map(
      (src, i) =>
        `<figure class="gallery__slide">
          <img src="${escapeHtml(src)}" alt="App view ${i + 1}" loading="${i < 2 ? "eager" : "lazy"}">
        </figure>`
    )
    .join("");
  return `<div class="gallery gallery--coverflow" data-count="${shots.length}">
    <button class="gallery__nav gallery__nav--prev" type="button" aria-label="Previous view">&larr;</button>
    <div class="gallery__viewport">
      <div class="gallery__track">${slides}</div>
    </div>
    <button class="gallery__nav gallery__nav--next" type="button" aria-label="Next view">&rarr;</button>
    <div class="gallery__counter"><span class="gallery__current">1</span> / ${shots.length}</div>
  </div>
  <script>
  (function(){
    var g = document.currentScript.previousElementSibling;
    while (g && !g.classList.contains('gallery')) g = g.previousElementSibling;
    if (!g) return;
    var track = g.querySelector('.gallery__track');
    var slides = Array.prototype.slice.call(g.querySelectorAll('.gallery__slide'));
    var current = g.querySelector('.gallery__current');
    var idx = 0;
    function show(n){
      idx = (n + slides.length) % slides.length;
      slides.forEach(function(s, i){
        s.classList.remove('is-active', 'is-near', 'is-far');
        var d = Math.abs(i - idx);
        if (d === 0) s.classList.add('is-active');
        else if (d === 1) s.classList.add('is-near');
        else s.classList.add('is-far');
      });
      var slideW = slides[0].offsetWidth;
      var viewportW = g.querySelector('.gallery__viewport').offsetWidth;
      var offset = (viewportW / 2) - slideW / 2 - idx * slideW;
      track.style.transform = 'translateX(' + offset + 'px)';
      if (current) current.textContent = String(idx + 1);
    }
    g.querySelector('.gallery__nav--prev').addEventListener('click', function(){ show(idx - 1); });
    g.querySelector('.gallery__nav--next').addEventListener('click', function(){ show(idx + 1); });
    slides.forEach(function(s, i){
      s.addEventListener('click', function(){ if (i !== idx) show(i); });
    });
    // Touch swipe
    var sx = null;
    g.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, {passive:true});
    g.addEventListener('touchend', function(e){
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
    window.addEventListener('resize', function(){ show(idx); });
    show(0);
  })();
  </script>`;
};

const marketingPage = (owner, app, shots) =>
  layout({
    title: `${app.name} — ${app.marketing?.tagline || app.description}`,
    app,
    content: `<article class="document marketing">
      <div class="marketing__hero">
        <img class="app-icon" src="/icons/${escapeHtml(app.slug)}.png" alt="${escapeHtml(app.name)} icon">
        <div class="marketing__hero-text">
          <p class="eyebrow">${escapeHtml(app.platforms.join(" · "))}</p>
          <h1>${escapeHtml(app.name)}</h1>
          <p class="lede">${escapeHtml(app.marketing?.tagline || app.description)}</p>
        </div>
      </div>
      ${storeBadges(app)}

      ${
        app.marketing?.sections
          ? app.marketing.sections
              .map((s) => `<h2>${escapeHtml(s.heading)}</h2>${s.html}`)
              .join("")
          : `<h2>About</h2>
      <p>${escapeHtml(app.marketing?.longDescription || app.description)}</p>

      <h2>What you can do</h2>
      ${asList(app.marketing?.features || ["Placeholder"])}`
      }

      <h2>App Views</h2>
      ${gallery(shots)}

      <h2>Feedback</h2>
      <p>For feedback, bug reports, or suggestions, email <a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a>.</p>

      <h2>Legal</h2>
      <ul>
        <li><a href="/${app.slug}/policy/">Privacy Policy</a></li>
        <li><a href="/${app.slug}/terms/">Terms of Use</a></li>
        <li><a href="/${app.slug}/support/">Support</a></li>
        <li><a href="/${app.slug}/account-deletion/">Account Deletion</a></li>
      </ul>

      <section class="creator">
        <p class="eyebrow">Creator</p>
        <h3>${escapeHtml(owner.name)}</h3>
        <p>Independent maker of small, focused apps.</p>
        <p><a class="creator__link" href="${escapeHtml(owner.personalSite || owner.website)}">${escapeHtml((owner.personalSite || owner.website).replace(/^https?:\/\//, ""))}</a></p>
      </section>
    </article>`
  });

const build = async () => {
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const apps = source.apps.map((app) => ({
    ...app,
    slug: slugify(app.slug || app.name)
  }));

  await rm(distPath, { recursive: true, force: true });
  await mkdir(distPath, { recursive: true });
  await copyFile(join(root, "CNAME"), join(distPath, "CNAME"));
  await copyFile(join(publicPath, "styles.css"), join(distPath, "styles.css"));

  try {
    await stat(screenshotsSrc);
    await cp(screenshotsSrc, join(distPath, "screenshots"), { recursive: true });
  } catch {
    // no screenshots directory yet
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

  await writePage("", homePage({ owner: source.owner, apps }));

  for (const app of apps) {
    const shots = await listScreenshots(app.slug);
    await writePage(app.slug, marketingPage(source.owner, app, shots));
    await writePage(`${app.slug}/policy`, policyPage(source.owner, app));
    await writePage(`${app.slug}/privacy`, policyPage(source.owner, app));
    await writePage(`${app.slug}/terms`, termsPage(source.owner, app));
    await writePage(`${app.slug}/support`, supportPage(source.owner, app));
    await writePage(`${app.slug}/referer`, refererPage(source.owner, app));
    await writePage(`${app.slug}/account-deletion`, accountDeletionPage(source.owner, app));
  }

  console.log(`Built ${apps.length} app(s) into ${distPath}`);
};

await build();

if (process.argv.includes("--watch")) {
  console.log("Watch mode is not enabled for this minimal setup. Run npm run build after edits.");
}
