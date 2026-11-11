#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  exists,
  getToolkitHome,
  gitRoot,
  parseFlags,
  readJson,
  readText,
  resolveRoot,
  tryGit,
} from "./lib/fsutil.mjs";
import { parseYaml } from "./lib/yaml.mjs";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".mypy_cache",
  ".pytest_cache",
  "Pods",
  "DerivedData",
]);

function walk(root, { maxDepth = 3, limit = 4000 } = {}) {
  const files = [];
  const dirs = [];
  function visit(dir, depth) {
    if (files.length >= limit) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= limit) return;
      if (entry.name.startsWith(".") && !["github", "gitlab", "documentation"].includes(entry.name)) {
        if (entry.isDirectory()) continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        dirs.push(full);
        if (depth < maxDepth) visit(full, depth + 1);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  visit(root, 0);
  return { files, dirs };
}

function firstExisting(root, candidates) {
  for (const rel of candidates) {
    const full = path.join(root, rel);
    if (exists(full)) return rel;
  }
  return null;
}

function readPackage(root) {
  const file = path.join(root, "package.json");
  if (!exists(file)) return null;
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
}

function readPythonSignals(root) {
  const files = ["pyproject.toml", "requirements.txt", "requirements-dev.txt", "Pipfile", "setup.py", "manage.py"];
  const texts = [];
  for (const rel of files) {
    const file = path.join(root, rel);
    if (exists(file)) texts.push(readText(file));
  }
  const text = texts.join("\n").toLowerCase();
  const has = (name) => text.includes(name.toLowerCase());
  const deps = new Set();
  for (const name of [
    "django",
    "flask",
    "fastapi",
    "starlette",
    "sqlalchemy",
    "alembic",
    "psycopg2",
    "psycopg",
    "asyncpg",
    "pydantic",
    "celery",
    "pytest",
    "playwright",
    "mkdocs",
    "mkdocs-material",
    "uvicorn",
    "gunicorn",
  ]) {
    if (has(name)) deps.add(name);
  }
  let name = null;
  const projectName = text.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
  if (projectName) name = projectName[1];
  return {
    present: texts.length > 0,
    deps,
    name,
    hasManagePy: exists(path.join(root, "manage.py")),
    hasTemplates: exists(path.join(root, "templates")) || exists(path.join(root, "src", "templates")),
  };
}

function dependencySet(pkg) {
  if (!pkg) return new Set();
  return new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ]);
}

function hasAny(set, names) {
  return names.filter((name) => set.has(name));
}

function detectLanguageCounts(files) {
  const counts = {};
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const map = {
      ".ts": "TypeScript",
      ".tsx": "TypeScript",
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".mjs": "JavaScript",
      ".cjs": "JavaScript",
      ".py": "Python",
      ".go": "Go",
      ".rs": "Rust",
      ".rb": "Ruby",
      ".php": "PHP",
      ".java": "Java",
      ".kt": "Kotlin",
      ".cs": "C#",
      ".swift": "Swift",
      ".dart": "Dart",
      ".vue": "Vue",
      ".svelte": "Svelte",
      ".astro": "Astro",
      ".sql": "SQL",
    };
    if (map[ext]) counts[map[ext]] = (counts[map[ext]] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([language, count]) => ({ language, files: count }));
}

function detectDocs(root, pkgDeps) {
  const checks = [
    ["fumadocs", ["fumadocs-core", "fumadocs-ui", "fumadocs-mdx"]],
    ["nextra", ["nextra", "nextra-theme-docs"]],
    ["docusaurus", ["@docusaurus/core"]],
    ["starlight", ["@astrojs/starlight"]],
    ["vitepress", ["vitepress"]],
    ["mkdocs", []],
    ["mintlify", []],
    ["gitbook", []],
  ];
  const detected = [];
  for (const [name, deps] of checks) {
    if (deps.length > 0 && hasAny(pkgDeps, deps).length > 0) {
      detected.push({ name, evidence: hasAny(pkgDeps, deps).join(", ") });
    }
  }
  const configs = [
    ["fumadocs", ["source.config.ts", "source.config.js", "fumadocs.config.ts"]],
    ["nextra", ["nextra.config.js", "nextra.config.ts"]],
    ["docusaurus", ["docusaurus.config.js", "docusaurus.config.ts"]],
    ["starlight", ["astro.config.mjs", "astro.config.ts"]],
    ["vitepress", [".vitepress/config.ts", ".vitepress/config.js", ".vitepress/config.mts"]],
    ["mkdocs", ["mkdocs.yml", "mkdocs.yaml"]],
    ["mintlify", ["mint.json", "docs.json"]],
    ["gitbook", [".gitbook.yaml"]],
  ];
  for (const [name, files] of configs) {
    const found = files.find((rel) => exists(path.join(root, rel)));
    if (found && !detected.some((item) => item.name === name)) {
      detected.push({ name, evidence: found });
    }
  }
  return detected;
}

