#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith(".mjs")) files.push(full);
  }
}
walk(path.join(root, "scripts"));

let failed = 0;
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failed++;
    console.error(`FAIL ${path.relative(root, file)}`);
    console.error(result.stderr || result.stdout);
  } else {
    console.log(`PASS ${path.relative(root, file)}`);
  }
}
console.log(`\n${files.length - failed}/${files.length} files passed syntax checks.`);
process.exit(failed > 0 ? 1 : 0);
