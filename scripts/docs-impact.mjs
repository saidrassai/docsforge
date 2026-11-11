#!/usr/bin/env node
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  exists,
  listFiles,
  parseFlags,
  readText,
  resolveRoot,
  gitRoot,
} from "./lib/fsutil.mjs";
import { parseYaml } from "./lib/yaml.mjs";
import { loadProjectConfig } from "./validate-config.mjs";

const SKIP = /(^|\/)(node_modules|\.git|dist|build|coverage|\.next|\.nuxt|vendor|target)\//;

function gitDiff(root, base) {
  const args = ["diff", "--name-status", `${base}...HEAD`];
  let out = "";
  try {
    out = execFileSync("git", args, { cwd: root, encoding: "utf8" });
  } catch {
    try {
      out = execFileSync("git", ["diff", "--name-status", base], { cwd: root, encoding: "utf8" });
    } catch {
      out = "";
    }
  }
  const files = [];
  for (const line of out.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0]?.[0] || "M";
    const file = parts[1] || "";
    if (file && !SKIP.test(file)) files.push({ status, file });
  }
  // Include uncommitted changes and untracked source files for local sync.
  try {
    const unstaged = execFileSync("git", ["diff", "--name-only"], { cwd: root, encoding: "utf8" });
    for (const file of unstaged.split(/\r?\n/)) {
      if (file && !SKIP.test(file) && !files.some((f) => f.file === file)) files.push({ status: "M", file });
    }
  } catch {
    // ignore
  }
  try {
    const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: root, encoding: "utf8" });
    for (const file of staged.split(/\r?\n/)) {
      if (file && !SKIP.test(file) && !files.some((f) => f.file === file)) files.push({ status: "M", file });
    }
  } catch {
    // ignore
  }
  return files;
}

function classify(file) {
  const f = file.toLowerCase();
  const categories = [];
  if (/^(openwiki|docs|\.documentation)\//.test(f) || f === "agents.md" || f === "playwright.docs.config.ts") {
    categories.push("documentation");
  }
  if (/(^|\/)(app|pages|src\/app|src\/pages|components|views|screens)\//.test(f) && /\.(tsx|jsx|vue|svelte|astro|html|css|scss)$/.test(f)) {
    categories.push("ui");
  }
  if (/(^|\/)(api|routes|controllers|handlers|endpoints|graphql|openapi|swagger)\//.test(f)) {
    categories.push("api");
  }
  if (/(^|\/)(migrations?|schema|models?|entities|prisma|drizzle|database|db)\//.test(f) || /\.sql$/.test(f)) {
    categories.push("database");
  }
  if (/(^|\/)(auth|authorization|permissions?|policies|rbac|tenant|tenants|security)\//.test(f)) {
    categories.push("auth");
  }
  if (/(^|\/)(jobs?|workers?|queues?|schedulers?|cron|tasks)\//.test(f)) {
    categories.push("jobs");
  }
  if (
    !categories.includes("ui") &&
    (/(^|\/)(config|configs|infra|infrastructure|deploy|deployment|terraform|helm|k8s|kubernetes)\//.test(f) ||
      /(^|\/)(\.env|dockerfile|docker-compose|compose\.ya?ml|terraform|\.tf)$/.test(f))
  ) {
    categories.push("config");
  }
  if (/(^|\/)(tests?|__tests__|spec|e2e|cypress|playwright)\//.test(f) || /\.(test|spec)\.(ts|tsx|js|jsx|py)$/.test(f)) {
    categories.push("tests");
  }
  if (/(^|\/)(integrations?|services?|providers?|webhooks?|external)\//.test(f)) {
    categories.push("integrations");
  }
  if (categories.length === 0) categories.push("other");
  return categories;
}

