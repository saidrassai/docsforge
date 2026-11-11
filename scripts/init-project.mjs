#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  backupFile,
  copyDir,
  ensureDir,
  exists,
  getToolkitHome,
  gitRoot,
  isoDate,
  parseFlags,
  readJson,
  readText,
  resolveRoot,
  timestamp,
  writeJson,
  writeText,
} from "./lib/fsutil.mjs";
import { detectProject } from "./detect-stack.mjs";
import { loadProjectConfig, validateConfig } from "./validate-config.mjs";
import { parseYaml, stringifyYaml } from "./lib/yaml.mjs";

const TOOLKIT = getToolkitHome();
const VERSION = readText(path.join(TOOLKIT, "VERSION"), "0.0.0").trim();
const AGENTS_START = "<!-- DOCUMENTATION:START -->";
const AGENTS_END = "<!-- DOCUMENTATION:END -->";

function render(template, values) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : `{{${key}}}`,
  );
}

function bool(value) {
  return value ? "true" : "false";
}

function mergeExistingConfig(existing, overrides) {
  const config = structuredClone(existing || {});
  config.version = 1;
  config.project = {
    ...(config.project || {}),
    name: config.project?.name || overrides.projectName,
    type: config.project?.type || overrides.projectType,
  };
  config.codebase = {
    enabled: true,
    engine: "openwiki",
    output: "openwiki/",
    instructions: "openwiki/INSTRUCTIONS.md",
    ignore_file: ".openwikiignore",
    ...(config.codebase || {}),
  };
  config.user_docs = {
    enabled: overrides.userEnabled,
    framework: overrides.framework,
    audience: config.user_docs?.audience || overrides.audience,
    content_directory: overrides.contentDir,
    base_path: config.user_docs?.base_path || "/docs",
    ...(config.user_docs || {}),
    enabled: overrides.userEnabled,
    framework: overrides.framework,
    content_directory: overrides.contentDir,
  };
  config.screenshots = {
    enabled: overrides.shotsEnabled,
    engine: "playwright",
    source: "application",
    demo_data: "synthetic",
    config: "playwright.docs.config.ts",
    content_directory: "docs/assets/screenshots",
    inventory: ".documentation/screenshots/inventory.yml",
    ...(config.screenshots || {}),
    enabled: overrides.shotsEnabled,
  };
  config.automation = {
    agent_completion_sync: true,
    daily_ci_sync: overrides.dailySync,
    automatic_merge: false,
    ci_provider: overrides.ciProvider,
    ...(config.automation || {}),
    daily_ci_sync: overrides.dailySync,
    ci_provider: overrides.ciProvider,
  };
  const defaultPaths = [
    "openwiki/",
    `${overrides.contentDir}/`,
    "docs/assets/screenshots/",
    ".documentation/",
    "AGENTS.md",
    "playwright.docs.config.ts",
  ];
  const existingPaths = Array.isArray(config.automation.docs_only_paths)
    ? config.automation.docs_only_paths
    : [];
  config.automation.docs_only_paths = [...new Set([...defaultPaths, ...existingPaths])];
  config.security = {
    internal_docs_public: false,
    production_data_in_screenshots: false,
    secrets_in_docs: false,
    ...(config.security || {}),
  };
  return config;
}

function yamlScalar(value) {
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  const text = String(value);
  if (/^[A-Za-z0-9_./@-]+$/.test(text) && !/^(true|false|null|~|auto)$/i.test(text)) return text;
  return JSON.stringify(text);
}

function detectPort(detect) {
  if (detect.stack.frontend && detect.stack.docsFrameworks.some((d) => d.name === "fumadocs")) return 3000;
  if (detect.stack.languages.some((l) => l.language === "Astro")) return 4321;
  if (detect.stack.languages.some((l) => l.language === "Vue")) return 5173;
  if (detect.stack.frontend) return 3000;
  return 3000;
}

