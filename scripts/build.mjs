import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

const root = path.resolve(import.meta.dirname, "..");
const baseDir = path.join(root, "base");
const contentDir = path.join(root, "content/articles");
const faithContentDir = path.join(root, "content/faith");
const outputDir = path.join(root, "dist");
const templatesDir = path.join(root, "templates");
const siteBase = String(process.env.SITE_BASE ?? "")
  .trim()
  .replace(/^([^/])/, "/$1")
  .replace(/\/$/, "");

async function walk(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await walk(full));
    else results.push(full);
  }
  return results;
}

function applySiteBase(source) {
  if (!siteBase) return source;
  return source
    .replaceAll('href="/', `href="${siteBase}/`)
    .replaceAll('src="/', `src="${siteBase}/`)
    .replace(/url\((['"]?)\//g, `url($1${siteBase}/`);
}

function parseFrontMatter(source, fileName) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${fileName} is missing its metadata block.`);
  const data = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`Invalid metadata in ${fileName}: ${line}`);
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return { data, markdown: match[2].trim() };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function replaceOne(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Could not find ${label} in the page template.`);
  return source.replace(pattern, replacement);
}

const files = (await readdir(contentDir)).filter((file) => file.endsWith(".md") && !file.startsWith("_"));
const articles = [];
for (const file of files) {
  const source = await readFile(path.join(contentDir, file), "utf8");
  const { data, markdown } = parseFrontMatter(source, file);
  const required = ["title", "topic", "summary", "deck", "question", "date", "readTime", "author", "draft"];
  for (const key of required) if (data[key] === undefined) throw new Error(`${file} is missing ${key}.`);
  articles.push({ ...data, slug: file.replace(/\.md$/, ""), markdown });
}

const published = articles
  .filter((article) => article.draft !== true)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

await rm(outputDir, { recursive: true, force: true });
await cp(baseDir, outputDir, { recursive: true });
await rm(path.join(outputDir, "insights"), { recursive: true, force: true });

const cardHtml = published.map((article, position) => {
  const number = String(published.length - position).padStart(2, "0");
  return `<a class="learning-card-link" href="/insights/${article.slug}"><span class="topic-tag">${escapeHtml(article.topic)}</span><div class="article-index">${number}</div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.summary)}</p><span class="article-status">Read article →</span></a>`;
}).join("");

let home = await readFile(path.join(baseDir, "index.html"), "utf8");
home = replaceOne(
  home,
  /(<div class="learning-grid"[^>]*>)[\s\S]*?(<\/div><\/section><section class="contact")/,
  `$1${cardHtml}$2`,
  "the homepage article list",
);
await writeFile(path.join(outputDir, "index.html"), home);

const templateSource = await readFile(
  path.join(templatesDir, "article.html"),
  "utf8",
);

for (const article of published) {
  let page = templateSource;
  page = replaceOne(page, /<p class="eyebrow bronze">[\s\S]*?<\/p>/, `<p class="eyebrow bronze">${escapeHtml(article.topic)} · ${escapeHtml(article.readTime)}</p>`, "article topic");
  page = replaceOne(page, /<h1>[\s\S]*?<\/h1>/, `<h1>${escapeHtml(article.headline ?? article.title)}</h1>`, "article headline");
  page = replaceOne(page, /<div class="insight-deck"><p>[\s\S]*?<\/p><span>[\s\S]*?<\/span><\/div>/, `<div class="insight-deck"><p>${escapeHtml(article.deck)}</p><span>By ${escapeHtml(article.author)}</span></div>`, "article introduction");
  page = replaceOne(page, /(<p class="card-label">The central question<\/p><blockquote>)[\s\S]*?(<\/blockquote>)/, `$1${escapeHtml(article.question)}$2`, "central question");
  page = replaceOne(page, /(<div class="insight-body">)[\s\S]*?(<\/div><\/div><\/article>)/, `$1${marked.parse(article.markdown)}$2`, "article body");
  const target = path.join(outputDir, "insights", article.slug);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, "index.html"), page);
}

