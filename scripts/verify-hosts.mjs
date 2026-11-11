#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  exists,
  getOmpAgentDir,
  getOpenCodeConfigDir,
  parseFlags,
  readJson,
  readText,
  resolveRoot,
} from "./lib/fsutil.mjs";

const SKILLS = [
  "docs-orchestrator",
  "codebase-documentation",
  "user-documentation",
  "documentation-screenshots",
  "documentation-audit",
  "documentation-bootstrap",
];
const COMMANDS = ["docs-init", "docs-sync", "docs-audit", "docs-code", "docs-user", "docs-screenshots"];
const AGENTS = ["documentation-architect", "documentation-writer", "documentation-auditor", "screenshot-specialist"];

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: options.timeout || 60000,
    shell: process.platform === "win32",
    ...options,
  });
}

function checkOpenCode() {
  const result = { skills: [], commands: [], agents: [], errors: [], warnings: [] };
  const skillOut = run("opencode", ["api", "get", "/api/skill"], { cwd: process.cwd(), timeout: 60000 });
  if (skillOut.status !== 0) {
    result.errors.push(`opencode api get /api/skill failed: ${(skillOut.stderr || skillOut.stdout || "").trim().slice(0, 300)}`);
  } else {
    try {
      const parsed = JSON.parse(skillOut.stdout);
      const list = Array.isArray(parsed) ? parsed : parsed.data || parsed.skills || [];
      result.skills = list.map((item) => item.id || item.name).filter(Boolean);
    } catch (error) {
      result.errors.push(`Could not parse OpenCode skill response: ${error.message}`);
    }
  }
  const cmdOut = run("opencode", ["api", "get", "/api/command"], { cwd: process.cwd(), timeout: 60000 });
  if (cmdOut.status !== 0) {
    result.errors.push(`opencode api get /api/command failed: ${(cmdOut.stderr || cmdOut.stdout || "").trim().slice(0, 300)}`);
  } else {
    try {
      const parsed = JSON.parse(cmdOut.stdout);
      const list = Array.isArray(parsed) ? parsed : parsed.data || parsed.commands || [];
      result.commands = list.map((item) => item.name).filter(Boolean);
    } catch (error) {
      result.errors.push(`Could not parse OpenCode command response: ${error.message}`);
    }
  }
  const agentOut = run("opencode", ["debug", "agents"], { cwd: process.cwd(), timeout: 60000 });
  if (agentOut.status === 0) {
    try {
      const list = JSON.parse(agentOut.stdout);
      result.agents = list.map((item) => item.id).filter(Boolean);
    } catch {
      result.warnings.push("Could not parse OpenCode agent list.");
    }
  } else {
    result.warnings.push("opencode debug agents did not return JSON.");
  }
  return result;
}

function checkOmp(cwd) {
  const result = { skills: [], commands: [], errors: [], warnings: [] };
  const rpc = run("omp", ["--mode", "rpc", "--no-session", "--no-tools"], {
    cwd,
    timeout: 60000,
    input: '{"id":"docs-toolkit-1","type":"get_available_commands"}\n',
  });
  if (rpc.status !== 0 && !rpc.stdout) {
    result.errors.push(`omp RPC failed: ${(rpc.stderr || "").trim().slice(0, 300)}`);
    return result;
  }
  const commands = new Map();
  for (const line of String(rpc.stdout || "").split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      continue;
    }
    const list =
      frame.type === "available_commands_update"
        ? frame.commands
        : frame.type === "response" && frame.command === "get_available_commands"
          ? frame.data?.commands
          : null;
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item?.name) commands.set(item.name, item);
    }
  }
  if (commands.size === 0) {
    result.errors.push("OMP did not return a slash-command catalog.");
    return result;
  }
  for (const [name, item] of commands) {
    if (name.startsWith("skill:")) result.skills.push(name.slice(6));
    if (name.startsWith("docs-")) result.commands.push({ name, source: item.source, hint: item.input?.hint });
  }
  return result;
}

function checkMcp() {
  const result = { opencode: false, omp: false, integrations: { opencode: false, omp: false }, errors: [] };
  const oc = path.join(getOpenCodeConfigDir(), "opencode.jsonc");
  const ocJson = path.join(getOpenCodeConfigDir(), "opencode.json");
  const text = exists(oc) ? readText(oc) : exists(ocJson) ? readText(ocJson) : "";
  result.opencode = /"openwiki"\s*:/.test(text);
  const ompFile = path.join(getOmpAgentDir(), "mcp.json");
  if (exists(ompFile)) {
    try {
      result.omp = Boolean(JSON.parse(readText(ompFile)).mcpServers?.openwiki);
    } catch (error) {
      result.errors.push(`OMP mcp.json parse error: ${error.message}`);
    }
  }
  const out = run("openwiki", ["integrations", "list"], { timeout: 30000, env: { ...process.env, CI: "1" } });
  if (out.status === 0) {
    for (const line of String(out.stdout).split(/\r?\n/)) {
      if (/^opencode\s+installed/.test(line)) result.integrations.opencode = true;
      if (/^omp\s+installed/.test(line)) result.integrations.omp = true;
    }
  } else {
    result.errors.push("openwiki integrations list failed.");
  }
  return result;
}

