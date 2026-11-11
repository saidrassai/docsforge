import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export function expandHome(input) {
  if (!input) return input;
  if (input === "~") return os.homedir();
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

export function resolveRoot(root) {
  return path.resolve(expandHome(root || process.cwd()));
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readText(file, fallback = null) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT" && fallback !== null) return fallback;
    throw err;
  }
}

export function writeText(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

export function writeJson(file, value) {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT" && fallback !== null) return fallback;
    throw err;
  }
}

export function exists(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
}

export function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function hashFile(file) {
  return hashContent(fs.readFileSync(file));
}

export function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function copyDir(src, dest, { filter } = {}) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (filter && !filter(from, entry)) continue;
    if (entry.isDirectory()) {
      copyDir(from, to, { filter });
    } else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(from);
      fs.symlinkSync(target, to);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(to));
      fs.copyFileSync(from, to);
    }
  }
}

export function listFiles(dir, predicate = () => true) {
  const out = [];
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      out.push(full);
    }
  }
  return out.sort();
}

export function isSubpath(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function tryGit(args, cwd) {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

export function gitRoot(cwd) {
  return tryGit(["rev-parse", "--show-toplevel"], cwd);
}

export function backupFile(file, backupDir, label = "") {
  if (!exists(file)) return null;
  const rel = label || path.basename(file);
  const dest = path.join(backupDir, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
  return dest;
}

export function removeEmptyDirs(dir, stopAt) {
  let current = path.resolve(dir);
  const stop = path.resolve(stopAt);
  while (isSubpath(stop, current) && current !== stop) {
    try {
      if (fs.readdirSync(current).length > 0) break;
      fs.rmdirSync(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}

export function parseFlags(argv = process.argv.slice(2)) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      flags._.push(arg);
    }
  }
  return flags;
}

export function getToolkitHome() {
  if (process.env.DOCS_TOOLKIT_HOME) return resolveRoot(process.env.DOCS_TOOLKIT_HOME);
  // When running from a cloned checkout, use the checkout as the toolkit home.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const checkout = path.resolve(here, "..", "..");
  if (exists(path.join(checkout, "VERSION")) && exists(path.join(checkout, "skills"))) {
    return checkout;
  }
  return path.join(os.homedir(), ".documentation-toolkit");
}

export function getOpenCodeConfigDir() {
  if (process.env.OPENCODE_CONFIG_DIR) return resolveRoot(process.env.OPENCODE_CONFIG_DIR);
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "opencode");
  // OpenCode V2 uses ~/.config/opencode on every platform.
  return path.join(os.homedir(), ".config", "opencode");
}

export function getOmpAgentDir(explicit = null) {
  if (explicit) return resolveRoot(explicit);
  if (process.env.PI_CODING_AGENT_DIR) return resolveRoot(process.env.PI_CODING_AGENT_DIR);
  const profile = process.env.OMP_PROFILE;
  if (profile) {
    return path.join(os.homedir(), ".omp", "profiles", profile, "agent");
  }
  return path.join(os.homedir(), ".omp", "agent");
}

export function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

export function countLines(text) {
  return text ? text.split("\n").length : 0;
}