function routeFromFile(file) {
  let rel = `/${file.replace(/\\/g, "/")}`;
  const markers = ["/app/", "/pages/", "/src/app/", "/src/pages/", "/routes/", "/src/routes/"];
  let start = -1;
  for (const marker of markers) {
    const idx = rel.indexOf(marker);
    if (idx !== -1) {
      start = idx + marker.length;
      break;
    }
  }
  if (start === -1) return null;
  rel = rel.slice(start).replace(/\.(tsx|ts|jsx|js|vue|svelte|astro|mdx|md)$/i, "");
  rel = rel.replace(/\/(page|index|route|view|screen)$/i, "");
  rel = rel.replace(/\/\([^)]+\)/g, "");
  return `/${rel}`.replace(/\/+/g, "/") || "/";
}

function docPages(root, dirs) {
  const pages = [];
  for (const dir of dirs) {
    const full = path.join(root, dir);
    if (!exists(full)) continue;
    for (const file of listFiles(full, (f) => /\.(md|mdx)$/i.test(f))) {
      pages.push({ file, rel: path.relative(root, file).replace(/\\/g, "/"), content: readText(file) });
    }
  }
  return pages;
}

function screenshotInventory(root, config) {
  const file = path.join(root, config?.screenshots?.inventory || ".documentation/screenshots/inventory.yml");
  if (!exists(file)) return [];
  try {
    const data = parseYaml(readText(file));
    return Array.isArray(data?.screenshots) ? data.screenshots : [];
  } catch {
    return [];
  }
}

function normalizeRel(value) {
  return String(value || "")
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/");
}

export function analyzeImpact(rootInput, { base = "HEAD~1" } = {}) {
  const root = resolveRoot(rootInput);
  const git = gitRoot(root);
  if (!git) throw new Error("Not a Git repository");
  const loaded = loadProjectConfig(root, { required: false });
  const config = loaded.config;
  const changed = gitDiff(root, base);
  const categories = {};
  const impactedRoutes = new Set();
  for (const item of changed) {
    const cats = classify(item.file);
    for (const cat of cats) categories[cat] = (categories[cat] || 0) + 1;
    if (cats.includes("ui")) {
      const route = routeFromFile(item.file);
      if (route) impactedRoutes.add(route);
    }
  }

  const openwikiDir = config?.codebase?.output || "openwiki";
  const userDir = config?.user_docs?.content_directory && config.user_docs.content_directory !== "auto"
    ? config.user_docs.content_directory
    : "docs/user";
  const wikiPages = docPages(root, [openwikiDir]);
  const userPages = docPages(root, [userDir]);

  const impactedOpenwiki = [];
  for (const page of wikiPages) {
    if (/\/INSTRUCTIONS\.md$/i.test(page.rel) || /\/quickstart\.md$/i.test(page.rel)) continue;
    const text = page.content.toLowerCase();
    const reasons = [];
    for (const item of changed) {
      const baseName = path.basename(item.file).toLowerCase().replace(/\.(ts|tsx|js|jsx|py|sql|prisma|md)$/i, "");
      if (["page", "index", "route", "layout", "loading", "error"].includes(baseName)) continue;
      const moduleName = baseName.replace(/[-_.]/g, " ");
      if (baseName.length >= 6 && text.includes(baseName)) reasons.push(item.file);
      else if (moduleName.length >= 8 && text.includes(moduleName)) reasons.push(item.file);
    }
    if (reasons.length > 0) {
      impactedOpenwiki.push({ page: page.rel, reasons: [...new Set(reasons)].slice(0, 10) });
    }
  }

  const impactedUser = [];
  for (const page of userPages) {
    const text = page.content.toLowerCase();
    const reasons = [];
    for (const route of impactedRoutes) {
      if (route !== "/" && text.includes(route.toLowerCase())) reasons.push(`route ${route}`);
    }
    for (const item of changed) {
      const baseName = path.basename(item.file).toLowerCase().replace(/\.(tsx|jsx|vue|svelte|astro)$/i, "");
      if (baseName.length >= 5 && text.includes(baseName.replace(/[-_.]/g, " "))) reasons.push(item.file);
    }
    if (reasons.length > 0) impactedUser.push({ page: page.rel, reasons: [...new Set(reasons)].slice(0, 10) });
  }

  const inventory = screenshotInventory(root, config);
  const impactedScreenshots = [];
  for (const entry of inventory) {
    const reasons = [];
    if (entry.route && impactedRoutes.has(entry.route)) reasons.push(`route ${entry.route}`);
    if (entry.spec) {
      const spec = String(entry.spec).replace(/\\/g, "/");
      if (changed.some((item) => spec.endsWith(item.file) || item.file.endsWith(spec))) reasons.push(`spec ${spec}`);
    }
    if (reasons.length > 0) impactedScreenshots.push({ id: entry.id, output: entry.output, reasons });
  }
  for (const shot of impactedScreenshots) {
    const entry = inventory.find((item) => item.id === shot.id);
    if (!entry?.guide) continue;
    const guide = normalizeRel(entry.guide);
    if (!impactedUser.some((item) => item.page === guide)) {
      impactedUser.push({ page: guide, reasons: [`screenshot ${entry.id}`, ...shot.reasons] });
    }
  }

  const engineeringImpact = Boolean(
    categories.api ||
      categories.database ||
      categories.auth ||
      categories.jobs ||
      categories.config ||
      categories.integrations ||
      impactedOpenwiki.length > 0,
  );
  const customerImpact = Boolean(
    (categories.ui && impactedRoutes.size > 0) ||
      impactedUser.length > 0 ||
      impactedScreenshots.length > 0,
  );
  const screenshotImpact = impactedScreenshots.length > 0 || (categories.ui && impactedRoutes.size > 0);

  return {
    generatedAt: new Date().toISOString(),
    root: git,
    base,
    head: (() => {
      try {
        return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
      } catch {
        return null;
      }
    })(),
    changedFiles: changed,
    counts: {
      changed: changed.length,
      byCategory: categories,
      impactedRoutes: [...impactedRoutes],
    },
    impacted: {
      openwikiPages: impactedOpenwiki,
      userGuides: impactedUser,
      screenshots: impactedScreenshots,
    },
    recommendations: {
      engineering: engineeringImpact,
      customer: customerImpact,
      screenshots: screenshotImpact,
      note:
        "Heuristic mapping. Confirm each impacted page before editing; internal refactors may require no documentation change.",
    },
  };
}