const faithFiles = (await readdir(faithContentDir)).filter((file) => file.endsWith(".md") && !file.startsWith("_"));
const faithArticles = [];
for (const file of faithFiles) {
  const source = await readFile(path.join(faithContentDir, file), "utf8");
  const { data, markdown } = parseFrontMatter(source, file);
  const required = ["title", "category", "summary", "deck", "question", "date", "readTime", "author", "draft"];
  for (const key of required) if (data[key] === undefined) throw new Error(`${file} is missing ${key}.`);
  faithArticles.push({ ...data, slug: file.replace(/\.md$/, ""), markdown });
}

const previewFaith = process.env.PREVIEW_FAITH === "1";
const visibleFaith = faithArticles
  .filter((article) => article.draft !== true || previewFaith)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

if (visibleFaith.length) {
  const faithCards = visibleFaith.map((article, position) => {
    const number = String(visibleFaith.length + 1 - position).padStart(2, "0");
    return `<a class="faith-card" href="/faith/${article.slug}"><div class="faith-card-meta"><span>${escapeHtml(article.category)}</span><span>${number}</span></div><span class="faith-card-rule" aria-hidden="true"></span><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.summary)}</p><span class="faith-card-action">Read the article <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></a>`;
  }).join("");

  const catalogue = `<section class="faith-catalogue shell" aria-labelledby="faith-catalogue-title"><div class="faith-catalogue-heading"><div><p class="eyebrow">Further reading</p><h2 id="faith-catalogue-title">Articles on faith and life.</h2><p>Christian thought applied to work, conduct, Scripture and the life of belief.</p></div></div><div class="faith-cards">${faithCards}</div></section>`;
  let faithHome = await readFile(path.join(baseDir, "faith/index.html"), "utf8");
  faithHome = faithHome.replace("</head>", '<link rel="stylesheet" href="/assets/faith-catalogue.css"/></head>');
  faithHome = replaceOne(faithHome, /<footer class="faith-footer shell">/, `${catalogue}<footer class="faith-footer shell">`, "the Faith page footer");
  await writeFile(path.join(outputDir, "faith/index.html"), faithHome);

  const faithTemplate = await readFile(path.join(templatesDir, "faith-article.html"), "utf8");
  for (const article of visibleFaith) {
    let page = faithTemplate;
    page = replaceOne(page, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(article.title)} | Muoio</title>`, "Faith article title");
    page = replaceOne(page, /<meta name="description" content="[^"]*"\/>/, `<meta name="description" content="${escapeHtml(article.summary)}"/>`, "Faith article description");
    page = replaceOne(page, /<p class="eyebrow bronze">[\s\S]*?<\/p>/, `<p class="eyebrow bronze">${escapeHtml(article.category)} · ${escapeHtml(article.readTime)}</p>`, "Faith article category");
    page = replaceOne(page, /(<section class="faith-article-hero"><div class="shell">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/, `$1${escapeHtml(article.title)}$2`, "Faith article headline");
    page = replaceOne(page, /(<section class="faith-article-hero"><div class="shell">[\s\S]*?<\/h1><p>)[\s\S]*?(<\/p><\/div><\/section>)/, `$1${escapeHtml(article.deck)}$2`, "Faith article introduction");
    page = replaceOne(page, /(<div class="faith-article-layout shell"><aside><p class="card-label">The central claim<\/p><p>)[\s\S]*?(<\/p><\/aside>)/, `$1${escapeHtml(article.question)}$2`, "Faith article central question");
    page = replaceOne(page, /(<article class="faith-article-body">)[\s\S]*?(<\/article><\/div><footer class="guide-footer shell">)/, `$1${marked.parse(article.markdown)}$2`, "Faith article body");
    const target = path.join(outputDir, "faith", article.slug);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "index.html"), page);
  }
}

for (const file of await walk(outputDir)) {
  if (!/\.(?:html|css|js)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  await writeFile(file, applySiteBase(source));
}

console.log(`Built ${published.length} professional articles and ${visibleFaith.length} additional Faith articles${previewFaith ? " in preview mode" : ""}${siteBase ? ` for ${siteBase}` : ""}.`);