function detectRoutes(root, files) {
  const routes = [];
  const routeRoots = [
    "app",
    "src/app",
    "pages",
    "src/pages",
    "routes",
    "src/routes",
    "views",
    "src/views",
  ];
  for (const rel of routeRoots) {
    const dir = path.join(root, rel);
    if (!exists(dir)) continue;
    for (const file of files) {
      if (!file.startsWith(dir + path.sep)) continue;
      const base = path.basename(file);
      if (!/^(page|index|route|view|screen)\.(tsx|ts|jsx|js|vue|svelte|astro|py|erb)$/.test(base)) {
        continue;
      }
      let route = "/" + path.relative(dir, path.dirname(file)).split(path.sep).join("/");
      route = route.replace(/\/\([^)]+\)/g, "").replace(/\/+/g, "/");
      if (route === "/.") route = "/";
      if (!routes.includes(route)) routes.push(route);
    }
  }
  return routes.slice(0, 100).sort();
}

function detectCi(root) {
  if (exists(path.join(root, ".github", "workflows"))) return "github";
  if (exists(path.join(root, ".gitlab-ci.yml"))) return "gitlab";
  if (exists(path.join(root, "bitbucket-pipelines.yml"))) return "bitbucket";
  if (exists(path.join(root, ".circleci", "config.yml"))) return "circleci";
  return "none";
}

function detectRemote(root) {
  const url = tryGit(["remote", "get-url", "origin"], root);
  if (!url) return { url: null, host: null, owner: null, repo: null };
  let host = null;
  let owner = null;
  let repo = null;
  const ssh = url.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
  const https = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  const match = ssh || https;
  if (match) {
    host = match[1];
    owner = match[2];
    repo = match[3].replace(/\.git$/, "");
  }
  return { url, host, owner, repo };
}

function detectProduct({ pkg, deps, languages, ui, routes, backend, docs }) {
  const has = (...names) => names.some((name) => deps.has(name));
  if (has("react-native", "expo", "flutter")) return "mobile";
  if (has("electron", "tauri", "@tauri-apps/api")) return "desktop";
  if (has("django", "flask", "fastapi", "starlette")) {
    if (ui) return has("stripe", "django-allauth", "dj-stripe") ? "saas" : "web-app";
    return "api";
  }
  if (pkg?.bin && ui === false) return "cli";
  if (backend.length > 0 && ui === false) return "api";
  if (ui && (has("next", "react", "vue", "nuxt", "svelte", "astro") || routes.length > 0)) {
    if (has("stripe", "@stripe/stripe-js", "better-auth", "next-auth", "@auth/core", "clerk")) {
      return "saas";
    }
    return "web-app";
  }
  if (docs.length > 0 && ui === false) return "docs-site";
  if (ui) return "web-app";
  if (languages.length > 0) return "library";
  return "unknown";
}