if (process.argv[1]?.endsWith("docs-impact.mjs")) {
  const flags = parseFlags();
  const root = flags.root || flags._[0] || process.cwd();
  const base = flags.base || "HEAD~1";
  try {
    const result = analyzeImpact(root, { base });
    if (flags.json || flags.format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Documentation impact — ${result.root}`);
      console.log(`Base: ${result.base}  Head: ${result.head || "uncommitted"}`);
      console.log(`Changed files: ${result.counts.changed}`);
      console.log(`Categories: ${JSON.stringify(result.counts.byCategory)}`);
      console.log(`Impacted routes: ${result.counts.impactedRoutes.join(", ") || "none"}`);
      console.log(`Engineering: ${result.recommendations.engineering ? "yes" : "no"}`);
      console.log(`Customer:    ${result.recommendations.customer ? "yes" : "no"}`);
      console.log(`Screenshots: ${result.recommendations.screenshots ? "yes" : "no"}`);
      if (result.impacted.openwikiPages.length) {
        console.log("\nOpenWiki pages:");
        for (const page of result.impacted.openwikiPages) console.log(`  ${page.page}`);
      }
      if (result.impacted.userGuides.length) {
        console.log("\nUser guides:");
        for (const page of result.impacted.userGuides) console.log(`  ${page.page}`);
      }
      if (result.impacted.screenshots.length) {
        console.log("\nScreenshots:");
        for (const shot of result.impacted.screenshots) console.log(`  ${shot.id || shot.output}`);
      }
      console.log("\n" + result.recommendations.note);
    }
  } catch (error) {
    console.error(`docs-impact: ${error.message}`);
    process.exit(2);
  }
}