function webServerBlock(detect) {
  const pkg = exists(path.join(detect.root, "package.json"))
    ? readJson(path.join(detect.root, "package.json"), {})
    : {};
  const scripts = pkg.scripts || {};
  const pm = detect.stack.packageManager;
  const runner =
    pm === "pnpm" ? "pnpm" : pm === "yarn" ? "yarn" : pm === "bun" ? "bun" : "npm";
  let command = null;
  if (scripts.dev) command = `${runner} run dev`;
  else if (scripts.start) command = `${runner} run start`;
  if (!command) return { block: "", baseUrl: "http://127.0.0.1:3000" };
  const port = detectPort(detect);
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    block: `  webServer: {\n    command: ${JSON.stringify(command)},\n    url: ${JSON.stringify(baseUrl)},\n    reuseExistingServer: !process.env.CI,\n    timeout: 120000,\n  },`,
  };
}

function mergeAgents(root, { dryRun, force, backupDir, created, preserved, warnings }) {
  const file = path.join(root, "AGENTS.md");
  const snippet = readText(path.join(TOOLKIT, "templates", "project", "AGENTS.snippet.md")).trim();
  if (!exists(file)) {
    if (!dryRun) writeText(file, `# Project instructions\n\n${snippet}\n`);
    created.push("AGENTS.md");
    return;
  }
  const current = readText(file);
  const start = current.indexOf(AGENTS_START);
  const end = current.indexOf(AGENTS_END);
  if (start !== -1 && end !== -1 && end > start) {
    const next = `${current.slice(0, start)}${snippet}${current.slice(end + AGENTS_END.length)}`;
    if (next === current) {
      preserved.push("AGENTS.md (documentation block already current)");
      return;
    }
    if (!dryRun) {
      backupFile(file, backupDir, "AGENTS.md");
      writeText(file, next.endsWith("\n") ? next : `${next}\n`);
    }
    created.push("AGENTS.md (documentation block updated)");
    return;
  }
  if (start !== -1 || end !== -1) {
    warnings.push("AGENTS.md contains only one documentation marker; not modified. Fix the markers manually.");
    return;
  }
  const next = `${current.trimEnd()}\n\n${snippet}\n`;
  if (!dryRun) {
    backupFile(file, backupDir, "AGENTS.md");
    writeText(file, next);
  }
  created.push("AGENTS.md (documentation block appended)");
}

function writeIfMissing(file, content, { dryRun, force, backupDir, created, preserved, relative, label }) {
  const rel = relative || path.relative(process.cwd(), file);
  if (exists(file) && !force) {
    preserved.push(label || rel);
    return false;
  }
  if (exists(file) && force && backupDir && !dryRun) backupFile(file, backupDir, rel);
  if (!dryRun) writeText(file, content);
  created.push(label || rel);
  return true;
}

function copyToolkitScripts(root, { dryRun, created, preserved, force, backupDir }) {
  const dest = path.join(root, ".documentation", "toolkit");
  const scripts = ["validate-config.mjs", "audit-project.mjs", "docs-impact.mjs", "detect-stack.mjs"];
  const lib = ["fsutil.mjs", "yaml.mjs"];
  for (const script of scripts) {
    const src = path.join(TOOLKIT, "scripts", script);
    if (!exists(src)) continue;
    writeIfMissing(path.join(dest, script), readText(src), {
      dryRun,
      force,
      backupDir,
      created,
      preserved,
      relative: `.documentation/toolkit/${script}`,
    });
  }
  for (const file of lib) {
    const src = path.join(TOOLKIT, "scripts", "lib", file);
    if (!exists(src)) continue;
    writeIfMissing(path.join(dest, "lib", file), readText(src), {
      dryRun,
      force,
      backupDir,
      created,
      preserved,
      relative: `.documentation/toolkit/lib/${file}`,
    });
  }
  writeIfMissing(path.join(dest, "LICENSE"), readText(path.join(TOOLKIT, "LICENSE")), {
    dryRun,
    force: false,
    created,
    preserved,
    relative: ".documentation/toolkit/LICENSE",
  });
}