export function detectProject(rootInput = process.cwd()) {
  const cwd = resolveRoot(rootInput);
  const root = gitRoot(cwd) || cwd;
  const pkg = readPackage(root);
  const python = readPythonSignals(root);
  const deps = dependencySet(pkg);
  if (python.deps) for (const dep of python.deps) deps.add(dep);
  const { files, dirs } = walk(root);
  const languages = detectLanguageCounts(files);
  const docs = detectDocs(root, deps);

  const frontendDeps = hasAny(deps, [
    "next",
    "react",
    "react-dom",
    "vue",
    "nuxt",
    "svelte",
    "@sveltejs/kit",
    "astro",
    "@remix-run/react",
    "@angular/core",
    "solid-js",
    "@builder.io/qwik",
  ]);
  const frontend = frontendDeps.length > 0;
  const backend = hasAny(deps, [
    "express",
    "fastify",
    "@nestjs/core",
    "hono",
    "koa",
    "@hapi/hapi",
    "django",
    "flask",
    "fastapi",
    "rails",
    "laravel/framework",
    "spring-boot",
    "actix-web",
    "axum",
  ]);
  const database = hasAny(deps, [
    "prisma",
    "@prisma/client",
    "drizzle-orm",
    "typeorm",
    "sequelize",
    "knex",
    "mongoose",
    "sqlalchemy",
    "alembic",
    "psycopg2",
    "pg",
    "mysql2",
    "better-sqlite3",
  ]);
  const e2e = hasAny(deps, ["@playwright/test", "playwright", "cypress", "puppeteer", "puppeteer-core"]);
  const testing = hasAny(deps, ["vitest", "jest", "mocha", "pytest", "@testing-library/react", "playwright", "@playwright/test"]);

  const uiDirs = [
    "app",
    "src/app",
    "pages",
    "src/pages",
    "components",
    "src/components",
    "views",
    "src/views",
    "frontend",
    "web",
    "public",
  ];
  const rootHtml = ["index.html", "src/index.html", "public/index.html", "static/index.html"].find((rel) =>
    exists(path.join(root, rel)),
  );
  const uiEvidence = uiDirs.filter((rel) => {
    const dir = path.join(root, rel);
    if (!exists(dir)) return false;
    if (rel === "app" && python.present && !frontend) return false;
    const { files: nested } = walk(dir, { maxDepth: 2, limit: 400 });
    return nested.some((file) => /\.(tsx|jsx|vue|svelte|astro|html)$/i.test(file));
  });
  if (rootHtml) uiEvidence.push(rootHtml);
  const routes = detectRoutes(root, files);
  const ui = frontend || uiEvidence.length > 0 || routes.length > 0 || python.hasTemplates;

  const monorepoSignals = [
    "pnpm-workspace.yaml",
    "turbo.json",
    "nx.json",
    "lerna.json",
    "rush.json",
    "go.work",
  ].filter((rel) => exists(path.join(root, rel)));
  if (pkg?.workspaces) monorepoSignals.push("package.json#workspaces");

  const lockfiles = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb", "bun.lock", "poetry.lock", "uv.lock", "Gemfile.lock", "composer.lock", "Cargo.lock", "go.sum"].filter(
    (rel) => exists(path.join(root, rel)),
  );
  let packageManager = "unknown";
  if (pkg?.packageManager) packageManager = String(pkg.packageManager).split("@")[0];
  else if (lockfiles.includes("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (lockfiles.includes("package-lock.json")) packageManager = "npm";
  else if (lockfiles.includes("yarn.lock")) packageManager = "yarn";
  else if (lockfiles.includes("bun.lockb") || lockfiles.includes("bun.lock")) packageManager = "bun";
  else if (lockfiles.includes("poetry.lock")) packageManager = "poetry";
  else if (lockfiles.includes("uv.lock")) packageManager = "uv";
  else if (python.present) packageManager = "pip";

  const openwikiDir = path.join(root, "openwiki");
  const openwiki = {
    exists: exists(openwikiDir),
    files: exists(openwikiDir)
      ? walk(openwikiDir, { maxDepth: 2, limit: 2000 }).files.length
      : 0,
    instructions: exists(path.join(openwikiDir, "INSTRUCTIONS.md")),
    index: exists(path.join(openwikiDir, "index.md")),
    quickstart: exists(path.join(openwikiDir, "quickstart.md")),
    claims: exists(path.join(openwikiDir, ".claims")),
    lastUpdate: exists(path.join(openwikiDir, ".last-update.json")),
    runState: exists(path.join(openwikiDir, ".run.json")),
    pageManifest: exists(path.join(openwikiDir, ".page-manifest.json")),
  };

  let projectConfig = null;
  const configFile = path.join(root, ".documentation", "config.yml");
  if (exists(configFile)) {
    try {
      projectConfig = parseYaml(readText(configFile));
    } catch {
      projectConfig = { _parseError: true };
    }
  }

  const agentsMd = exists(path.join(root, "AGENTS.md"));
  const claudeMd = exists(path.join(root, "CLAUDE.md"));
  const ci = detectCi(root);
  const remote = detectRemote(root);
  const productType = detectProduct({ pkg, deps, languages, ui, routes, backend, docs });

  const docsFramework = docs.length > 0 ? docs[0].name : recommendFramework(deps, productType, python);
  const pythonReferenceDocs =
    python.present && docsFramework === "mkdocs" && (productType === "api" || productType === "cli" || productType === "library");
  const hasDocsFramework = docs.length > 0;
  const recommendations = {
    codebase: {
      enabled: true,
      engine: "openwiki",
      output: "openwiki/",
      reason: "Engineering knowledge is useful for every software repository.",
    },
    userDocs: {
      enabled:
        hasDocsFramework ||
        (ui && productType !== "api" && productType !== "cli" && productType !== "library") ||
        pythonReferenceDocs,
      framework: docsFramework,
      contentDirectory: recommendContentDir(docs, deps, docsFramework),
      reason: hasDocsFramework
        ? "An existing documentation framework was detected; preserve and improve it."
        : ui
          ? "A customer-facing UI exists, so task-based user guides are applicable."
          : pythonReferenceDocs
            ? "Python-oriented project: use MkDocs for developer-facing API, CLI, or library reference documentation. No browser screenshot harness."
            : "No customer-facing browser UI was detected; prefer reference docs over a Help Center.",
    },
    screenshots: {
      enabled: ui && productType !== "api" && productType !== "cli" && productType !== "library",
      engine: "playwright",
      reason: ui
        ? "A browser UI exists; Playwright can capture real screenshots."
        : "No browser UI; screenshot automation is not applicable.",
    },
    ci: {
      provider: ci,
      reason:
        ci === "none"
          ? "No recognized CI host; do not create a second CI platform."
          : `Existing CI host detected: ${ci}.`,
    },
  };

  return {
    generatedAt: new Date().toISOString(),
    toolkitHome: getToolkitHome(),
    root,
    git: {
      isRepo: Boolean(gitRoot(cwd)),
      root: gitRoot(cwd),
      remote,
    },
    project: {
      name: pkg?.name || python.name || path.basename(root),
      version: pkg?.version || null,
      description: pkg?.description || null,
      private: pkg?.private ?? null,
    },
    stack: {
      languages,
      frontend,
      backend,
      database,
      e2e,
      testing,
      docsFrameworks: docs,
      monorepo: monorepoSignals.length > 0,
      monorepoSignals,
      packageManager,
      lockfiles,
      hasUi: ui,
      uiEvidence,
      routes,
    },
    product: {
      type: productType,
      hasUi: ui,
      audienceHints: inferAudienceHints(routes),
    },
    docs: {
      projectConfig,
      projectConfigFile: exists(configFile) ? ".documentation/config.yml" : null,
      openwiki,
      agentsMd,
      claudeMd,
      existing: {
        docs: exists(path.join(root, "docs")),
        documentation: exists(path.join(root, "documentation")),
        contentDocs: exists(path.join(root, "content", "docs")),
        website: exists(path.join(root, "website")),
        readme: exists(path.join(root, "README.md")),
      },
    },
    automation: {
      ci,
      remoteHost: remote.host,
      githubWorkflows: exists(path.join(root, ".github", "workflows"))
        ? fs.readdirSync(path.join(root, ".github", "workflows")).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
        : [],
    },
    recommendations,
  };
}

function recommendFramework(deps, productType, python = { present: false }) {
  if (deps.has("next")) return "fumadocs";
  if (deps.has("astro")) return "starlight";
  if (deps.has("vue") || deps.has("nuxt")) return "vitepress";
  if (deps.has("react")) return "docusaurus";
  if (python.present) return "mkdocs";
  if (productType === "api" || productType === "cli" || productType === "library") return "none";
  return "static";
}

function recommendContentDir(docs, deps, framework = null) {
  if (framework === "mkdocs") return "docs";
  if (docs.some((doc) => doc.name === "fumadocs")) return "content/docs";
  if (docs.some((doc) => doc.name === "docusaurus")) return "docs";
  if (docs.some((doc) => doc.name === "starlight")) return "src/content/docs";
  if (docs.some((doc) => doc.name === "mkdocs")) return "docs";
  if (deps.has("next")) return "docs/user";
  return "docs/user";
}

function inferAudienceHints(routes) {
  const hints = new Set();
  for (const route of routes) {
    if (/admin/i.test(route)) hints.add("administrator");
    if (/settings|members|team/i.test(route)) hints.add("workspace owner/admin");
    if (/billing|plans|subscription/i.test(route)) hints.add("billing owner");
    if (/dashboard|onboarding/i.test(route)) hints.add("end user");
  }
  return [...hints].sort();
}

function printHuman(result) {
  const lines = [
    `Repository: ${result.root}`,
    `Git: ${result.git.isRepo ? "yes" : "NO"}  Remote: ${result.git.remote.host || "none"}`,
    `Project: ${result.project.name}`,
    `Product: ${result.product.type}  UI: ${result.product.hasUi ? "yes" : "no"}`,
    `Languages: ${result.stack.languages.map((l) => l.language).join(", ") || "unknown"}`,
    `Frontend: ${result.stack.frontend ? "yes" : "no"}  Backend: ${result.stack.backend.join(", ") || "none"}`,
    `Database: ${result.stack.database.join(", ") || "none"}`,
    `E2E: ${result.stack.e2e.join(", ") || "none"}`,
    `Docs: ${result.stack.docsFrameworks.map((d) => d.name).join(", ") || "none"}`,
    `OpenWiki: ${result.docs.openwiki.exists ? "present" : "absent"}`,
    `Config: ${result.docs.projectConfigFile || "absent"}`,
    `CI: ${result.automation.ci}`,
    `Recommend codebase: ${result.recommendations.codebase.enabled ? "yes" : "no"}`,
    `Recommend user docs: ${result.recommendations.userDocs.enabled ? result.recommendations.userDocs.framework : "no"}`,
    `Recommend screenshots: ${result.recommendations.screenshots.enabled ? "playwright" : "no"}`,
  ];
  console.log(lines.join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("detect-stack.mjs")) {
  const flags = parseFlags();
  const root = flags.root || flags._[0] || process.cwd();
  try {
    const result = detectProject(root);
    if (flags.json || flags.format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHuman(result);
    }
  } catch (error) {
    console.error(`detect-stack: ${error.message}`);
    process.exit(1);
  }
}
