#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import {
  copyDir,
  ensureDir,
  exists,
  getOmpAgentDir,
  getOpenCodeConfigDir,
  getToolkitHome,
  hashContent,
  hashFile,
  isoDate,
  listFiles,
  parseFlags,
  readJson,
  readText,
  removeEmptyDirs,
  resolveRoot,
  timestamp,
  writeJson,
  writeText,
} from "./lib/fsutil.mjs";
import { parseYaml } from "./lib/yaml.mjs";

const TOOLKIT = getToolkitHome();
const VERSION = readText(path.join(TOOLKIT, "VERSION"), "0.0.0").trim();
const STATE_DIR = path.join(TOOLKIT, "state");
const MANIFEST_FILE = path.join(STATE_DIR, "install-manifest.json");
const COMMAND_NAMES = ["docs-init", "docs-sync", "docs-audit", "docs-code", "docs-user", "docs-screenshots"];
const AGENT_IDS = ["documentation-architect", "documentation-writer", "documentation-auditor", "screenshot-specialist"];

const COLORS = process.stdout.isTTY
  ? { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", dim: "\x1b[2m", bold: "\x1b[1m" }
  : { reset: "", green: "", yellow: "", red: "", dim: "", bold: "" };

function c(color, text) {
  return `${COLORS[color] || ""}${text}${COLORS.reset}`;
}

function log(message) {
  console.log(message);
}

function hostRoots(flags) {
  return {
    opencode: {
      name: "OpenCode",
      root: getOpenCodeConfigDir(),
      skills: path.join(getOpenCodeConfigDir(), "skills"),
      agents: path.join(getOpenCodeConfigDir(), "agents"),
      commands: path.join(getOpenCodeConfigDir(), "commands"),
    },
    omp: {
      name: "Oh My Pi",
      root: getOmpAgentDir(flags.ompAgentDir || flags["omp-agent-dir"]),
      skills: path.join(getOmpAgentDir(flags.ompAgentDir || flags["omp-agent-dir"]), "skills"),
      agents: path.join(getOmpAgentDir(flags.ompAgentDir || flags["omp-agent-dir"]), "agents"),
      commands: path.join(getOmpAgentDir(flags.ompAgentDir || flags["omp-agent-dir"]), "commands"),
    },
  };
}

function selectedHosts(flags) {
  const value = flags.host || "all";
  if (value === "all") return ["opencode", "omp"];
  const parts = String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const invalid = parts.filter((part) => !["opencode", "omp"].includes(part));
  if (invalid.length > 0) {
    console.error(`Invalid --host value(s): ${invalid.join(", ")}. Use opencode, omp, or all.`);
    process.exit(2);
  }
  return parts;
}

function readFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: null, body: content, raw: "" };
  try {
    return { data: parseYaml(match[1]), body: content.slice(match[0].length), raw: match[1] };
  } catch {
    return { data: null, body: content.slice(match[0].length), raw: match[1] };
  }
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function openCodeAgentContent(agent) {
  const lines = [
    "---",
    `description: ${yamlString(agent.description)}`,
    "mode: subagent",
  ];
  const permissions = agent.opencode?.permissions || [];
  if (permissions.length > 0) {
    lines.push("permissions:");
    for (const rule of permissions) {
      lines.push(`  - action: ${rule.action}`);
      lines.push(`    resource: ${yamlString(rule.resource)}`);
      lines.push(`    effect: ${rule.effect}`);
    }
  }
  lines.push("---", "");
  return `${lines.join("\n")}${readText(path.join(TOOLKIT, "agents", agent.prompt)).trim()}\n`;
}

function ompAgentContent(agent) {
  const lines = [
    "---",
    `name: ${agent.id}`,
    `description: ${yamlString(agent.description)}`,
  ];
  if (agent.omp?.tools) lines.push(`tools: ${agent.omp.tools}`);
  lines.push("---", "");
  return `${lines.join("\n")}${readText(path.join(TOOLKIT, "agents", agent.prompt)).trim()}\n`;
}

function commandContent(command, host) {
  const lines = ["---", `description: ${yamlString(command.description)}`];
  if (host === "omp" && command.argumentHint) {
    lines.push(`argument-hint: ${yamlString(command.argumentHint)}`);
  }
  lines.push("---", "");
  return `${lines.join("\n")}${readText(path.join(TOOLKIT, "commands", command.body)).trim()}\n`;
}

function buildPlan(host) {
  const roots = hostRoots({})[host];
  const plan = [];

  const skillsDir = path.join(TOOLKIT, "skills");
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillId = entry.name;
    const sourceDir = path.join(skillsDir, skillId);
    const files = listFiles(sourceDir);
    for (const file of files) {
      const rel = path.relative(sourceDir, file).split(path.sep).join("/");
      const content = readText(file);
      plan.push({
        host,
        kind: "skill",
        id: skillId,
        source: `skills/${skillId}/${rel}`,
        relative: `skills/${skillId}/${rel}`,
        target: path.join(roots.skills, skillId, rel),
        content,
      });
    }
  }

  const agents = readJson(path.join(TOOLKIT, "agents", "agents.json")).agents;
  for (const agent of agents) {
    const content = host === "opencode" ? openCodeAgentContent(agent) : ompAgentContent(agent);
    plan.push({
      host,
      kind: "agent",
      id: agent.id,
      source: `agents/${agent.prompt}`,
      relative: `agents/${agent.id}.md`,
      target: path.join(roots.agents, `${agent.id}.md`),
      content,
    });
  }

  const commands = readJson(path.join(TOOLKIT, "commands", "commands.json")).commands;
  for (const command of commands) {
    const content = commandContent(command, host);
    plan.push({
      host,
      kind: "command",
      id: command.name,
      source: `commands/${command.body}`,
      relative: `commands/${command.name}.md`,
      target: path.join(roots.commands, `${command.name}.md`),
      content,
    });
  }

  return plan;
}

function loadManifest() {
  return readJson(MANIFEST_FILE, {
    version: VERSION,
    installedAt: null,
    hosts: {},
  });
}

function backupExisting(host, relative, target, backupDir, backupsDone) {
  if (!exists(target)) return null;
  const key = `${host}/${relative}`;
  if (backupsDone.has(key)) return null;
  const dest = path.join(backupDir, host, relative);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(target, dest);
  backupsDone.add(key);
  return dest;
}

function install(flags) {
  const dryRun = Boolean(flags["dry-run"]);
  const force = Boolean(flags.force);
  const hosts = selectedHosts(flags);
  if (hosts.length === 0) {
    console.error("No valid host. Use --host opencode|omp|all.");
    process.exit(2);
  }
  const manifest = loadManifest();
  const backupDir = path.join(TOOLKIT, "backups", timestamp());
  const backupsDone = new Set();
  const summary = { hosts: {}, backups: [], conflicts: [], written: 0, unchanged: 0, errors: [], roots: {} };

  for (const host of hosts) {
    const roots = hostRoots(flags)[host];
    const previousHost = manifest.hosts?.[host];
    const oldHost = previousHost?.root === roots.root ? previousHost.files || {} : {};
    const files = {};
    const plan = buildPlan(host);
    summary.hosts[host] = { root: roots.root, files: plan.length };
    summary.roots[host] = roots.root;

    for (const item of plan) {
      const previous = oldHost[item.relative];
      const currentExists = exists(item.target);
      const currentContent = currentExists ? readText(item.target) : null;
      const newHash = hashContent(item.content);

      if (currentExists && currentContent === item.content) {
        files[item.relative] = {
          source: item.source,
          sha256: newHash,
          size: Buffer.byteLength(item.content),
          kind: item.kind,
        };
        summary.unchanged++;
        continue;
      }

      const unmanagedConflict = currentExists && !previous && !force;
      if (unmanagedConflict) {
        summary.conflicts.push({ host, target: item.target });
        if (!dryRun) {
          const backup = backupExisting(host, item.relative, item.target, backupDir, backupsDone);
          if (backup) summary.backups.push(backup);
        }
        continue;
      }

      if (currentExists && !dryRun) {
        const backup = backupExisting(host, item.relative, item.target, backupDir, backupsDone);
        if (backup) summary.backups.push(backup);
      }

      if (!dryRun) {
        ensureDir(path.dirname(item.target));
        writeText(item.target, item.content);
      }
      files[item.relative] = {
        source: item.source,
        sha256: newHash,
        size: Buffer.byteLength(item.content),
        kind: item.kind,
      };
      summary.written++;
    }

    manifest.hosts[host] = {
      root: roots.root,
      installedAt: new Date().toISOString(),
      files,
    };
  }

  if (!dryRun) {
    manifest.version = VERSION;
    manifest.installedAt = new Date().toISOString();
    ensureDir(STATE_DIR);
    writeJson(MANIFEST_FILE, manifest);
    if (summary.backups.length > 0) {
      writeJson(path.join(backupDir, "metadata.json"), {
        createdAt: new Date().toISOString(),
        toolkitVersion: VERSION,
        roots: summary.roots,
        backups: summary.backups,
      });
      writeText(path.join(TOOLKIT, "backups", "MANAGED-LATEST.txt"), `${path.basename(backupDir)}\n`);
    }
  }

  log(`${dryRun ? "DRY RUN — " : ""}DocsForge ${VERSION}`);
  for (const host of hosts) {
    const info = summary.hosts[host];
    log(`  ${c("bold", hostRoots(flags)[host].name)}: ${info.root}`);
    log(`    planned files: ${info.files}`);
  }
  log(`  written: ${summary.written}  unchanged: ${summary.unchanged}`);
  if (summary.backups.length > 0) {
    log(`  backups: ${backupDir}`);
  }
  if (summary.conflicts.length > 0) {
    log(c("yellow", `  conflicts skipped (not managed by this toolkit): ${summary.conflicts.length}`));
    for (const conflict of summary.conflicts.slice(0, 20)) {
      log(`    ${conflict.host}: ${conflict.target}`);
    }
    log("  Re-run with --force to back up and replace these files.");
  }
  if (dryRun) {
    log("\nDry run complete. No files were written.");
  } else {
    log("\nInstalled. Run `status` and `verify` next.");
  }
}

function status(flags) {
  const manifest = loadManifest();
  const hosts = selectedHosts(flags);
  const result = {
    toolkitVersion: VERSION,
    toolkitHome: TOOLKIT,
    manifest: exists(MANIFEST_FILE) ? MANIFEST_FILE : null,
    installedAt: manifest.installedAt,
    openwiki: openwikiStatus(),
    hosts: {},
  };

  for (const host of hosts) {
    const roots = hostRoots(flags)[host];
    const manifestHost = manifest.hosts?.[host];
    const rootMismatch = Boolean(manifestHost && manifestHost.root !== roots.root);
    const managed = rootMismatch ? {} : manifestHost?.files || {};
    const files = [];
    let missing = 0;
    let drift = 0;
    let ok = 0;
    for (const [relative, entry] of Object.entries(managed)) {
      const target = path.join(roots.root, relative);
      if (!exists(target)) {
        files.push({ relative, status: "missing" });
        missing++;
        continue;
      }
      const actual = hashFile(target);
      if (actual !== entry.sha256) {
        files.push({ relative, status: "drift", expected: entry.sha256, actual });
        drift++;
      } else {
        files.push({ relative, status: "ok" });
        ok++;
      }
    }
    result.hosts[host] = {
      root: roots.root,
      rootMismatch,
      manifestRoot: manifestHost?.root || null,
      managed: Object.keys(managed).length,
      ok,
      missing,
      drift,
      files,
    };
  }

  if (flags.json || flags.format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  log(`DocsForge ${VERSION}`);
  log(`Home: ${TOOLKIT}`);
  log(`Manifest: ${result.manifest || "not installed"}`);
  log("");
  for (const [host, info] of Object.entries(result.hosts)) {
    const label = host === "opencode" ? "OpenCode" : "Oh My Pi";
    log(`${c("bold", label)}: ${info.root}`);
    if (info.rootMismatch) {
      log(c("yellow", `  manifest root differs: ${info.manifestRoot}; run install --host ${host} to adopt this root`));
    }
    log(`  managed: ${info.managed}  ok: ${c("green", info.ok)}  missing: ${info.missing}  drift: ${info.drift}`);
    for (const file of info.files.filter((f) => f.status !== "ok")) {
      log(`    ${file.status.toUpperCase()}: ${file.relative}`);
    }
  }
  log("");
  log(`OpenWiki CLI: ${result.openwiki.cli.installed ? c("green", result.openwiki.cli.version || "installed") : c("red", "not found")}`);
  log(`OpenWiki integrations: opencode=${result.openwiki.integrations.opencode}, omp=${result.openwiki.integrations.omp}`);
  log(`MCP: opencode=${result.openwiki.mcp.opencode}, omp=${result.openwiki.mcp.omp}`);
}

function commandPath(name) {
  const probe = process.platform === "win32" ? "where" : "which";
  const out = spawnSync(probe, [name], { encoding: "utf8" });
  if (out.status !== 0) return null;
  return out.stdout.split(/\r?\n/).filter(Boolean)[0] || null;
}

function openwikiStatus() {
  const cliPath = commandPath("openwiki");
  let version = null;
  if (cliPath) {
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    const rootOut = spawnSync(npmCmd, ["root", "-g"], {
      encoding: "utf8",
      timeout: 30000,
      shell: process.platform === "win32",
    });
    if (rootOut.status === 0) {
      const pkgFile = path.join(rootOut.stdout.trim(), "openwiki", "package.json");
      try {
        version = JSON.parse(readText(pkgFile)).version;
      } catch {
        version = null;
      }
    }
    if (!version) {
      const pkg = path.join(path.dirname(cliPath), "..", "lib", "node_modules", "openwiki", "package.json");
      try {
        version = JSON.parse(readText(pkg)).version;
      } catch {
        version = null;
      }
    }
  }
  const integrations = { opencode: false, omp: false };
  if (cliPath) {
    const out = spawnSync("openwiki", ["integrations", "list"], {
      encoding: "utf8",
      env: { ...process.env, CI: "1" },
      timeout: 30000,
      shell: process.platform === "win32",
    });
    if (out.status === 0) {
      for (const line of out.stdout.split(/\r?\n/)) {
        if (/^opencode\s+installed/.test(line)) integrations.opencode = true;
        if (/^omp\s+installed/.test(line)) integrations.omp = true;
      }
    }
  }
  const ocConfig = path.join(getOpenCodeConfigDir(), "opencode.jsonc");
  const ocConfigJson = path.join(getOpenCodeConfigDir(), "opencode.json");
  const ocText = exists(ocConfig) ? readText(ocConfig) : exists(ocConfigJson) ? readText(ocConfigJson) : "";
  const ompMcp = path.join(getOmpAgentDir(), "mcp.json");
  let ompHas = false;
  if (exists(ompMcp)) {
    try {
      ompHas = Boolean(JSON.parse(readText(ompMcp)).mcpServers?.openwiki);
    } catch {
      ompHas = false;
    }
  }
  return {
    cli: { installed: Boolean(cliPath), path: cliPath, version },
    integrations,
    mcp: {
      opencode: /"openwiki"\s*:/.test(ocText),
      omp: ompHas,
    },
  };
}

function verifySkill(dir, host, issues) {
  const file = path.join(dir, "SKILL.md");
  if (!exists(file)) {
    issues.push({ level: "error", message: `Missing SKILL.md: ${file}` });
    return;
  }
  const { data } = readFrontmatter(readText(file));
  if (!data) {
    issues.push({ level: "error", message: `Invalid or missing frontmatter: ${file}` });
    return;
  }
  if (!data.name || typeof data.name !== "string") {
    issues.push({ level: "error", message: `Missing name: ${file}` });
  }
  if (host === "omp") {
    const dirName = path.basename(dir);
    if (data.name !== dirName) {
      issues.push({ level: "error", message: `OMP skill name "${data.name}" does not match directory "${dirName}"` });
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name)) {
      issues.push({ level: "error", message: `OMP skill name "${data.name}" is not lowercase kebab-case` });
    }
  }
  if (!data.description || typeof data.description !== "string") {
    issues.push({ level: "error", message: `Missing description: ${file}` });
  } else if (data.description.length > 1024) {
    issues.push({ level: "error", message: `Description exceeds 1024 chars: ${file}` });
  }
  const allowed = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      issues.push({ level: "warn", message: `Unknown frontmatter field "${key}" in ${file}` });
    }
  }
}

