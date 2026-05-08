#!/usr/bin/env node
// Usage: node scripts/install-compound-system.mjs --target <repo> [--overwrite] [--dry-run] [--uninstall] [--rollback <manifest>]
// Copies the bundled Compound Agent System files into a target repository.

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync, renameSync, unlinkSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { appendEvent } from "../assets/system-files/.agents/event-log.mjs";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(pluginRoot, "assets", "system-files");
const HIGH_IMPACT_ROOT_WRITES = new Set(["CLAUDE.md", "package.json", "AGENT_ONBOARDING.md", "HANDOFF.md", "FUTURE_WORK.md", "package-lock.json"]);
const OWNERSHIP_MARKER = "compound-agent-system";

function parseArgs(argv) {
  const args = { target: process.cwd(), overwrite: false, dryRun: false, uninstall: false, rollback: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") args.target = argv[++i];
    else if (a === "--overwrite") args.overwrite = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--uninstall") args.uninstall = true;
    else if (a === "--rollback") args.rollback = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function sameFile(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  const as = statSync(a);
  const bs = statSync(b);
  if (as.size !== bs.size) return false;
  return readFileSync(a).equals(readFileSync(b));
}

function classifyFile(rel, src, dest, args) {
  const rootLevel = !rel.includes("/") && !rel.includes("\\");
  const highImpact = rootLevel && HIGH_IMPACT_ROOT_WRITES.has(rel);
  const exists = existsSync(dest);
  const same = exists && sameFile(src, dest);
  const entry = { path: rel, source: src, target: dest, root_level: rootLevel, high_impact: highImpact };
  if (!exists) return { bucket: "files_to_create", entry };
  if (same) return { bucket: "files_to_skip", entry: { ...entry, reason: "identical" } };
  if (args.overwrite) return { bucket: "files_to_modify", overwrite: { ...entry, reason: "target differs and --overwrite was set" }, entry };
  return { bucket: "files_to_skip", overwrite: { ...entry, reason: "target differs and --overwrite was not set" }, entry: { ...entry, reason: "exists" } };
}

function manifestPath(targetRoot) {
  return join(targetRoot, ".agents", "install-manifests", `compound-install-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
}

function installedManifestPath(targetRoot) {
  return join(targetRoot, ".agents", "install-manifest.json");
}

function fileSnapshot(path) {
  if (!existsSync(path)) return { existed: false };
  return { existed: true, content: readFileSync(path, "utf-8") };
}

function installManifest(targetRoot, plan) {
  return {
    schema: "compound-install-manifest.v1",
    owner: OWNERSHIP_MARKER,
    created_at: new Date().toISOString(),
    target: targetRoot,
    files: [...plan.files_to_create, ...plan.files_to_modify].map((entry) => ({
      path: entry.path,
      target: entry.target,
      action: plan.files_to_create.some((item) => item.path === entry.path) ? "create" : "modify",
      before: fileSnapshot(entry.target),
    })),
  };
}

function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, path);
}

function writeInstallEvent(targetRoot, plan, result) {
  if (plan.dry_run) return;
  try {
    appendEvent({
      logPath: join(targetRoot, ".agents", "events.jsonl"),
      event: "install",
      command: "install-compound-system.mjs",
      result,
      context: {
        dry_run: plan.dry_run,
        overwrite: plan.overwrite,
        create_count: plan.files_to_create.length,
        modify_count: plan.files_to_modify.length,
        skip_count: plan.files_to_skip.length,
        warning_count: plan.warnings.length,
        refusal_count: (plan.refusals || []).length,
      },
    });
  } catch {
    // Observability must never block install recovery paths.
  }
}

function isInsideTarget(targetRoot, candidate) {
  const rel = relative(targetRoot, candidate);
  return rel === "" || (rel && !rel.startsWith("..") && !isAbsolute(rel));
}

export function buildInstallPlan(args) {
  const targetRoot = resolve(args.target);
  const files = walk(sourceRoot);
  const plan = {
    version: 1,
    target: targetRoot,
    dry_run: Boolean(args.dryRun),
    overwrite: Boolean(args.overwrite),
    files_to_create: [],
    files_to_modify: [],
    files_to_skip: [],
    files_to_remove: [],
    overwrites: [],
    root_level_writes: [],
    hook_mutations: [
      { event: "SessionStart", command: "node .agents/task.mjs hook session-start" },
      { event: "PreToolUse", command: "node .agents/task.mjs hook pre-edit" },
      { event: "Stop", command: "node .agents/task.mjs hook stop" },
    ],
    ledger_init: existsSync(join(targetRoot, ".agents", "TASKS.json")) ? "preserve existing ledger" : "initialize .agents/TASKS.json during activation",
    activation_behavior: "run node .agents/activate.mjs after apply unless bootstrap used --no-activate",
    warnings: [],
    apply_command: `node ${relative(targetRoot, fileURLToPath(import.meta.url)).replaceAll("\\", "/")} --target ${JSON.stringify(targetRoot)}${args.overwrite ? " --overwrite" : ""}`,
    uninstall_command: `node ${relative(targetRoot, fileURLToPath(import.meta.url)).replaceAll("\\", "/")} --target ${JSON.stringify(targetRoot)} --uninstall`,
  };

  for (const src of files) {
    const rel = relative(sourceRoot, src).replaceAll("\\", "/");
    const dest = join(targetRoot, rel);
    const classified = classifyFile(rel, src, dest, args);
    plan[classified.bucket].push(classified.entry);
    if (classified.overwrite) plan.overwrites.push(classified.overwrite);
    if (classified.entry.root_level) plan.root_level_writes.push(classified.entry);
    if (classified.entry.high_impact) plan.warnings.push({ type: "high_impact_root_write", path: rel, message: `${rel} is a root-level contract file.` });
  }
  return plan;
}

function lastManifest(targetRoot) {
  const path = installedManifestPath(targetRoot);
  if (!existsSync(path)) return null;
  const data = JSON.parse(readFileSync(path, "utf-8"));
  if (data.owner !== OWNERSHIP_MARKER || !Array.isArray(data.files)) throw new Error("Install manifest is not owned by compound-agent-system.");
  return data;
}

function buildUninstallPlan(args) {
  const targetRoot = resolve(args.target);
  const manifest = lastManifest(targetRoot);
  if (!manifest) {
    return { version: 1, target: targetRoot, dry_run: Boolean(args.dryRun), uninstall: true, files_to_remove: [], files_to_restore: [], refusals: [{ path: installedManifestPath(targetRoot), reason: "missing install manifest" }] };
  }
  const plan = { version: 1, target: targetRoot, dry_run: Boolean(args.dryRun), uninstall: true, files_to_remove: [], files_to_restore: [], refusals: [] };
  for (const file of manifest.files) {
    if (file.path === ".agents/events.jsonl") continue;
    const target = resolve(targetRoot, file.path);
    if (!isInsideTarget(targetRoot, target)) {
      plan.refusals.push({ path: file.path, reason: "target escapes repo" });
      continue;
    }
    if (!existsSync(target)) continue;
    const src = join(sourceRoot, file.path);
    if (file.action === "create") {
      if (existsSync(src) && sameFile(src, target)) plan.files_to_remove.push({ path: file.path, target });
      else plan.refusals.push({ path: file.path, reason: "owned file changed since install" });
    } else if (file.action === "modify" && file.before?.existed) {
      plan.files_to_restore.push({ path: file.path, target });
    }
  }
  return plan;
}

function applyRollback(targetRoot, manifestFile) {
  const manifest = JSON.parse(readFileSync(resolve(manifestFile), "utf-8"));
  if (manifest.owner !== OWNERSHIP_MARKER || !Array.isArray(manifest.files)) throw new Error("Rollback manifest is not owned by compound-agent-system.");
  for (const file of manifest.files.toReversed()) {
    const target = resolve(targetRoot, file.path);
    if (!isInsideTarget(targetRoot, target)) throw new Error(`Refusing rollback outside target: ${file.path}`);
    if (file.before?.existed) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.before.content);
    } else if (existsSync(target)) {
      unlinkSync(target);
    }
  }
  console.log(`Rollback applied from ${manifestFile}`);
}

function applyUninstall(targetRoot, plan) {
  if (plan.refusals.length) {
    throw new Error(`Refusing uninstall; unsafe files require review: ${plan.refusals.map((item) => item.path).join(", ")}`);
  }
  for (const entry of plan.files_to_restore) {
    if (!isInsideTarget(targetRoot, resolve(entry.target))) throw new Error(`Refusing restore outside target: ${entry.path}`);
    const manifest = lastManifest(targetRoot);
    const original = manifest.files.find((file) => file.path === entry.path);
    writeFileSync(entry.target, original.before.content);
  }
  for (const entry of plan.files_to_remove) {
    if (!isInsideTarget(targetRoot, resolve(entry.target))) throw new Error(`Refusing removal outside target: ${entry.path}`);
    unlinkSync(entry.target);
  }
  rmSync(installedManifestPath(targetRoot), { force: true });
  console.log(`Uninstalled ${plan.files_to_remove.length} file(s), restored ${plan.files_to_restore.length} file(s).`);
}

function planPath(targetRoot) {
  return join(targetRoot, "compound-install-plan.json");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/install-compound-system.mjs --target <repo> [--overwrite] [--dry-run] [--uninstall] [--rollback <manifest>]");
    return;
  }
  if (!existsSync(sourceRoot)) throw new Error(`Missing bundled system files: ${sourceRoot}`);
  const targetRoot = resolve(args.target);
  mkdirSync(targetRoot, { recursive: true });
  if (args.rollback) {
    applyRollback(targetRoot, args.rollback);
    return;
  }
  if (args.uninstall) {
    const plan = buildUninstallPlan(args);
    writeFileSync(planPath(targetRoot), JSON.stringify(plan, null, 2) + "\n");
    for (const entry of plan.files_to_remove) console.log(`${args.dryRun ? "would remove" : "remove"}: ${entry.path}`);
    for (const entry of plan.files_to_restore) console.log(`${args.dryRun ? "would restore" : "restore"}: ${entry.path}`);
    for (const entry of plan.refusals) console.log(`review required: ${entry.path} (${entry.reason})`);
    if (!args.dryRun) applyUninstall(targetRoot, plan);
    return;
  }
  const plan = buildInstallPlan(args);
  writeFileSync(planPath(targetRoot), JSON.stringify(plan, null, 2) + "\n");
  const rollback = installManifest(targetRoot, plan);

  for (const entry of [...plan.files_to_create, ...plan.files_to_modify]) {
    console.log(`${args.dryRun ? "would copy" : "copy"}: ${entry.path}`);
    if (!args.dryRun) {
      mkdirSync(dirname(entry.target), { recursive: true });
      copyFileSync(entry.source, entry.target);
    }
  }
  for (const entry of plan.files_to_skip) console.log(`skip existing: ${entry.path}`);
  if (!args.dryRun) {
    const rollbackPath = manifestPath(targetRoot);
    writeJsonAtomic(rollbackPath, rollback);
    writeJsonAtomic(installedManifestPath(targetRoot), rollback);
    console.log(`Rollback manifest: ${rollbackPath}`);
    writeInstallEvent(targetRoot, plan, { status: "ok" });
  }

  console.log(`\nCompound system install ${args.dryRun ? "dry-run" : "complete"}: ${plan.files_to_create.length + plan.files_to_modify.length} copied, ${plan.files_to_skip.length} skipped.`);
  console.log(`Install plan: ${planPath(targetRoot)}`);
  if (plan.warnings.length) console.log(`Warnings: ${plan.warnings.length} (review high_impact root writes before applying).`);
  console.log("Next: node .agents/activate.mjs");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
