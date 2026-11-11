#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  exists,
  getToolkitHome,
  gitRoot,
  isoDate,
  listFiles,
  parseFlags,
  readJson,
  readText,
  resolveRoot,
  writeText,
} from "./lib/fsutil.mjs";
import { parseYaml } from "./lib/yaml.mjs";
import { detectProject } from "./detect-stack.mjs";
import { loadProjectConfig } from "./validate-config.mjs";

const DOMAINS = new Set(["full", "engineering", "customer", "user", "screenshots", "code"]);
const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function normalizeDomain(value) {
  if (!value || value === "full") return "full";
  if (value === "user") return "customer";
  if (value === "code") return "engineering";
  return value;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: null, body: content };
  try {
    return { data: parseYaml(match[1]), body: content.slice(match[0].length) };
  } catch {
    return { data: null, body: content.slice(match[0].length), error: true };
  }
}

function walkMarkdown(dir) {
  if (!exists(dir)) return [];
  return listFiles(dir, (file) => /\.(md|mdx)$/i.test(file));
}

function isExternal(target) {
  return /^(https?:|mailto:|tel:|data:|#)/i.test(target);
}

function stripTarget(target) {
  return target.split("#")[0].split("?")[0].trim();
}

function resolveDocLink(fromFile, target, root) {
  const clean = stripTarget(target);
  if (!clean || isExternal(target)) return true;
  const candidates = [];
  if (clean.startsWith("/")) {
    candidates.push(path.join(root, clean.slice(1)));
    candidates.push(path.join(root, "docs", clean.slice(1)));
    candidates.push(path.join(root, "content", clean.slice(1)));
  } else {
    candidates.push(path.resolve(path.dirname(fromFile), clean));
  }
  for (const candidate of candidates) {
    const list = [candidate];
    if (!path.extname(candidate)) {
      list.push(`${candidate}.md`, `${candidate}.mdx`, path.join(candidate, "index.md"), path.join(candidate, "index.mdx"));
    }
    for (const item of list) {
      if (exists(item)) return true;
    }
  }
  return false;
}

function extractLinks(content) {
  const links = [];
  const images = [];
  const imageRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const linkRe = /(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = imageRe.exec(content))) images.push({ alt: match[1], target: match[2] });
  while ((match = linkRe.exec(content))) links.push({ text: match[1], target: match[2] });
  const htmlImg = /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImg.exec(content))) images.push({ alt: "", target: match[1], html: true });
  return { links, images };
}

function daysSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function findDate(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return null;
  if (typeof value === "string" && /\d{4}-\d\d-\d\d/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof value === "number" && value > 1_000_000_000_000) {
    return new Date(value).toISOString();
  }
  if (typeof value === "object") {
    for (const key of ["updatedAt", "lastUpdated", "lastUpdate", "completedAt", "generatedAt", "timestamp", "at", "date"]) {
      if (value[key] !== undefined) {
        const found = findDate(value[key], depth + 1);
        if (found) return found;
      }
    }
    for (const item of Object.values(value)) {
      const found = findDate(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function gitFiles(root) {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

const gitDateCache = new Map();

function lastGitDate(root, file) {
  const key = `${root}|${file}`;
  if (gitDateCache.has(key)) return gitDateCache.get(key);
  let date = null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (out) date = out;
  } catch {
    date = null;
  }
  gitDateCache.set(key, date);
  return date;
}

function routeSourceCandidates(route) {
  const clean = String(route || "/").replace(/\/+$/, "") || "/";
  if (clean === "/") {
    return [
      "app/page.tsx",
      "src/app/page.tsx",
      "pages/index.tsx",
      "src/pages/index.tsx",
    ];
  }
  const rel = clean.replace(/^\//, "");
  return [
    `app/${rel}/page.tsx`,
    `app/${rel}/page.ts`,
    `app/${rel}/page.jsx`,
    `app/${rel}/page.js`,
    `src/app/${rel}/page.tsx`,
    `src/app/${rel}/page.ts`,
    `pages/${rel}.tsx`,
    `pages/${rel}.tsx`,
    `pages/${rel}.jsx`,
    `src/pages/${rel}.tsx`,
    `src/pages/${rel}.tsx`,
    `src/pages/${rel}.jsx`,
    `src/routes/${rel}.tsx`,
    `src/routes/${rel}.jsx`,
    `app/${rel}/route.ts`,
    `app/${rel}/route.tsx`,
  ];
}

function normalizeRel(value) {
  return String(value || "")
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/");
}

function shotKey(value) {
  const rel = normalizeRel(value);
  const marker = "assets/screenshots/";
  const idx = rel.indexOf(marker);
  return idx >= 0 ? rel.slice(idx) : rel;
}

function collectDocs({ root, config, findings, add, checks, domain }) {
  const detect = detectProject(root);
  const userEnabled = config?.user_docs?.enabled === true;
  const userDirRel =
    config?.user_docs?.content_directory && config.user_docs.content_directory !== "auto"
      ? config.user_docs.content_directory
      : detect.recommendations.userDocs.contentDirectory || "docs/user";
  const userDir = path.join(root, userDirRel);
  const userFiles = walkMarkdown(userDir);
  const openwikiDir = path.join(root, config?.codebase?.output || "openwiki");
  const openwikiFiles = walkMarkdown(openwikiDir);

  // AGENTS.md policy
  const agentsFile = path.join(root, "AGENTS.md");
  if (!exists(agentsFile)) {
    add({
      severity: "MEDIUM",
      domain: "engineering",
      location: "AGENTS.md",
      finding: "No AGENTS.md project instructions.",
      evidence: "AGENTS.md not found at the repository root.",
      impact: "Documentation rules are not applied at agent startup or completion.",
      fix: "Run /docs-init to merge the managed documentation policy block.",
    });
  } else {
    const text = readText(agentsFile);
    if (!text.includes("<!-- DOCUMENTATION:START -->") || !text.includes("<!-- DOCUMENTATION:END -->")) {
      add({
        severity: "MEDIUM",
        domain: "engineering",
        location: "AGENTS.md",
        finding: "Documentation policy block is missing or malformed.",
        evidence: "Expected DOCUMENTATION:START/END markers.",
        impact: "Agents may not update documentation as part of delivery.",
        fix: "Run /docs-init or restore the managed block without replacing existing instructions.",
      });
    }
  }

  // OpenWiki
  if (config?.codebase?.enabled !== false) {
    if (!exists(openwikiDir)) {
      add({
        severity: "HIGH",
        domain: "engineering",
        location: normalizeRel(path.relative(root, openwikiDir)) || "openwiki/",
        finding: "No OpenWiki engineering knowledge base.",
        evidence: `Directory not found: ${openwikiDir}`,
        impact: "Architecture, data, API, and operational knowledge is undocumented.",
        fix: "Run /docs-code to initialize OpenWiki, or `openwiki --init` with provider credentials.",
      });
    } else {
      checks.openwiki = "present";
      for (const [rel, severity] of [
        ["INSTRUCTIONS.md", "MEDIUM"],
        ["index.md", "HIGH"],
        ["quickstart.md", "HIGH"],
      ]) {
        if (!exists(path.join(openwikiDir, rel))) {
          add({
            severity,
            domain: "engineering",
            location: normalizeRel(path.join(path.relative(root, openwikiDir), rel)),
            finding: `OpenWiki is missing ${rel}.`,
            evidence: `${rel} not found under ${openwikiDir}.`,
            impact: "Wiki navigation or scope is incomplete.",
            fix: "Complete the OpenWiki initialization/update and verify the generated index.",
          });
        }
      }
      if (exists(path.join(openwikiDir, ".run.json"))) {
        add({
          severity: "MEDIUM",
          domain: "engineering",
          location: normalizeRel(path.join(path.relative(root, openwikiDir), ".run.json")),
          finding: "An interrupted OpenWiki run is recorded.",
          evidence: ".run.json is present.",
          impact: "The wiki may contain a partial page set; future updates resume from the durable queue.",
          fix: "Resume or complete the OpenWiki update, then remove transient run state.",
        });
      }
      const lastFile = path.join(openwikiDir, ".last-update.json");
      if (exists(lastFile)) {
        try {
          const date = findDate(readJson(lastFile));
          const age = daysSince(date);
          if (age !== null && age > 180) {
            add({
              severity: "HIGH",
              domain: "engineering",
              location: normalizeRel(path.relative(root, lastFile)),
              finding: `OpenWiki has not been updated in ${age} days.`,
              evidence: `Last update: ${date}`,
              impact: "Architecture and API documentation may not match current code.",
              fix: "Run /docs-sync or the scheduled OpenWiki update.",
            });
          } else if (age !== null && age > 90) {
            add({
              severity: "MEDIUM",
              domain: "engineering",
              location: normalizeRel(path.relative(root, lastFile)),
              finding: `OpenWiki has not been updated in ${age} days.`,
              evidence: `Last update: ${date}`,
              impact: "Some documentation may be stale.",
              fix: "Run /docs-sync and review stale Claims.",
            });
          }
        } catch {
          add({
            severity: "LOW",
            domain: "engineering",
            location: normalizeRel(path.relative(root, lastFile)),
            finding: "OpenWiki last-update metadata is unreadable.",
            evidence: "JSON parse failed.",
            impact: "Freshness cannot be determined.",
            fix: "Re-run an OpenWiki update.",
          });
        }
      } else {
        add({
          severity: "MEDIUM",
          domain: "engineering",
          location: normalizeRel(path.relative(root, openwikiDir)),
          finding: "OpenWiki has no last-update metadata.",
          evidence: ".last-update.json is missing.",
          impact: "Documentation freshness cannot be verified.",
          fix: "Run a successful OpenWiki update.",
        });
      }

      // Heuristic coverage
      const combined = openwikiFiles.map((file) => readText(file)).join("\n").toLowerCase();
      const names = openwikiFiles.map((file) => path.basename(file).toLowerCase()).join(" ");
      const topics = [
        ["architecture", ["architecture", "system context", "container"]],
        ["database", ["database", "schema", "entity", "migration"]],
        ["api", ["api", "endpoint", "route"]],
        ["authentication/authorization", ["auth", "permission", "role", "tenant"]],
        ["deployment/configuration", ["deploy", "environment", "config"]],
        ["testing", ["test", "fixture", "e2e"]],
        ["operations/runbooks", ["runbook", "incident", "rollback", "backup"]],
        ["security", ["security", "secret", "threat", "validation"]],
      ];
      for (const [topic, keywords] of topics) {
        if (!keywords.some((keyword) => combined.includes(keyword) || names.includes(keyword))) {
          add({
            severity: topic === "operations/runbooks" ? "LOW" : "MEDIUM",
            domain: "engineering",
            location: normalizeRel(path.relative(root, openwikiDir)),
            finding: `No obvious ${topic} coverage in the engineering wiki.`,
            evidence: `Heuristic keyword search over ${openwikiFiles.length} pages found no match.`,
            impact: "An engineering domain may be undocumented.",
            fix: "Verify manually, then add or update the relevant OpenWiki page.",
          });
        }
      }

      // Broken internal links in the wiki
      for (const file of openwikiFiles) {
        const { links } = extractLinks(readText(file));
        for (const link of links) {
          if (!resolveDocLink(file, link.target, root)) {
            add({
              severity: "MEDIUM",
              domain: "engineering",
              location: `${normalizeRel(path.relative(root, file))}: link "${link.text}"`,
              finding: "Broken internal link in the engineering wiki.",
              evidence: `Target not found: ${link.target}`,
              impact: "Navigation is broken.",
              fix: "Correct the link or add the missing page.",
            });
          }
        }
      }
    }
  } else {
    checks.openwiki = "not applicable";
  }

  // Customer docs
  if (userEnabled) {
    if (!exists(userDir)) {
      add({
        severity: "HIGH",
        domain: "customer",
        location: userDirRel,
        finding: "Customer documentation directory is missing.",
        evidence: `Expected directory: ${userDir}`,
        impact: "The Help Center has no content.",
        fix: "Run /docs-user or create the configured content directory.",
      });
    } else if (userFiles.length === 0) {
      add({
        severity: "HIGH",
        domain: "customer",
        location: userDirRel,
        finding: "Customer documentation directory contains no articles.",
        evidence: `No .md/.mdx files under ${userDir}.`,
        impact: "Users have no task guidance.",
        fix: "Run /docs-user for the primary journeys.",
      });
    } else {
      checks.customer = "present";
      const indexContent = userFiles.map((file) => readText(file)).join("\n");
      for (const file of userFiles) {
        const rel = normalizeRel(path.relative(root, file));
        const content = readText(file);
        const { data, body } = parseFrontmatter(content);
        if (path.basename(file).startsWith("_") || rel.includes("/_templates/")) continue;
        if (!data) {
          add({
            severity: "MEDIUM",
            domain: "customer",
            location: rel,
            finding: "Customer article has no frontmatter.",
            evidence: "No YAML frontmatter block.",
            impact: "Title, description, audience, and navigation metadata are missing.",
            fix: "Add title, description, audience, and permissions frontmatter.",
          });
        } else {
          if (!data.title) {
            add({
              severity: "MEDIUM",
              domain: "customer",
              location: rel,
              finding: "Customer article has no title.",
              evidence: "Frontmatter title is missing.",
              impact: "Navigation and search display are degraded.",
              fix: "Add a task-oriented title.",
            });
          }
          if (!data.description) {
            add({
              severity: "LOW",
              domain: "customer",
              location: rel,
              finding: "Customer article has no description.",
              evidence: "Frontmatter description is missing.",
              impact: "Search snippets and previews are weaker.",
              fix: "Add a one-sentence description.",
            });
          }
        }
        if (/\bTODO\b|\bTBD\b|<Product>|<Feature>|<task>/i.test(body)) {
          add({
            severity: "MEDIUM",
            domain: "customer",
            location: rel,
            finding: "Customer article contains template placeholders.",
            evidence: "Found TODO/TBD or angle-bracket placeholders.",
            impact: "The guide is not ready for customers.",
            fix: "Replace placeholders with verified product content or mark the page draft.",
          });
        }
        const { links, images } = extractLinks(content);
        for (const image of images) {
          if (!resolveDocLink(file, image.target, root)) {
            add({
              severity: "HIGH",
              domain: "screenshots",
              location: rel,
              finding: "Referenced screenshot or image is missing.",
              evidence: `Target not found: ${image.target}`,
              impact: "The guide shows a broken image.",
              fix: "Capture the real screenshot or correct the path.",
            });
          }
          if (!image.alt || image.alt.trim().length < 4) {
            add({
              severity: "LOW",
              domain: "customer",
              location: rel,
              finding: "Image has missing or unhelpful alt text.",
              evidence: `Alt text: ${JSON.stringify(image.alt || "")}`,
              impact: "Accessibility and search context are degraded.",
              fix: "Add alt text describing the task context.",
            });
          }
        }
        for (const link of links) {
          if (!resolveDocLink(file, link.target, root)) {
            add({
              severity: "MEDIUM",
              domain: "customer",
              location: rel,
              finding: "Broken internal link in customer documentation.",
              evidence: `Target not found: ${link.target}`,
              impact: "Users hit a dead end.",
              fix: "Correct the link or add the missing page.",
            });
          }
        }
      }

      // Orphan check (heuristic): not index and not linked from any page.
      const linked = new Set();
      for (const file of userFiles) {
        const { links } = extractLinks(readText(file));
        for (const link of links) {
          if (isExternal(link.target)) continue;
          const clean = stripTarget(link.target);
          if (!clean) continue;
          const resolved = path.resolve(path.dirname(file), clean);
          linked.add(resolved);
          linked.add(`${resolved}.md`);
          linked.add(`${resolved}.mdx`);
          linked.add(path.join(resolved, "index.md"));
        }
      }
      for (const file of userFiles) {
        const base = path.basename(file).toLowerCase();
        if (base === "index.md" || base === "readme.md" || file.includes("_templates")) continue;
        if (!linked.has(file)) {
          add({
            severity: "LOW",
            domain: "customer",
            location: normalizeRel(path.relative(root, file)),
            finding: "Article appears unreachable from other documentation pages.",
            evidence: "No inbound internal link found.",
            impact: "Users may not find the article through navigation.",
            fix: "Link it from the index or a related guide, or confirm framework navigation covers it.",
          });
        }
      }

      // Public safety scan
      const secretPatterns = [
        [/-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/, "private key"],
        [/sk-[A-Za-z0-9]{20,}/, "API secret"],
        [/AKIA[0-9A-Z]{16}/, "AWS access key"],
        [/ghp_[A-Za-z0-9]{20,}/, "GitHub token"],
        [/xox[baprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
      ];
      for (const file of userFiles) {
        const rel = normalizeRel(path.relative(root, file));
        const content = readText(file);
        if (/openwiki\//.test(content)) {
          add({
            severity: "CRITICAL",
            domain: "customer",
            location: rel,
            finding: "Public documentation references the internal OpenWiki.",
            evidence: "Found `openwiki/` in customer content.",
            impact: "Internal engineering knowledge may be exposed.",
            fix: "Remove the reference and keep internal docs out of the public build.",
          });
        }
        for (const [pattern, label] of secretPatterns) {
          if (pattern.test(content)) {
            add({
              severity: "CRITICAL",
              domain: "customer",
              location: rel,
              finding: `Possible ${label} in public documentation.`,
              evidence: `Pattern matched: ${pattern}`,
              impact: "Credential or secret exposure.",
              fix: "Remove and rotate the secret; add a pre-publish secret scan.",
            });
          }
        }
        if (/(internal use only|do not publish|confidential)/i.test(content)) {
          add({
            severity: "HIGH",
            domain: "customer",
            location: rel,
            finding: "Public documentation contains an internal-only marker.",
            evidence: "Found internal/confidential wording.",
            impact: "Content may be published in the wrong domain.",
            fix: "Move the content to the internal wiki or remove the marker.",
          });
        }
        if (/(?:localhost|127\.0\.0\.1):\d+/.test(content)) {
          add({
            severity: "LOW",
            domain: "customer",
            location: rel,
            finding: "Public documentation contains a localhost URL.",
            evidence: "Found localhost/127.0.0.1 with a port.",
            impact: "Not useful to customers.",
            fix: "Replace with the production or documented test URL.",
          });
        }
      }
      checks.customerFiles = userFiles.length;
    }
  } else {
    if (detect.product.hasUi) {
      add({
        severity: "MEDIUM",
        domain: "customer",
        location: ".documentation/config.yml",
        finding: "Customer documentation is disabled for a product with a UI.",
        evidence: "user_docs.enabled is false while a customer-facing UI was detected.",
        impact: "Users may have no task guidance.",
        fix: "Confirm this is intentional; otherwise enable user docs and run /docs-user.",
      });
    }
    checks.customer = "not applicable or disabled";
  }

  // Screenshots
  const shotsEnabled = config?.screenshots?.enabled === true;
  if (shotsEnabled) {
    const inventoryRel = config?.screenshots?.inventory || ".documentation/screenshots/inventory.yml";
    const inventoryFile = path.join(root, inventoryRel);
    const shotsDir = path.join(root, config?.screenshots?.content_directory || "docs/assets/screenshots");
    if (!exists(shotsDir)) {
      add({
        severity: "HIGH",
        domain: "screenshots",
        location: normalizeRel(path.relative(root, shotsDir)),
        finding: "Screenshot asset directory is missing.",
        evidence: `Expected directory: ${shotsDir}`,
        impact: "Guides cannot reference real screenshots.",
        fix: "Run /docs-screenshots or create the configured asset directory.",
      });
    }
    if (!exists(inventoryFile)) {
      add({
        severity: "MEDIUM",
        domain: "screenshots",
        location: inventoryRel,
        finding: "Screenshot inventory is missing.",
        evidence: `${inventoryRel} not found.`,
        impact: "Screenshots cannot be mapped to guides, roles, and routes.",
        fix: "Create the inventory and add every documented screenshot.",
      });
    } else {
      let inventory;
      try {
        inventory = parseYaml(readText(inventoryFile));
      } catch (error) {
        add({
          severity: "HIGH",
          domain: "screenshots",
          location: inventoryRel,
          finding: "Screenshot inventory is invalid YAML.",
          evidence: error.message,
          impact: "Inventory checks and targeted regeneration are unavailable.",
          fix: "Fix the YAML syntax.",
        });
      }
      const entries = Array.isArray(inventory?.screenshots) ? inventory.screenshots : [];
      const outputs = new Set();
      for (const entry of entries) {
        const id = entry.id || "(no id)";
        if (!entry.output) {
          add({
            severity: "HIGH",
            domain: "screenshots",
            location: inventoryRel,
            finding: `Inventory entry ${id} has no output path.`,
            evidence: JSON.stringify(entry),
            impact: "The screenshot cannot be verified or regenerated.",
            fix: "Add the output path.",
          });
          continue;
        }
        const output = normalizeRel(entry.output);
        outputs.add(shotKey(output));
        if (!exists(path.join(root, output))) {
          add({
            severity: "HIGH",
            domain: "screenshots",
            location: output,
            finding: `Screenshot file for inventory entry ${id} is missing.`,
            evidence: `File not found: ${output}`,
            impact: "A guide may show a broken image.",
            fix: "Regenerate the screenshot or remove the stale inventory entry.",
          });
        }
        if (entry.guide && !exists(path.join(root, normalizeRel(entry.guide)))) {
          add({
            severity: "MEDIUM",
            domain: "screenshots",
            location: inventoryRel,
            finding: `Inventory entry ${id} references a missing guide.`,
            evidence: `Guide not found: ${entry.guide}`,
            impact: "The screenshot is orphaned.",
            fix: "Correct the guide path or remove the entry.",
          });
        }
        if (entry.spec && !exists(path.join(root, normalizeRel(entry.spec)))) {
          add({
            severity: "HIGH",
            domain: "screenshots",
            location: inventoryRel,
            finding: `Inventory entry ${id} references a missing spec.`,
            evidence: `Spec not found: ${entry.spec}`,
            impact: "The screenshot cannot be reproduced.",
            fix: "Add the spec or remove the entry.",
          });
        }
        if (entry.status === "stale") {
          add({
            severity: "MEDIUM",
            domain: "screenshots",
            location: output,
            finding: `Screenshot ${id} is marked stale.`,
            evidence: "Inventory status: stale",
            impact: "The guide may show an outdated UI.",
            fix: "Regenerate the screenshot and update the inventory.",
          });
        }
        if (entry.route && entry.captured) {
          let latest = null;
          for (const candidate of routeSourceCandidates(entry.route)) {
            const date = lastGitDate(root, candidate);
            if (date && (!latest || date > latest)) latest = date;
          }
          if (latest && String(entry.captured).slice(0, 10) < latest) {
            add({
              severity: "MEDIUM",
              domain: "screenshots",
              location: output,
              finding: `Screenshot ${id} may predate a UI change.`,
              evidence: `Captured: ${entry.captured}; route source last changed: ${latest}`,
              impact: "The image may not match the current interface.",
              fix: "Verify against the running UI and regenerate if needed.",
            });
          }
        }
      }
      const referenced = new Set();
      for (const file of userFiles) {
        const { images } = extractLinks(readText(file));
        for (const image of images) {
          if (isExternal(image.target)) continue;
          const rel = normalizeRel(image.target);
          if (rel.includes("assets/screenshots")) referenced.add(shotKey(rel));
        }
      }
      for (const ref of referenced) {
        if (!outputs.has(ref)) {
          add({
            severity: "MEDIUM",
            domain: "screenshots",
            location: ref,
            finding: "Screenshot is referenced by a guide but absent from the inventory.",
            evidence: `No inventory entry for ${ref}.`,
            impact: "Targeted regeneration and freshness checks miss this image.",
            fix: "Add an inventory entry with guide, route, role, and spec.",
          });
        }
      }
      checks.screenshots = entries.length;
    }
    const pwConfig = path.join(root, config?.screenshots?.config || "playwright.docs.config.ts");
    if (!exists(pwConfig)) {
      add({
        severity: "MEDIUM",
        domain: "screenshots",
        location: normalizeRel(path.relative(root, pwConfig)),
        finding: "Docs-only Playwright config is missing.",
        evidence: `File not found: ${pwConfig}`,
        impact: "Screenshot capture is not reproducible.",
        fix: "Run /docs-init or create the docs-only Playwright config.",
      });
    }
  } else {
    checks.screenshots = "not applicable or disabled";
  }

  // CI automation
  if (config?.automation?.daily_ci_sync === true) {
    const provider = config?.automation?.ci_provider || detect.automation.ci;
    if (provider === "github") {
      const syncFile = path.join(root, ".github", "workflows", "docs-sync.yml");
      const checkFile = path.join(root, ".github", "workflows", "docs-check.yml");
      if (!exists(syncFile)) {
        add({
          severity: "MEDIUM",
          domain: "engineering",
          location: ".github/workflows/docs-sync.yml",
          finding: "Scheduled documentation sync is enabled but no workflow exists.",
          evidence: "docs-sync.yml not found.",
          impact: "Documentation freshness depends on manual runs.",
          fix: "Add the pinned docs-sync workflow and configure provider secrets.",
        });
      } else {
        const content = readText(syncFile);
        if (/automatic_merge\s*:\s*true/.test(content) || /--auto\s+merge/i.test(content)) {
          add({
            severity: "HIGH",
            domain: "engineering",
            location: ".github/workflows/docs-sync.yml",
            finding: "Documentation workflow appears to auto-merge.",
            evidence: "Auto-merge setting found.",
            impact: "Unreviewed documentation changes may merge automatically.",
            fix: "Disable auto-merge; require review.",
          });
        }
        if (!/add-paths:/m.test(content)) {
          add({
            severity: "HIGH",
            domain: "engineering",
            location: ".github/workflows/docs-sync.yml",
            finding: "Documentation workflow does not restrict changed paths.",
            evidence: "No add-paths restriction found.",
            impact: "The scheduled job could modify application source.",
            fix: "Restrict changes to openwiki/, docs/, .documentation/, and the managed AGENTS.md block.",
          });
        }
      }
      if (!exists(checkFile)) {
        add({
          severity: "LOW",
          domain: "engineering",
          location: ".github/workflows/docs-check.yml",
          finding: "No documentation check workflow.",
          evidence: "docs-check.yml not found.",
          impact: "Documentation regressions are caught later.",
          fix: "Add the documentation validation workflow.",
        });
      }
    } else if (provider === "gitlab") {
      if (!exists(path.join(root, ".documentation", "ci", "openwiki-update.gitlab-ci.yml"))) {
        add({
          severity: "MEDIUM",
          domain: "engineering",
          location: ".documentation/ci/openwiki-update.gitlab-ci.yml",
          finding: "Scheduled GitLab documentation sync is enabled but the include is missing.",
          evidence: "Staged GitLab job not found.",
          impact: "Documentation freshness depends on manual runs.",
          fix: "Add the documented GitLab include and required CI variables.",
        });
      }
    } else {
      add({
        severity: "MEDIUM",
        domain: "engineering",
        location: ".documentation/config.yml",
        finding: "Daily CI sync is enabled without a recognized CI host.",
        evidence: `ci_provider=${provider}`,
        impact: "No scheduled automation will run.",
        fix: "Set ci_provider to github/gitlab and add the workflow, or disable daily_ci_sync.",
      });
    }
  } else {
    checks.ci = "disabled";
  }

  // Security
  if (!exists(path.join(root, ".openwikiignore"))) {
    add({
      severity: "MEDIUM",
      domain: "engineering",
      location: ".openwikiignore",
      finding: "No OpenWiki read boundary.",
      evidence: ".openwikiignore is missing.",
      impact: "Secrets, generated files, or private data may be read into generated docs.",
      fix: "Add .openwikiignore with secrets, build output, and private data paths.",
    });
  }
  const tracked = gitFiles(root);
  for (const file of tracked) {
    if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example")) {
      add({
        severity: "CRITICAL",
        domain: "engineering",
        location: file,
        finding: "Environment file is tracked by Git.",
        evidence: `git ls-files includes ${file}`,
        impact: "Secrets may be committed or published.",
        fix: "Remove from Git, rotate secrets, and add to .gitignore.",
      });
    }
  }

  return { detect, userDir, userFiles, openwikiDir, openwikiFiles };
}

export function auditProject(rootInput, { domain = "full" } = {}) {
  const root = resolveRoot(rootInput);
  const scope = normalizeDomain(domain);
  const findings = [];
  const seen = new Set();
  const checks = {};
  const add = (finding) => {
    if (scope !== "full" && finding.domain !== scope) return;
    const key = `${finding.severity}|${finding.domain}|${finding.location}|${finding.finding}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ id: `DOC-${String(findings.length + 1).padStart(3, "0")}`, ...finding });
  };

  const rootGit = gitRoot(root);
  if (!rootGit) {
    add({
      severity: "CRITICAL",
      domain: "engineering",
      location: root,
      finding: "Target is not a Git repository.",
      evidence: "git rev-parse --show-toplevel failed.",
      impact: "Documentation cannot be scoped safely to one project.",
      fix: "Initialize Git or run the audit inside the repository root.",
    });
    return summarize(root, scope, findings, checks);
  }

  const loaded = loadProjectConfig(root, { required: false });
  if (!loaded.exists) {
    add({
      severity: "HIGH",
      domain: "engineering",
      location: ".documentation/config.yml",
      finding: "Project documentation configuration is missing.",
      evidence: "No .documentation/config.yml.",
      impact: "Documentation domains, paths, and automation are undefined.",
      fix: "Run /docs-init.",
    });
  } else if (!loaded.validation?.valid) {
    add({
      severity: "HIGH",
      domain: "engineering",
      location: ".documentation/config.yml",
      finding: "Project documentation configuration is invalid.",
      evidence: loaded.validation.errors.join("; "),
      impact: "Scripts and agents may use the wrong paths or domains.",
      fix: "Fix the validation errors; run validate-config.mjs.",
    });
  }
  const config = loaded.config;

  if (config?.security?.internal_docs_public === true) {
    add({
      severity: "CRITICAL",
      domain: "customer",
      location: ".documentation/config.yml",
      finding: "Configuration allows internal documentation to be public.",
      evidence: "security.internal_docs_public: true",
      impact: "Engineering knowledge may be published.",
      fix: "Set internal_docs_public: false and separate public/internal builds.",
    });
  }
  if (config?.security?.production_data_in_screenshots === true) {
    add({
      severity: "CRITICAL",
      domain: "screenshots",
      location: ".documentation/config.yml",
      finding: "Configuration allows production data in screenshots.",
      evidence: "security.production_data_in_screenshots: true",
      impact: "Customer data may be exposed.",
      fix: "Set production_data_in_screenshots: false and use synthetic demo data.",
    });
  }
  if (config?.automation?.automatic_merge === true) {
    add({
      severity: "HIGH",
      domain: "engineering",
      location: ".documentation/config.yml",
      finding: "Automatic merge is enabled for documentation.",
      evidence: "automation.automatic_merge: true",
      impact: "Unreviewed generated docs may merge.",
      fix: "Set automatic_merge: false and require review.",
    });
  }

  const collected = collectDocs({ root, config, findings, add, checks, domain: scope });

  const summary = summarize(root, scope, findings, checks, collected?.detect);
  return summary;
}

function summarize(root, scope, findings, checks, detect = null) {
  const sorted = findings.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.location.localeCompare(b.location),
  );
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const finding of sorted) counts[finding.severity] = (counts[finding.severity] || 0) + 1;

  const domainStatus = (domain) => {
    if (scope !== "full" && scope !== domain) return "N/A";
    const disabled =
      (domain === "engineering" && checks.openwiki === "not applicable") ||
      (domain === "customer" && String(checks.customer || "").includes("not applicable")) ||
      (domain === "screenshots" && String(checks.screenshots || "").includes("not applicable"));
    if (disabled) return "N/A";
    const items = sorted.filter((f) => f.domain === domain);
    if (items.some((f) => f.severity === "CRITICAL" || f.severity === "HIGH")) return "PARTIAL";
    if (items.some((f) => f.severity === "MEDIUM")) return "PARTIAL";
    return "PASS";
  };

  return {
    generatedAt: new Date().toISOString(),
    root,
    scope,
    toolkitHome: getToolkitHome(),
    project: detect
      ? { name: detect.project.name, type: detect.product.type, hasUi: detect.product.hasUi }
      : null,
    summary: {
      counts,
      total: sorted.length,
      engineering: domainStatus("engineering"),
      customer: domainStatus("customer"),
      screenshots: domainStatus("screenshots"),
      blocked: [],
    },
    checks,
    findings: sorted,
  };
}

function toMarkdown(report) {
  const lines = [
    `# Documentation audit — ${report.project?.name || path.basename(report.root)}`,
    "",
    `- **Generated:** ${report.generatedAt}`,
    `- **Repository:** \`${report.root}\``,
    `- **Scope:** ${report.scope}`,
    `- **Findings:** ${report.summary.total} (Critical ${report.summary.counts.CRITICAL}, High ${report.summary.counts.HIGH}, Medium ${report.summary.counts.MEDIUM}, Low ${report.summary.counts.LOW})`,
    "",
    "## Status",
    "",
    `- Engineering: **${report.summary.engineering}**`,
    `- Customer: **${report.summary.customer}**`,
    `- Screenshots: **${report.summary.screenshots}**`,
    "",
  ];
  if (report.findings.length === 0) {
    lines.push("No findings. This is not proof of accuracy; verify runtime labels and primary journeys manually.");
  } else {
    lines.push("## Findings", "");
    for (const finding of report.findings) {
      lines.push(`### ${finding.id} — ${finding.severity} — ${finding.domain}`);
      lines.push("");
      lines.push(`- **Location:** \`${finding.location}\``);
      lines.push(`- **Finding:** ${finding.finding}`);
      lines.push(`- **Evidence:** ${finding.evidence}`);
      lines.push(`- **Impact:** ${finding.impact}`);
      lines.push(`- **Fix:** ${finding.fix}`);
      lines.push("");
    }
  }
  lines.push(
    "## Limits",
    "",
    "This report is deterministic static analysis. It cannot verify runtime labels, permissions, or whether a screenshot matches the deployed UI. Verify CRITICAL and HIGH findings manually before remediation.",
    "",
  );
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("audit-project.mjs")) {
  const flags = parseFlags();
  const root = flags.root || flags._[0] || process.cwd();
  const domain = flags.domain || flags.scope || "full";
  if (!DOMAINS.has(String(domain))) {
    console.error(`Invalid --domain. Use ${[...DOMAINS].join(", ")}.`);
    process.exit(2);
  }
  try {
    const report = auditProject(root, { domain });
    const outDir = path.join(resolveRoot(root), ".documentation", "audit");
    if (!flags["no-write"]) {
      writeText(path.join(outDir, `${isoDate()}-${normalizeDomain(domain)}.md`), toMarkdown(report));
      writeText(path.join(outDir, `${isoDate()}-${normalizeDomain(domain)}.json`), `${JSON.stringify(report, null, 2)}\n`);
    }
    if (flags.json || flags.format === "json") {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(toMarkdown(report));
    }
    const blocking = report.findings.some((f) => f.severity === "CRITICAL" || f.severity === "HIGH");
    process.exit(flags.json ? 0 : blocking ? 1 : 0);
  } catch (error) {
    console.error(`audit-project: ${error.message}`);
    if (process.env.DEBUG) console.error(error.stack);
    process.exit(2);
  }
}
