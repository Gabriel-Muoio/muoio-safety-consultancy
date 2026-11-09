import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");

async function walk(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await walk(full));
    else results.push(full);
  }
  return results;
}

const files = await walk(dist);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const failures = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (/VINEXT_RSC|id="_R_"|modulepreload/.test(html)) failures.push(`${file}: contains application-runtime remnants`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const url = match[1].split("#")[0].split("?")[0];
    if (!url || url === "/") continue;
    const relative = url.slice(1);
    const target = path.extname(relative) ? path.join(dist, relative) : path.join(dist, relative, "index.html");
    try { await access(target); } catch { failures.push(`${file}: missing ${url}`); }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} pages and their internal files.`);
