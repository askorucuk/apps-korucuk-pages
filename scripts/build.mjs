import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, "src", "apps.json");
const distPath = join(root, "dist");
const publicPath = join(root, "public");

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

const writePage = async (route, html) => {
  const pageDir = join(distPath, route);
  await mkdir(pageDir, { recursive: true });
  await writeFile(join(pageDir, "index.html"), html);
};

const layout = ({ title, app, content }) => {
  const nav = app
    ? `<nav class="nav" aria-label="Document navigation">
        <a href="/${app.slug}/policy/">Policy</a>
        <a href="/${app.slug}/terms/">Terms</a>
        <a href="/${app.slug}/support/">Support</a>
        <a href="/${app.slug}/referer/">Referer</a>
        <a href="/${app.slug}/account-deletion/">Delete Account</a>
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
      ${asList([
        `To create, sync, display, update, complete, skip, restore, and delete your ${app.name} tasks`,
        "To provide account sign-in, account management, and optional profile features",
        "To save app preferences and reminder settings",
        "To send local task reminders when you enable notifications",
        "To maintain app security, prevent abuse, and troubleshoot service issues",
        "To respond to support requests and privacy requests"
      ])}
      <h2>Data Sharing</h2>
      <p>We do not sell your personal information and do not use your data for targeted advertising. We share or process information only with service providers needed to operate ${escapeHtml(app.name)}, when you ask us to, or when required by law.</p>
      <h2>Third-Party Services</h2>
      <p>${escapeHtml(app.name)} relies on trusted third-party services to provide authentication, database, storage, app distribution, and reminder features.</p>
      ${asList(app.thirdParties)}
      ${app.permissions ? `<h2>App Permissions</h2>${asList(app.permissions)}` : ""}
      <h2>Security</h2>
      <p>We use reasonable technical and organizational measures to protect information handled by ${escapeHtml(app.name)}. No method of transmission or storage is completely secure, but we work to keep your information protected through platform and provider security controls.</p>
      <h2>Data Retention</h2>
      <p>We keep your account information, tasks, preferences, rules, and optional profile photo while your account remains active or as needed to provide ${escapeHtml(app.name)}. Tasks moved to trash may be permanently deleted automatically after 10 days. If you delete your account, the app attempts to delete your tasks, rules, settings, and optional profile photo associated with that account, unless retention is required by law or needed for legitimate security purposes.</p>
      <h2>Your Choices</h2>
      <p>You can update your profile information in the app where available. You can delete individual tasks, permanently delete tasks, or delete your account from the app. You may also request access, correction, or deletion of your personal information by contacting us at <a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a>.</p>
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
    </article>`
  });

const accountDeletionPage = (owner, app) =>
  layout({
    title: `${app.name} Account Deletion`,
    app,
    content: `${documentHeader("Account Deletion", app, `${app.name} Account Deletion`)}
      <h2>Delete Your Account In the App</h2>
      <p>You can request deletion of your ${escapeHtml(app.name)} account from inside the app by opening Profile and choosing Delete Account. When account deletion is completed, ${escapeHtml(app.name)} attempts to delete the account and associated app data, including tasks, rules, settings, and optional profile photo.</p>
      <h2>Request Deletion by Email</h2>
      <p>If you cannot access the app, email <a href="mailto:${escapeHtml(app.supportEmail)}">${escapeHtml(app.supportEmail)}</a> from the email address associated with your account and include the app name, ${escapeHtml(app.name)}, in your message.</p>
      <h2>Data Deleted</h2>
      ${asList([
        "Your app account identifier and account profile data controlled by the app",
        "Tasks and task history stored for your account",
        "Rules, settings, and preferences stored for your account",
        "Optional profile photo uploaded through the app"
      ])}
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
        <li><code>https://www.apps.korucuk.com/${app.slug}/policy/</code></li>
        <li><code>https://www.apps.korucuk.com/${app.slug}/terms/</code></li>
        <li><code>https://www.apps.korucuk.com/${app.slug}/support/</code></li>
        <li><code>https://www.apps.korucuk.com/${app.slug}/referer/</code></li>
        <li><code>https://www.apps.korucuk.com/${app.slug}/account-deletion/</code></li>
      </ul>
    </article>`
  });

const homePage = ({ owner, apps }) =>
  layout({
    title: "Korucuk Apps",
    content: `<section class="document">
      <p class="eyebrow">App Documents</p>
      <h1>Korucuk Apps</h1>
      <p>Official policy, terms, support, and referer pages for apps published by ${escapeHtml(owner.name)}.</p>
      <div class="app-grid">
        ${apps
          .map(
            (app) => `<a class="app-card" href="/${app.slug}/policy/">
              <strong>${escapeHtml(app.name)}</strong>
              <span>${escapeHtml(app.description)}</span>
            </a>`
          )
          .join("")}
      </div>
    </section>`
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
  await writePage("", homePage({ owner: source.owner, apps }));

  for (const app of apps) {
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
