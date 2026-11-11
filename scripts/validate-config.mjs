#!/usr/bin/env node
import path from "node:path";
import {
  exists,
  getToolkitHome,
  gitRoot,
  isSubpath,
  parseFlags,
  readText,
  resolveRoot,
} from "./lib/fsutil.mjs";
import { parseYaml } from "./lib/yaml.mjs";

const KNOWN_TOP = new Set([
  "$schema",
  "version",
  "project",
  "codebase",
  "user_docs",
  "screenshots",
  "automation",
  "security",
]);

const KNOWN_KEYS = {
  project: new Set(["name", "type", "description"]),
  codebase: new Set(["enabled", "engine", "output", "instructions", "ignore_file"]),
  user_docs: new Set([
    "enabled",
    "framework",
    "audience",
    "content_directory",
    "base_path",
    "public_url",
  ]),
  screenshots: new Set([
    "enabled",
    "engine",
    "source",
    "demo_data",
    "config",
    "content_directory",
    "inventory",
    "base_url",
  ]),
  automation: new Set([
    "agent_completion_sync",
    "daily_ci_sync",
    "automatic_merge",
    "ci_provider",
    "docs_only_paths",
  ]),
  security: new Set([
    "internal_docs_public",
    "production_data_in_screenshots",
    "secrets_in_docs",
  ]),
};

function typeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function checkPath(root, value, label, errors) {
  if (typeof value !== "string" || value.length === 0) return;
  if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value)) {
    errors.push(`${label} must be repository-relative, got absolute path "${value}"`);
    return;
  }
  const resolved = path.resolve(root, value);
  if (!isSubpath(root, resolved)) {
    errors.push(`${label} escapes the repository: "${value}"`);
  }
}