function adapterRecommendation(detect, framework, contentDir) {
  const docs = detect.stack.docsFrameworks;
  return `# Documentation adapter recommendation

Generated ${isoDate()} by DocsForge ${VERSION}.

## Detected

- Product type: **${detect.product.type}**
- Customer UI: **${detect.product.hasUi ? "yes" : "no"}**
- Existing docs frameworks: ${docs.length ? docs.map((d) => `\`${d.name}\``).join(", ") : "none"}
- Package manager: \`${detect.stack.packageManager}\`
- CI host: \`${detect.automation.ci}\`

## Selected

- Framework: **${framework}**
- Content directory: \`${contentDir}\`
- Screenshots: **${detect.recommendations.screenshots.enabled ? "Playwright" : "not applicable"}**

## Why

${docs.length ? "An existing documentation framework was detected. Preserve and improve it; do not migrate without a concrete reason." : "No existing documentation framework was detected, so the adapter follows the toolkit decision order."}

## Next steps

1. Review this recommendation with the project owner.
2. If the framework is not installed yet, stage it and verify route/dependency
   compatibility before applying.
3. Run \`/docs-user\` to generate the first task guide.
4. Run \`/docs-screenshots\` only if a browser UI exists.
5. Never publish internal \`openwiki/\` content through the Help Center.

See \`~/.documentation-toolkit/adapters/\` for detailed setup guidance.
`;
}

function writeCi(root, detect, { dryRun, force, backupDir, created, preserved, warnings, dailySync, contentDir, screenshotsDir }) {
  const renderCi = (text) =>
    text
      .replaceAll("{{USER_DOCS_DIR}}", contentDir)
      .replaceAll("{{SCREENSHOTS_DIR}}", screenshotsDir);
  const provider = detect.automation.ci;
  if (provider === "github") {
    const dir = path.join(root, ".github", "workflows");
    const check = renderCi(readText(path.join(TOOLKIT, "templates", "ci", "github-actions", "docs-check.yml")));
    const sync = renderCi(readText(path.join(TOOLKIT, "templates", "ci", "github-actions", "docs-sync.yml")));
    writeIfMissing(path.join(dir, "docs-check.yml"), check, {
      dryRun,
      force,
      backupDir,
      created,
      preserved,
      relative: ".github/workflows/docs-check.yml",
    });
    if (dailySync) {
      writeIfMissing(path.join(dir, "docs-sync.yml"), sync, {
        dryRun,
        force,
        backupDir,
        created,
        preserved,
        relative: ".github/workflows/docs-sync.yml",
      });
    }
    return { provider, files: [".github/workflows/docs-check.yml", ".github/workflows/docs-sync.yml"] };
  }
  if (provider === "gitlab") {
    const includeFile = path.join(root, ".documentation", "ci", "openwiki-update.gitlab-ci.yml");
    const content = renderCi(readText(path.join(TOOLKIT, "templates", "ci", "gitlab", "openwiki-update.gitlab-ci.yml")));
    writeIfMissing(includeFile, content, {
      dryRun,
      force,
      backupDir,
      created,
      preserved,
      relative: ".documentation/ci/openwiki-update.gitlab-ci.yml",
    });
    const main = path.join(root, ".gitlab-ci.yml");
    if (exists(main)) {
      const current = readText(main);
      if (!current.includes("openwiki-update.gitlab-ci.yml")) {
        if (/^include\s*:/m.test(current)) {
          warnings.push("GitLab CI already has an include block; add .documentation/ci/openwiki-update.gitlab-ci.yml manually.");
        } else {
          const block = `\n# DOCUMENTATION:START\ninclude:\n  - local: .documentation/ci/openwiki-update.gitlab-ci.yml\n# DOCUMENTATION:END\n`;
          if (!dryRun) {
            backupFile(main, backupDir, ".gitlab-ci.yml");
            writeText(main, `${current.trimEnd()}\n${block}`);
          }
          created.push(".gitlab-ci.yml (documentation include appended)");
        }
      } else {
        preserved.push(".gitlab-ci.yml (documentation include already present)");
      }
    } else {
      warnings.push("No .gitlab-ci.yml found at the repository root; the staged include cannot run until one exists.");
    }
    return { provider, files: [".documentation/ci/openwiki-update.gitlab-ci.yml"] };
  }
  if (provider === "bitbucket") {
    const file = path.join(root, ".documentation", "ci", "bitbucket-pipelines.yml");
    writeIfMissing(
      file,
      renderCi(readText(path.join(TOOLKIT, "templates", "ci", "bitbucket", "bitbucket-pipelines.yml"))),
      { dryRun, force, backupDir, created, preserved, relative: ".documentation/ci/bitbucket-pipelines.yml" },
    );
    warnings.push(
      "Bitbucket detected. Merge the staged docs-sync custom pipeline into bitbucket-pipelines.yml and add the documented repository variables.",
    );
    return { provider, files: [".documentation/ci/bitbucket-pipelines.yml"] };
  }
  if (provider !== "none") {
    const file = path.join(root, ".documentation", "ci", "README.md");
    writeIfMissing(
      file,
      `# CI documentation automation\n\nDetected CI host: \`${provider}\`.\n\nThe toolkit does not create a second CI platform. Add the equivalent of\n\`templates/ci/github-actions/docs-sync.yml\` to the existing pipeline:\n\n- schedule and manual trigger;\n- pinned OpenWiki version;\n- provider secrets supplied by CI;\n- documentation-only paths;\n- PR/MR creation;\n- no auto-merge.\n`,
      { dryRun, force, backupDir, created, preserved, relative: ".documentation/ci/README.md" },
    );
    return { provider, files: [".documentation/ci/README.md"] };
  }
  warnings.push(
    "No recognized CI host. Options: add GitHub Actions, GitLab CI, or Bitbucket Pipelines; the toolkit will not create a second CI platform.",
  );
  return { provider: "none", files: [] };
}