function verify(flags) {
  const hosts = selectedHosts(flags);
  const report = { toolkitVersion: VERSION, hosts: {}, openwiki: openwikiStatus(), issues: [] };
  for (const host of hosts) {
    const roots = hostRoots(flags)[host];
    const hostReport = { root: roots.root, skills: [], agents: [], commands: [], issues: [] };
    const issues = hostReport.issues;

    const canonicalSkills = fs.existsSync(path.join(TOOLKIT, "skills"))
      ? fs.readdirSync(path.join(TOOLKIT, "skills"), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : [];
    for (const id of canonicalSkills) {
      const dir = path.join(roots.skills, id);
      if (!exists(dir)) {
        issues.push({ level: "error", message: `Missing skill: ${dir}` });
        continue;
      }
      verifySkill(dir, host, issues);
      hostReport.skills.push(id);
    }
    for (const id of AGENT_IDS) {
      const file = path.join(roots.agents, `${id}.md`);
      if (!exists(file)) {
        issues.push({ level: "error", message: `Missing agent: ${file}` });
        continue;
      }
      const { data } = readFrontmatter(readText(file));
      if (!data?.description) issues.push({ level: "error", message: `Agent missing description: ${file}` });
      if (host === "omp" && data?.name !== id) {
        issues.push({ level: "error", message: `OMP agent name must be "${id}": ${file}` });
      }
      hostReport.agents.push(id);
    }
    for (const name of COMMAND_NAMES) {
      const file = path.join(roots.commands, `${name}.md`);
      if (!exists(file)) {
        issues.push({ level: "error", message: `Missing command: ${file}` });
        continue;
      }
      const { data, body } = readFrontmatter(readText(file));
      if (!data?.description) issues.push({ level: "error", message: `Command missing description: ${file}` });
      if (!body.trim()) issues.push({ level: "error", message: `Command body is empty: ${file}` });
      hostReport.commands.push(name);
    }
    report.hosts[host] = hostReport;
  }

  const mcpIssues = [];
  if (!report.openwiki.cli.installed) mcpIssues.push({ level: "error", message: "openwiki CLI not found on PATH" });
  if (!report.openwiki.integrations.opencode) mcpIssues.push({ level: "warn", message: "OpenWiki OpenCode integration not installed" });
  if (!report.openwiki.integrations.omp) mcpIssues.push({ level: "warn", message: "OpenWiki OMP integration not installed" });
  if (!report.openwiki.mcp.opencode) mcpIssues.push({ level: "warn", message: "OpenWiki MCP entry missing in OpenCode config" });
  if (!report.openwiki.mcp.omp) mcpIssues.push({ level: "warn", message: "OpenWiki MCP entry missing in OMP mcp.json" });
  report.issues = [
    ...Object.entries(report.hosts).flatMap(([host, info]) =>
      info.issues.map((issue) => ({ host, ...issue })),
    ),
    ...mcpIssues,
  ];

  if (flags.json || flags.format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log(`DocsForge ${VERSION} — verification`);
    for (const [host, info] of Object.entries(report.hosts)) {
      const label = host === "opencode" ? "OpenCode" : "Oh My Pi";
      const errors = info.issues.filter((i) => i.level === "error").length;
      const warns = info.issues.filter((i) => i.level === "warn").length;
      log(`${c("bold", label)}: ${info.root}`);
      log(`  skills: ${info.skills.length}  agents: ${info.agents.length}  commands: ${info.commands.length}`);
      log(`  issues: ${errors} errors, ${warns} warnings`);
      for (const issue of info.issues) {
        log(`    ${issue.level === "error" ? c("red", "ERROR") : c("yellow", "WARN")} ${issue.message}`);
      }
    }
    log("");
    log(`OpenWiki CLI: ${report.openwiki.cli.installed ? "PASS" : "FAIL"}`);
    log(`OpenWiki integrations: opencode=${report.openwiki.integrations.opencode ? "PASS" : "FAIL"}, omp=${report.openwiki.integrations.omp ? "PASS" : "FAIL"}`);
    log(`OpenWiki MCP: opencode=${report.openwiki.mcp.opencode ? "PASS" : "FAIL"}, omp=${report.openwiki.mcp.omp ? "PASS" : "FAIL"}`);
    const errors = report.issues.filter((i) => i.level === "error");
    if (errors.length === 0) {
      log(c("green", "\nAll required checks passed."));
    } else {
      log(c("red", `\n${errors.length} required check(s) failed.`));
    }
  }
  process.exit(report.issues.some((i) => i.level === "error") ? 1 : 0);
}

function findLatestBackup(host, relative, root) {
  const backups = path.join(TOOLKIT, "backups");
  if (!exists(backups)) return null;
  const dirs = fs
    .readdirSync(backups, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  for (const dir of dirs) {
    const metadataFile = path.join(backups, dir, "metadata.json");
    if (!exists(metadataFile)) continue;
    let metadata;
    try {
      metadata = readJson(metadataFile);
    } catch {
      continue;
    }
    if (metadata.roots?.[host] !== root) continue;
    const candidate = path.join(backups, dir, host, relative);
    if (exists(candidate)) return candidate;
  }
  return null;
}

function uninstall(flags) {
  const hosts = selectedHosts(flags);
  const manifest = loadManifest();
  const force = Boolean(flags.force);
  const backupDir = path.join(TOOLKIT, "backups", `${timestamp()}-uninstall`);
  const summary = { removed: 0, restored: 0, skipped: [], errors: [] };

  for (const host of hosts) {
    const roots = hostRoots(flags)[host];
    const manifestHost = manifest.hosts?.[host];
    const managed = manifestHost?.root === roots.root ? manifestHost.files || {} : {};
    if (manifestHost && manifestHost.root !== roots.root) {
      summary.skipped.push({
        host,
        target: roots.root,
        reason: `manifest root is ${manifestHost.root}; refusing to remove files from a different host root`,
      });
    }
    for (const [relative, entry] of Object.entries(managed)) {
      const target = path.join(roots.root, relative);
      if (!exists(target)) continue;
      const actual = hashFile(target);
      if (actual !== entry.sha256 && !force) {
        summary.skipped.push({ host, target, reason: "modified since install" });
        continue;
      }
      const backup = findLatestBackup(host, relative, roots.root);
      if (backup) {
        ensureDir(path.dirname(target));
        fs.copyFileSync(backup, target);
        summary.restored++;
      } else {
        fs.unlinkSync(target);
        summary.removed++;
        removeEmptyDirs(path.dirname(target), roots.root);
      }
    }
    delete manifest.hosts[host];
    if (!exists(backupDir)) ensureDir(backupDir);
    writeJson(path.join(backupDir, `${host}-uninstalled.json`), {
      host,
      root: roots.root,
      removed: summary.removed,
      restored: summary.restored,
      skipped: summary.skipped.filter((s) => s.host === host),
    });
  }

  manifest.version = VERSION;
  manifest.uninstalledAt = new Date().toISOString();
  ensureDir(STATE_DIR);
  writeJson(MANIFEST_FILE, manifest);

  if (flags["remove-openwiki"] && flags.yes) {
    for (const host of hosts) {
      const out = spawnSync("openwiki", ["integrations", "uninstall", host], {
        encoding: "utf8",
        env: { ...process.env, CI: "1" },
        timeout: 60000,
        shell: process.platform === "win32",
      });
      if (out.status !== 0) {
        summary.errors.push(`openwiki integrations uninstall ${host}: ${(out.stderr || out.stdout || "").trim()}`);
      }
    }
    const out = spawnSync("npm", ["uninstall", "-g", "openwiki"], {
      encoding: "utf8",
      timeout: 300000,
      shell: process.platform === "win32",
    });
    if (out.status !== 0) {
      summary.errors.push(`npm uninstall -g openwiki: ${(out.stderr || out.stdout || "").trim()}`);
    }
  } else if (flags["remove-openwiki"]) {
    summary.errors.push("Refusing to remove OpenWiki without --yes.");
  }

  log(`DocsForge ${VERSION} — uninstall`);
  log(`  removed: ${summary.removed}  restored from backup: ${summary.restored}`);
  if (summary.skipped.length > 0) {
    log(c("yellow", `  skipped modified files: ${summary.skipped.length}`));
    for (const item of summary.skipped) log(`    ${item.target} (${item.reason})`);
    log("  Re-run with --force to remove them.");
  }
  for (const error of summary.errors) log(c("red", `  ERROR: ${error}`));

  if (flags.purge) {
    if (!flags.yes) {
      log(c("yellow", "Refusing to purge the toolkit without --yes."));
    } else {
      try {
        fs.rmSync(TOOLKIT, { recursive: true, force: true });
        log("Toolkit directory purged.");
      } catch (error) {
        log(c("red", `Could not purge toolkit directory: ${error.message}`));
      }
    }
  }
}

function licenses() {
  const rows = [
    ["DocsForge", "MIT", "This toolkit", "No paid service"],
    ["OpenWiki", "MIT", "https://github.com/langchain-ai/openwiki", "Telemetry on by default; opt out with OPENWIKI_TELEMETRY_DISABLED=1"],
    ["Playwright", "Apache-2.0", "https://playwright.dev/", "No paid service"],
    ["Fumadocs", "MIT", "https://www.fumadocs.dev/", "Project dependency, not global"],
    ["MkDocs", "BSD-2-Clause", "https://www.mkdocs.org/", "Project dependency"],
    ["Material for MkDocs", "MIT", "https://squidfunk.github.io/mkdocs-material/", "Project dependency"],
    ["Docusaurus", "MIT", "https://docusaurus.io/", "Project dependency"],
    ["Nextra", "MIT", "https://nextra.site/", "Project dependency"],
    ["Astro Starlight", "MIT", "https://starlight.astro.build/", "Project dependency"],
    ["VitePress", "MIT", "https://vitepress.dev/", "Project dependency"],
    ["better-sqlite3 (OpenWiki dependency)", "MIT", "https://github.com/WiseLibs/better-sqlite3", "Native dependency; prebuilt binaries normally used. Windows may need build tools if no prebuild matches."],
  ];
  log(["Component", "License", "Source", "Notes"].join("\t"));
  for (const row of rows) log(row.join("\t"));
  log("\nReview each project's dependency tree before distribution. This table is not legal advice.");
}

function usage() {
  log(`DocsForge ${VERSION}

Usage:
  docs-toolkit.mjs <command> [flags]

Commands:
  install      Install or update managed skills, agents, and commands
  sync         Alias for install (synchronize canonical files)
  status       Show managed files, drift, and OpenWiki integration state
  verify       Validate frontmatter, discovery paths, commands, agents, MCP
  uninstall    Remove managed files and restore backups
  licenses     Print the license and security review
  version      Print the toolkit version

Flags:
  --host <opencode|omp|all>   Target host (default: all)
  --omp-agent-dir <path>      Target a named OMP profile agent dir
  --dry-run                   Show planned actions without writing
  --force                     Replace unmanaged/modified files (backed up first)
  --json                      JSON output for status/verify
  --remove-openwiki           Also remove OpenWiki integrations and CLI
  --purge                     Delete the canonical toolkit after uninstall
  --yes                       Confirm destructive operations

Examples:
  node ~/.documentation-toolkit/scripts/docs-toolkit.mjs install --host all
  node ~/.documentation-toolkit/scripts/docs-toolkit.mjs status --json
  node ~/.documentation-toolkit/scripts/docs-toolkit.mjs verify
  node ~/.documentation-toolkit/scripts/docs-toolkit.mjs uninstall --host omp
`);
}

if (process.argv[1]?.endsWith("docs-toolkit.mjs")) {
  const [command = "status", ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);
  switch (command) {
    case "install":
    case "sync":
      install(flags);
      break;
    case "status":
      status(flags);
      break;
    case "verify":
      verify(flags);
      break;
    case "uninstall":
      uninstall(flags);
      break;
    case "licenses":
    case "license":
      licenses();
      break;
    case "version":
    case "--version":
    case "-v":
      log(VERSION);
      break;
    case "help":
    case "--help":
    case "-h":
      usage();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(2);
  }
}