function report(flags) {
  const cwd = resolveRoot(flags.root || flags._[0] || process.cwd());
  const opencode = checkOpenCode();
  const omp = checkOmp(cwd);
  const mcp = checkMcp();

  const missing = (expected, actual) => expected.filter((item) => !actual.includes(item));
  const ocMissingSkills = missing(SKILLS, opencode.skills);
  const ocMissingCommands = missing(COMMANDS, opencode.commands);
  const ocMissingAgents = missing(AGENTS, opencode.agents);
  const ompMissingSkills = missing(SKILLS, omp.skills);
  const ompMissingCommands = missing(COMMANDS, omp.commands.map((item) => item.name));

  const result = {
    generatedAt: new Date().toISOString(),
    cwd,
    opencode: {
      skills: opencode.skills,
      commands: opencode.commands,
      agents: opencode.agents,
      missing: { skills: ocMissingSkills, commands: ocMissingCommands, agents: ocMissingAgents },
      errors: opencode.errors,
      warnings: opencode.warnings,
      status:
        opencode.errors.length > 0
          ? "FAIL"
          : ocMissingSkills.length || ocMissingCommands.length || ocMissingAgents.length
            ? "PARTIAL"
            : "PASS",
    },
    omp: {
      skills: omp.skills,
      commands: omp.commands,
      missing: { skills: ompMissingSkills, commands: ompMissingCommands },
      errors: omp.errors,
      warnings: omp.warnings,
      status:
        omp.errors.length > 0
          ? "FAIL"
          : ompMissingSkills.length || ompMissingCommands.length
            ? "PARTIAL"
            : "PASS",
    },
    mcp: {
      ...mcp,
      status: mcp.opencode && mcp.omp && mcp.integrations.opencode && mcp.integrations.omp ? "PASS" : "PARTIAL",
    },
  };

  if (flags.json || flags.format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Live host verification — ${cwd}`);
    console.log(`OpenCode: ${result.opencode.status}`);
    console.log(`  skills:   ${result.opencode.skills.filter((s) => SKILLS.includes(s)).join(", ") || "none"}`);
    console.log(`  commands: ${result.opencode.commands.filter((s) => COMMANDS.includes(s)).join(", ") || "none"}`);
    console.log(`  agents:   ${result.opencode.agents.filter((s) => AGENTS.includes(s)).join(", ") || "none"}`);
    for (const item of ocMissingSkills) console.log(`  MISSING skill: ${item}`);
    for (const item of ocMissingCommands) console.log(`  MISSING command: ${item}`);
    for (const item of ocMissingAgents) console.log(`  MISSING agent: ${item}`);
    for (const item of opencode.errors) console.log(`  ERROR: ${item}`);
    console.log(`Oh My Pi: ${result.omp.status}`);
    console.log(`  skills:   ${result.omp.skills.filter((s) => SKILLS.includes(s)).join(", ") || "none"}`);
    console.log(`  commands: ${result.omp.commands.map((c) => c.name).join(", ") || "none"}`);
    for (const item of ompMissingSkills) console.log(`  MISSING skill: ${item}`);
    for (const item of ompMissingCommands) console.log(`  MISSING command: ${item}`);
    for (const item of omp.errors) console.log(`  ERROR: ${item}`);
    console.log(`OpenWiki MCP: ${result.mcp.status}`);
    console.log(`  OpenCode config: ${result.mcp.opencode ? "present" : "missing"}`);
    console.log(`  OMP config: ${result.mcp.omp ? "present" : "missing"}`);
    console.log(`  Integrations: opencode=${result.mcp.integrations.opencode}, omp=${result.mcp.integrations.omp}`);
    for (const item of result.mcp.errors) console.log(`  ERROR: ${item}`);
  }

  const failed = [result.opencode, result.omp, result.mcp].some((item) => item.status !== "PASS");
  process.exit(failed ? 1 : 0);
}

if (process.argv[1]?.endsWith("verify-hosts.mjs")) {
  try {
    report(parseFlags());
  } catch (error) {
    console.error(`verify-hosts: ${error.message}`);
    process.exit(2);
  }
}