function stageAdapter(root, framework, { dryRun, created, preserved, force }) {
  const map = {
    fumadocs: ["adapters/fumadocs", ".documentation/adapters/fumadocs"],
    mkdocs: ["adapters/mkdocs", ".documentation/adapters/mkdocs"],
  };
  const entry = map[framework];
  if (!entry) return;
  const [srcRel, destRel] = entry;
  const src = path.join(TOOLKIT, "templates", srcRel);
  const dest = path.join(root, destRel);
  if (!exists(src)) return;
  const files = [];
  const walk = (dir) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(src);
  for (const file of files) {
    const rel = path.relative(src, file);
    const target = path.join(dest, rel);
    if (exists(target) && !force) {
      preserved.push(`${destRel}/${rel}`);
      continue;
    }
    if (!dryRun) {
      ensureDir(path.dirname(target));
      fs.copyFileSync(file, target);
    }
    created.push(`${destRel}/${rel}`);
  }
}

function main(flags) {
  const root = resolveRoot(flags.root || flags._[0] || process.cwd());
  const dryRun = Boolean(flags["dry-run"]);
  const force = Boolean(flags.force);
  const rootGit = gitRoot(root);
  if (!rootGit) {
    console.error(`Not a Git repository: ${root}`);
    console.error("Initialize Git first. The toolkit never writes documentation outside a repository.");
    process.exit(2);
  }
  if (path.resolve(rootGit) !== path.resolve(root)) {
    // Allow running from a subdirectory, but always target the Git root.
    if (!flags.root && !flags._[0]) {
      // cwd inside repo: use rootGit
    }
  }
  const detect = detectProject(rootGit);
  const existing = loadProjectConfig(rootGit, { required: false });
  const existingConfig = existing.exists && existing.validation?.valid ? existing.config : null;

  const explicitUser =
    flags["with-user-docs"] ? true : flags["no-user-docs"] ? false : null;
  const explicitShots =
    flags["with-screenshots"] ? true : flags["no-screenshots"] ? false : null;
  const explicitCi = flags["with-ci"] ? true : flags["no-ci"] ? false : null;

  const userEnabled =
    explicitUser ??
    (typeof existingConfig?.user_docs?.enabled === "boolean"
      ? existingConfig.user_docs.enabled
      : detect.recommendations.userDocs.enabled);
  const framework =
    existingConfig?.user_docs?.framework && existingConfig.user_docs.framework !== "auto"
      ? existingConfig.user_docs.framework
      : detect.recommendations.userDocs.framework || (userEnabled ? "static" : "none");
  const contentDir =
    existingConfig?.user_docs?.content_directory &&
    existingConfig.user_docs.content_directory !== "auto"
      ? existingConfig.user_docs.content_directory
      : detect.recommendations.userDocs.contentDirectory || "docs/user";
  const shotsEnabled =
    explicitShots ??
    (typeof existingConfig?.screenshots?.enabled === "boolean"
      ? existingConfig.screenshots.enabled
      : detect.recommendations.screenshots.enabled);
  const ciEnabled = explicitCi ?? true;
  const ciProvider =
    existingConfig?.automation?.ci_provider && existingConfig.automation.ci_provider !== "auto"
      ? existingConfig.automation.ci_provider
      : detect.automation.ci;
  const dailySync = ciEnabled && ciProvider !== "none";

  const backupDir = path.join(rootGit, ".documentation", "backups", timestamp());
  const created = [];
  const preserved = [];
  const warnings = [];
  const files = {};

  // Configuration
  const configTemplate = readText(path.join(TOOLKIT, "templates", "config", "config.yml"));
  const audienceValue = detect.product.audienceHints.length
    ? detect.product.audienceHints
    : ["end user"];
  const audienceYaml = `[${audienceValue.map((a) => yamlScalar(a)).join(", ")}]`;
  const explicitConfigChange = explicitUser !== null || explicitShots !== null || explicitCi !== null;
  const configPath = path.join(rootGit, ".documentation", "config.yml");
  const shouldWriteConfig =
    !exists(configPath) || force || explicitConfigChange || !existing.validation?.valid;
  let configContent;
  if (shouldWriteConfig && existingConfig && !force) {
    configContent = stringifyYaml(
      mergeExistingConfig(existingConfig, {
        projectName: detect.project.name,
        projectType: detect.product.type,
        audience: audienceValue,
        userEnabled,
        framework,
        contentDir,
        shotsEnabled,
        dailySync,
        ciProvider,
      }),
    );
  } else {
    configContent = render(configTemplate, {
      PROJECT_NAME: yamlScalar(detect.project.name),
      PROJECT_TYPE: yamlScalar(detect.product.type),
      USER_DOCS_ENABLED: bool(userEnabled),
      USER_DOCS_FRAMEWORK: yamlScalar(framework),
      USER_DOCS_AUDIENCE: audienceYaml,
      USER_DOCS_DIR: yamlScalar(contentDir),
      SCREENSHOTS_ENABLED: bool(shotsEnabled),
      DAILY_CI_SYNC: bool(dailySync),
      CI_PROVIDER: yamlScalar(ciProvider),
      USER_DOCS_DIR: yamlScalar(contentDir),
    });
  }
  // Validate the generated config by parsing it through the project validator.
  if (shouldWriteConfig) {
    const existed = exists(configPath);
    if (existed && !dryRun) backupFile(configPath, backupDir, ".documentation/config.yml");
    if (!dryRun) writeText(configPath, configContent);
    created.push(existed ? ".documentation/config.yml (updated)" : ".documentation/config.yml");
    files.config = ".documentation/config.yml";
  } else {
    preserved.push(".documentation/config.yml (existing; use --force or an explicit domain flag to regenerate)");
    files.config = ".documentation/config.yml";
  }

  // Project README and state
  writeIfMissing(
    path.join(rootGit, ".documentation", "README.md"),
    readText(path.join(TOOLKIT, "templates", "project", "README.md")),
    { dryRun, force: false, created, preserved, relative: ".documentation/README.md" },
  );

  // OpenWiki brief and ignore file
  writeIfMissing(
    path.join(rootGit, "openwiki", "INSTRUCTIONS.md"),
    readText(path.join(TOOLKIT, "templates", "openwiki", "INSTRUCTIONS.md")),
    { dryRun, force: false, created, preserved, relative: "openwiki/INSTRUCTIONS.md" },
  );
  writeIfMissing(
    path.join(rootGit, ".openwikiignore"),
    readText(path.join(TOOLKIT, "templates", "openwiki", ".openwikiignore")),
    { dryRun, force: false, created, preserved, relative: ".openwikiignore" },
  );

  // User docs scaffolding
  if (userEnabled) {
    writeIfMissing(
      path.join(rootGit, ".documentation", "user-docs.md"),
      readText(path.join(TOOLKIT, "templates", "user", "README.md")),
      { dryRun, force: false, created, preserved, relative: ".documentation/user-docs.md" },
    );
    writeIfMissing(
      path.join(rootGit, ".documentation", "templates", "user-guide.md"),
      readText(path.join(TOOLKIT, "templates", "user", "guide.md")),
      { dryRun, force: false, created, preserved, relative: ".documentation/templates/user-guide.md" },
    );
    if (!dryRun) {
      const contentDirPath = path.join(rootGit, contentDir);
      ensureDir(contentDirPath);
      const keep = path.join(contentDirPath, ".gitkeep");
      if (!exists(keep) && fs.readdirSync(contentDirPath).length === 0) {
        writeText(keep, "");
        created.push(`${contentDir}/.gitkeep`);
      }
    }
  }

  // Screenshots
  const screenshotDir = path.join(rootGit, ".documentation", "screenshots");
  if (shotsEnabled) {
    writeIfMissing(
      path.join(screenshotDir, "inventory.yml"),
      readText(path.join(TOOLKIT, "templates", "user", "inventory.yml")),
      { dryRun, force: false, created, preserved, relative: ".documentation/screenshots/inventory.yml" },
    );
    writeIfMissing(
      path.join(screenshotDir, "README.md"),
      readText(path.join(TOOLKIT, "templates", "playwright", "README.md")),
      { dryRun, force: false, created, preserved, relative: ".documentation/screenshots/README.md" },
    );
    writeIfMissing(
      path.join(screenshotDir, "auth.setup.example.ts"),
      readText(path.join(TOOLKIT, "templates", "playwright", "auth.setup.ts")),
      { dryRun, force: false, created, preserved, relative: ".documentation/screenshots/auth.setup.example.ts" },
    );
    writeIfMissing(
      path.join(screenshotDir, "specs", "example.spec.ts"),
      readText(path.join(TOOLKIT, "templates", "playwright", "example.spec.ts")),
      { dryRun, force: false, created, preserved, relative: ".documentation/screenshots/specs/example.spec.ts" },
    );
    writeIfMissing(
      path.join(screenshotDir, ".gitignore"),
      ".auth/\nresults/\nreport/\n",
      { dryRun, force: false, created, preserved, relative: ".documentation/screenshots/.gitignore" },
    );
    const ws = webServerBlock(detect);
    const pw = render(readText(path.join(TOOLKIT, "templates", "playwright", "playwright.docs.config.ts")), {
      DOCS_BASE_URL: ws.baseUrl,
      WEB_SERVER_BLOCK: ws.block,
    });
    writeIfMissing(path.join(rootGit, "playwright.docs.config.ts"), pw, {
      dryRun,
      force,
      backupDir,
      created,
      preserved,
      relative: "playwright.docs.config.ts",
    });
    writeIfMissing(
      path.join(rootGit, "docs", "assets", "screenshots", ".gitkeep"),
      "",
      { dryRun, force: false, created, preserved, relative: "docs/assets/screenshots/.gitkeep" },
    );
  } else {
    warnings.push("Screenshots disabled: no browser UI detected or explicitly disabled.");
  }

  // Adapter recommendation and optional staging
  writeIfMissing(
    path.join(rootGit, ".documentation", "adapters", "recommendation.md"),
    adapterRecommendation(detect, framework, contentDir),
    { dryRun, force, backupDir, created, preserved, relative: ".documentation/adapters/recommendation.md" },
  );
  if (flags["scaffold-adapter"]) stageAdapter(rootGit, framework, { dryRun, created, preserved, force });

  // Local copies of validation scripts for CI
  copyToolkitScripts(rootGit, { dryRun, created, preserved, force, backupDir });

  // AGENTS.md policy
  mergeAgents(rootGit, { dryRun, force, backupDir, created, preserved, warnings });

  // CI
  const ci = ciEnabled
    ? writeCi(rootGit, detect, {
        dryRun,
        force,
        backupDir,
        created,
        preserved,
        warnings,
        dailySync,
        contentDir,
        screenshotsDir: "docs/assets/screenshots",
      })
    : { provider: "none", files: [] };

  // Audit directory
  if (!dryRun) ensureDir(path.join(rootGit, ".documentation", "audit"));
  writeIfMissing(
    path.join(rootGit, ".documentation", ".gitignore"),
    "backups/\n",
    { dryRun, force: false, created, preserved, relative: ".documentation/.gitignore" },
  );
  if (!exists(path.join(rootGit, ".documentation", "audit", ".gitkeep")) && !dryRun) {
    writeText(path.join(rootGit, ".documentation", "audit", ".gitkeep"), "");
    created.push(".documentation/audit/.gitkeep");
  }

  // State
  const state = {
    version: 1,
    toolkitVersion: VERSION,
    initializedAt: new Date().toISOString(),
    root: rootGit,
    project: {
      name: detect.project.name,
      type: detect.product.type,
      hasUi: detect.product.hasUi,
    },
    stack: {
      languages: detect.stack.languages,
      frontend: detect.stack.frontend,
      backend: detect.stack.backend,
      database: detect.stack.database,
      e2e: detect.stack.e2e,
      packageManager: detect.stack.packageManager,
      monorepo: detect.stack.monorepo,
    },
    adapter: {
      framework,
      contentDirectory: contentDir,
      userDocsEnabled: userEnabled,
      staged: Boolean(flags["scaffold-adapter"]),
    },
    screenshots: {
      enabled: shotsEnabled,
      config: shotsEnabled ? "playwright.docs.config.ts" : null,
    },
    ci,
    files,
  };
  if (!dryRun) writeJson(path.join(rootGit, ".documentation", "state.json"), state);

  // Validate the final config.
  const finalConfig = exists(configPath)
    ? loadProjectConfig(rootGit, { required: true })
    : { validation: validateConfig(parseYaml(configContent), { root: rootGit }) };
  const validation = finalConfig?.validation || { valid: true, errors: [], warnings: [] };

  const report = {
    root: rootGit,
    dryRun,
    toolkitVersion: VERSION,
    project: state.project,
    stack: state.stack,
    adapter: state.adapter,
    screenshots: state.screenshots,
    ci: state.ci,
    created,
    preserved,
    warnings,
    validation,
  };

  if (flags.json || flags.format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`${dryRun ? "DRY RUN — " : ""}Documentation initialized`);
    console.log(`Repository: ${rootGit}`);
    console.log(`Project:    ${state.project.name} (${state.project.type})  UI: ${state.project.hasUi ? "yes" : "no"}`);
    console.log(`Adapter:    ${framework}  content: ${contentDir}`);
    console.log(`Screenshots:${shotsEnabled ? " Playwright" : " not applicable"}`);
    console.log(`CI:         ${ci.provider}`);
    console.log(`\nCreated/updated (${created.length}):`);
    for (const item of created) console.log(`  + ${item}`);
    if (preserved.length) {
      console.log(`\nPreserved (${preserved.length}):`);
      for (const item of preserved) console.log(`  = ${item}`);
    }
    if (warnings.length) {
      console.log(`\nWarnings (${warnings.length}):`);
      for (const item of warnings) console.log(`  ! ${item}`);
    }
    if (!validation.valid) {
      console.log("\nCONFIG VALIDATION FAILED:");
      for (const error of validation.errors) console.log(`  ERROR: ${error}`);
    } else {
      console.log("\nConfig validation: PASS");
    }
    console.log("\nNext: run `/docs-code` to initialize OpenWiki content, then `/docs-user` for the first guide.");
    if (dryRun) console.log("Dry run: no files were written.");
  }

  if (!validation.valid) process.exit(1);
}

if (process.argv[1]?.endsWith("init-project.mjs")) {
  const flags = parseFlags();
  try {
    main(flags);
  } catch (error) {
    console.error(`init-project: ${error.message}`);
    if (process.env.DEBUG) console.error(error.stack);
    process.exit(2);
  }
}