export function validateConfig(config, { root = process.cwd() } = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { valid: false, errors: ["Config must be a mapping"], warnings };
  }
  if (config.version !== 1) {
    errors.push(`version must be 1, got ${JSON.stringify(config.version)}`);
  }
  for (const key of Object.keys(config)) {
    if (!KNOWN_TOP.has(key)) warnings.push(`Unknown top-level key "${key}"`);
  }
  for (const [section, allowed] of Object.entries(KNOWN_KEYS)) {
    if (config[section] === undefined || config[section] === null) continue;
    if (typeof config[section] !== "object" || Array.isArray(config[section])) {
      errors.push(`${section} must be a mapping`);
      continue;
    }
    for (const key of Object.keys(config[section])) {
      if (!allowed.has(key)) warnings.push(`Unknown key "${section}.${key}"`);
    }
  }

  const project = config.project;
  if (project !== undefined) {
    if (typeof project !== "object" || Array.isArray(project)) errors.push("project must be a mapping");
    else {
      if (project.name !== undefined && (typeof project.name !== "string" || !project.name.trim())) {
        errors.push("project.name must be a non-empty string");
      }
      if (project.type !== undefined && typeof project.type !== "string") {
        errors.push("project.type must be a string");
      }
    }
  }

  const codebase = config.codebase;
  if (codebase !== undefined) {
    if (typeof codebase !== "object" || Array.isArray(codebase)) errors.push("codebase must be a mapping");
    else {
      if (codebase.enabled !== undefined && typeof codebase.enabled !== "boolean") {
        errors.push("codebase.enabled must be boolean");
      }
      if (codebase.engine !== undefined && codebase.engine !== "openwiki") {
        errors.push('codebase.engine only supports "openwiki"');
      }
      if (codebase.output !== undefined) {
        if (typeof codebase.output !== "string" || !codebase.output.trim()) {
          errors.push("codebase.output must be a non-empty string");
        } else {
          checkPath(root, codebase.output, "codebase.output", errors);
        }
      }
      if (codebase.instructions !== undefined) checkPath(root, codebase.instructions, "codebase.instructions", errors);
      if (codebase.ignore_file !== undefined) checkPath(root, codebase.ignore_file, "codebase.ignore_file", errors);
    }
  }

  const user = config.user_docs;
  if (user !== undefined) {
    if (typeof user !== "object" || Array.isArray(user)) errors.push("user_docs must be a mapping");
    else {
      if (
        user.enabled !== undefined &&
        ![true, false, "auto"].includes(user.enabled)
      ) {
        errors.push('user_docs.enabled must be true, false, or "auto"');
      }
      if (user.framework !== undefined && typeof user.framework !== "string") {
        errors.push("user_docs.framework must be a string");
      }
      if (user.audience !== undefined) {
        const ok =
          typeof user.audience === "string" ||
          (Array.isArray(user.audience) && user.audience.every((v) => typeof v === "string"));
        if (!ok) errors.push("user_docs.audience must be a string or array of strings");
      }
      if (user.content_directory !== undefined) {
        if (typeof user.content_directory !== "string" || !user.content_directory.trim()) {
          errors.push("user_docs.content_directory must be a non-empty string");
        } else {
          checkPath(root, user.content_directory, "user_docs.content_directory", errors);
        }
      }
      if (user.public_url !== undefined && typeof user.public_url !== "string") {
        errors.push("user_docs.public_url must be a string");
      }
    }
  }

  const shots = config.screenshots;
  if (shots !== undefined) {
    if (typeof shots !== "object" || Array.isArray(shots)) errors.push("screenshots must be a mapping");
    else {
      if (shots.enabled !== undefined && ![true, false, "auto"].includes(shots.enabled)) {
        errors.push('screenshots.enabled must be true, false, or "auto"');
      }
      if (shots.engine !== undefined && shots.engine !== "playwright") {
        errors.push('screenshots.engine only supports "playwright"');
      }
      if (shots.source !== undefined && shots.source !== "application") {
        errors.push('screenshots.source only supports "application"');
      }
      if (shots.demo_data !== undefined && shots.demo_data !== "synthetic") {
        errors.push('screenshots.demo_data only supports "synthetic"');
      }
      for (const key of ["config", "content_directory", "inventory"]) {
        if (shots[key] !== undefined) checkPath(root, shots[key], `screenshots.${key}`, errors);
      }
    }
  }

  const automation = config.automation;
  if (automation !== undefined) {
    if (typeof automation !== "object" || Array.isArray(automation)) {
      errors.push("automation must be a mapping");
    } else {
      for (const key of ["agent_completion_sync", "daily_ci_sync", "automatic_merge"]) {
        if (automation[key] !== undefined && typeof automation[key] !== "boolean") {
          errors.push(`automation.${key} must be boolean`);
        }
      }
      if (automation.ci_provider !== undefined) {
        const allowed = ["auto", "github", "gitlab", "bitbucket", "none"];
        if (!allowed.includes(automation.ci_provider)) {
          errors.push(`automation.ci_provider must be one of ${allowed.join(", ")}`);
        }
      }
      if (automation.docs_only_paths !== undefined) {
        if (
          !Array.isArray(automation.docs_only_paths) ||
          !automation.docs_only_paths.every((v) => typeof v === "string")
        ) {
          errors.push("automation.docs_only_paths must be an array of strings");
        }
      }
      if (automation.automatic_merge === true) {
        warnings.push("automation.automatic_merge is true; the toolkit default is false and CI never auto-merges on setup");
      }
    }
  }

  const security = config.security;
  if (security !== undefined) {
    if (typeof security !== "object" || Array.isArray(security)) errors.push("security must be a mapping");
    else {
      for (const key of ["internal_docs_public", "production_data_in_screenshots", "secrets_in_docs"]) {
        if (security[key] !== undefined && typeof security[key] !== "boolean") {
          errors.push(`security.${key} must be boolean`);
        }
      }
      if (security.internal_docs_public === true) {
        warnings.push("security.internal_docs_public is true; internal documentation must not be published");
      }
      if (security.production_data_in_screenshots === true) {
        warnings.push("security.production_data_in_screenshots is true; screenshots must use synthetic data");
      }
      if (security.secrets_in_docs === true) {
        warnings.push("security.secrets_in_docs is true; secrets must never appear in documentation");
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function loadProjectConfig(rootInput, { required = false } = {}) {
  const root = resolveRoot(rootInput);
  const file = path.join(root, ".documentation", "config.yml");
  if (!exists(file)) {
    if (required) throw new Error(`Missing ${path.relative(root, file)}`);
    return { file, exists: false, config: null, validation: null };
  }
  let config;
  try {
    config = parseYaml(readText(file));
  } catch (error) {
    return {
      file,
      exists: true,
      config: null,
      validation: { valid: false, errors: [`YAML parse error: ${error.message}`], warnings: [] },
    };
  }
  return { file, exists: true, config, validation: validateConfig(config, { root }) };
}

if (process.argv[1]?.endsWith("validate-config.mjs")) {
  const flags = parseFlags();
  const root = flags.root || flags._[0] || process.cwd();
  try {
    const result = loadProjectConfig(root, { required: false });
    if (!result.exists) {
      console.error(`No .documentation/config.yml found under ${root}`);
      process.exit(2);
    }
    const output = {
      file: path.relative(root, result.file) || ".documentation/config.yml",
      toolkitHome: getToolkitHome(),
      gitRoot: gitRoot(root),
      ...result.validation,
    };
    if (flags.json || flags.format === "json") {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`${output.file}: ${output.valid ? "VALID" : "INVALID"}`);
      for (const error of output.errors) console.log(`  ERROR: ${error}`);
      for (const warning of output.warnings) console.log(`  WARN:  ${warning}`);
    }
    process.exit(output.valid ? 0 : 1);
  } catch (error) {
    console.error(`validate-config: ${error.message}`);
    process.exit(2);
  }
}
