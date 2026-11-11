#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getToolkitHome, readText } from "./lib/fsutil.mjs";
import { parseYaml } from "./lib/yaml.mjs";

const TOOLKIT = getToolkitHome();
const results = [];
let failed = 0;

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, status: "PASS", detail: detail || "" });
  } catch (error) {
    failed++;
    results.push({ name, status: "FAIL", detail: error.message });
  }
}

function run(script, args, options = {}) {
  return execFileSync("node", [path.join(TOOLKIT, "scripts", script), ...args], {
    encoding: "utf8",
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    timeout: options.timeout || 120000,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "docs-toolkit-selftest-"));
try {
  check("toolkit files exist", () => {
    for (const rel of ["README.md", "VERSION", "LICENSE", "skills", "agents", "commands", "scripts", "templates", "schemas"]) {
      assert(fs.existsSync(path.join(TOOLKIT, rel)), `missing ${rel}`);
    }
    return `version ${readText(path.join(TOOLKIT, "VERSION")).trim()}`;
  });

  check("skill frontmatter is valid", () => {
    const ids = [];
    for (const entry of fs.readdirSync(path.join(TOOLKIT, "skills"), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(TOOLKIT, "skills", entry.name, "SKILL.md");
      const text = readText(file);
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      assert(match, `${entry.name}: no frontmatter`);
      const data = parseYaml(match[1]);
      assert(data.name === entry.name, `${entry.name}: name mismatch`);
      assert(data.description && data.description.length <= 1024, `${entry.name}: bad description`);
      assert(data.license, `${entry.name}: missing license`);
      ids.push(entry.name);
    }
    assert(ids.length === 6, `expected 6 skills, found ${ids.length}`);
    return ids.join(", ");
  });

  check("JSON manifests parse", () => {
    for (const rel of ["agents/agents.json", "commands/commands.json", "adapters/manifest.json", "schemas/config.schema.json"]) {
      JSON.parse(readText(path.join(TOOLKIT, rel)));
    }
    return "4 manifests";
  });

  // Isolated Git repository
  execFileSync("git", ["init", "-q"], { cwd: tmp });
  fs.mkdirSync(path.join(tmp, "app"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, "package.json"),
    JSON.stringify({
      name: "selftest-app",
      private: true,
      scripts: { dev: "next dev" },
      dependencies: { next: "15.0.0", react: "19.0.0", "@prisma/client": "6.0.0" },
      devDependencies: { "@playwright/test": "1.65.0" },
    }),
  );
  fs.writeFileSync(
    path.join(tmp, "app", "page.tsx"),
    "export default function Page() { return <main><h1>Selftest</h1></main>; }\n",
  );
  execFileSync("git", ["add", "."], { cwd: tmp });
  execFileSync(
    "git",
    ["-c", "user.email=selftest@example.com", "-c", "user.name=Selftest", "commit", "-qm", "init"],
    { cwd: tmp },
  );

  check("stack detection", () => {
    const out = JSON.parse(run("detect-stack.mjs", ["--root", ".", "--json"], { cwd: tmp }));
    assert(out.git.isRepo, "not detected as Git");
    assert(out.product.hasUi === true, "UI not detected");
    assert(out.recommendations.userDocs.framework === "fumadocs", "Fumadocs not recommended");
    assert(out.recommendations.screenshots.engine === "playwright", "Playwright not recommended");
    return `${out.product.type}, ${out.stack.languages.map((l) => l.language).join("/")}`;
  });

  check("project initialization", () => {
    run("init-project.mjs", ["--root", ".", "--no-ci"], { cwd: tmp });
    const required = [
      ".documentation/config.yml",
      ".documentation/state.json",
      ".documentation/user-docs.md",
      ".documentation/templates/user-guide.md",
      ".documentation/screenshots/inventory.yml",
      "openwiki/INSTRUCTIONS.md",
      ".openwikiignore",
      "AGENTS.md",
      "playwright.docs.config.ts",
    ];
    for (const rel of required) assert(fs.existsSync(path.join(tmp, rel)), `missing ${rel}`);
    return `${required.length} files`;
  });

  check("config validation", () => {
    const out = JSON.parse(run("validate-config.mjs", ["--root", ".", "--json"], { cwd: tmp }));
    assert(out.valid, out.errors.join("; "));
    return "valid";
  });

  check("deterministic audit", () => {
    const out = JSON.parse(run("audit-project.mjs", ["--root", ".", "--json", "--no-write"], { cwd: tmp }));
    assert(typeof out.summary.total === "number", "missing summary");
    assert(Array.isArray(out.findings), "missing findings");
    return `${out.summary.total} findings (${out.summary.counts.HIGH} high)`;
  });

  check("documentation impact", () => {
    fs.writeFileSync(
      path.join(tmp, "app", "page.tsx"),
      "export default function Page() { return <main><h1>Changed</h1></main>; }\n",
    );
    const out = JSON.parse(run("docs-impact.mjs", ["--root", ".", "--base", "HEAD", "--json"], { cwd: tmp }));
    assert(out.changedFiles.length > 0, "no changed files");
    assert(out.counts.byCategory.ui > 0, "UI change not classified");
    return `${out.changedFiles.length} changed, ui=${out.counts.byCategory.ui}`;
  });

  check("no cross-project writes", () => {
    const outside = path.join(path.dirname(tmp), "docs-toolkit-outside-check");
    fs.rmSync(outside, { recursive: true, force: true });
    fs.mkdirSync(outside, { recursive: true });
    const before = fs.readdirSync(outside).length;
    run("audit-project.mjs", ["--root", ".", "--json", "--no-write"], { cwd: tmp });
    const after = fs.readdirSync(outside).length;
    fs.rmSync(outside, { recursive: true, force: true });
    assert(before === after, "outside directory changed");
    return "target root only";
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

for (const result of results) {
  console.log(`${result.status.padEnd(4)}  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed > 0 ? 1 : 0);
