#!/usr/bin/env node
/**
 * check-work-documentation.mjs
 *
 * Validates that non-trivial repo changes are accompanied by:
 *   1. At least one NEW Code Change Context entry in docs/agent-team/mspr_logbook/
 *      (i.e. a file that is itself part of the current changeset)
 *   2. At least one NEW Intent Memory Log entry in docs/agent-team/intent_logbook/
 *
 * "New" means the entry path appears in the diff/status output — this prevents
 * seed entries already merged to main from satisfying future PRs.
 *
 * Also checks that all changed documentation entries contain no obvious secrets.
 *
 * Usage:
 *   node scripts/check-work-documentation.mjs
 *   npm run check:work-docs
 *
 * In CI (GitHub Actions), set BASE_SHA env var to compare against a specific commit.
 * Falls back to `git status --short` for local runs.
 */

import { readFileSync, existsSync } from "node:fs";

// ── Config ────────────────────────────────────────────────────────────────────

const MSPR_DIR = "docs/agent-team/mspr_logbook";
const INTENT_DIR = "docs/agent-team/intent_logbook";

// Files that never trigger a documentation requirement on their own.
// Keep this list narrow — "self-documenting" is not a blanket exemption.
const TRIVIAL_PATTERNS = [
  /^\.gitignore$/,
  /^package-lock\.json$/,
  // this script itself is exempted only for its initial bootstrap commit
  /^scripts\/check-work-documentation\.mjs$/,
];

// Secret patterns that must never appear in documentation entries.
// Rules:
//   - Variable-name patterns require a non-whitespace value on the same line
//     ([ \t]*=[ \t]*[^\s\n]) — bare "VAR=\n" lines in policy examples don't match.
//   - PEM block pattern requires both BEGIN and END markers (real block, not prose).
//   - Redis URL pattern excludes <placeholder> values.
const SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY[ \t]*=[ \t]*[^\s\n]/i,
  /DATABASE_URL\s*=\s*postgres[^'"\n:]*:\/\/[^:/@\n]+:[^@\s"'\n]{4,}@(?!localhost|127\.0\.0\.1)/i,
  /JWT_SECRET[ \t]*=[ \t]*[^\s\n]/i,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]{20,}-----END/,
  /rediss?:\/\/[^:<\s]+:[^<@\s]{8,}@/,  // real password, not <placeholder>
  /\bsk_live_[A-Za-z0-9]{20,}/,          // Stripe live keys
  /ghp_[A-Za-z0-9]{36}/,                 // GitHub PAT
];

// ── Helpers ───────────────────────────────────────────────────────────────────

import { execSync } from "node:child_process";

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function getChangedFiles() {
  const baseSha = process.env.BASE_SHA;
  if (baseSha) {
    const raw = run(`git diff --name-only ${baseSha} HEAD`);
    return raw ? raw.split("\n").filter(Boolean) : [];
  }
  // Local fallback: staged + unstaged + untracked
  const raw = run("git status --short");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

function isTrivial(file) {
  return TRIVIAL_PATTERNS.some((p) => p.test(file));
}

function checkSecrets(files) {
  const violations = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({ file, pattern: pattern.toString() });
      }
    }
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────────────

let exitCode = 0;
const fail = (msg) => { console.error(`  ✗  ${msg}`); exitCode = 1; };
const ok   = (msg) => { console.log( `  ✓  ${msg}`); };

console.log("\n── Work Documentation Check ──────────────────────────────────");

const changedFiles = getChangedFiles();

// Partition changed files into categories
const newMsprEntries   = changedFiles.filter((f) => f.startsWith(MSPR_DIR + "/") && f.endsWith(".md") && !f.endsWith("README.md"));
const newIntentEntries = changedFiles.filter((f) => f.startsWith(INTENT_DIR + "/") && f.endsWith(".md") && !f.endsWith("README.md"));

const nonTrivial = changedFiles.filter(
  (f) =>
    !isTrivial(f) &&
    !f.startsWith(MSPR_DIR) &&
    !f.startsWith(INTENT_DIR) &&
    !f.startsWith("docs/agent-team/templates")
);

if (nonTrivial.length === 0) {
  ok("No non-trivial files changed — documentation check skipped.");
  console.log("── Result: pass (nothing to check) ──────────────────────────\n");
  process.exit(0);
}

console.log(`\n  Changed files (non-trivial): ${nonTrivial.length}`);
for (const f of nonTrivial) console.log(`    · ${f}`);
console.log();

// ── Check 1: A new MSPR entry is part of this changeset ──────────────────────
if (newMsprEntries.length === 0) {
  fail(`No new MSPR entry found in this changeset under ${MSPR_DIR}/`);
  fail("  Add a dated entry: docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md");
} else {
  ok(`New MSPR entry in changeset: ${newMsprEntries.map((f) => f.split("/").pop()).join(", ")}`);
}

// ── Check 2: A new Intent Memory entry is part of this changeset ─────────────
if (newIntentEntries.length === 0) {
  fail(`No new Intent Memory entry found in this changeset under ${INTENT_DIR}/`);
  fail("  Add a dated entry: docs/agent-team/intent_logbook/YYYY-MM-DD-<slug>.md");
} else {
  ok(`New Intent Memory entry in changeset: ${newIntentEntries.map((f) => f.split("/").pop()).join(", ")}`);
}

// ── Check 3: No secrets in the changed documentation entries ─────────────────
const docsToCheck = [...newMsprEntries, ...newIntentEntries];
const secretViolations = checkSecrets(docsToCheck);
if (secretViolations.length > 0) {
  for (const v of secretViolations) {
    fail(`Possible secret in ${v.file} — pattern: ${v.pattern}`);
  }
} else if (docsToCheck.length > 0) {
  ok("No obvious secret patterns found in changed documentation entries.");
}

// ── Result ────────────────────────────────────────────────────────────────────
console.log();
if (exitCode === 0) {
  console.log("── Result: pass ──────────────────────────────────────────────\n");
} else {
  console.error("── Result: fail ──────────────────────────────────────────────");
  console.error("   Fix: add MSPR and Intent Memory entries to this changeset.");
  console.error("   See: docs/agent-team/work_documentation_rule.md\n");
}

process.exit(exitCode);
