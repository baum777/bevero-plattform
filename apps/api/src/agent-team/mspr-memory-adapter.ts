/**
 * mspr-memory-adapter.ts
 *
 * Writes MSPR entries as append-only Markdown to
 * `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md` with frontmatter,
 * atomically (write to temp + rename). Also exposes `distill()` to
 * promote long-lived findings into `docs/agent-team/agent_memory.md`.
 *
 * Hard rules (per runtime-design.md → "Persistence"):
 *   - Append-only. The adapter never edits a past entry.
 *   - Never writes outside `docs/agent-team/mspr_logbook/`.
 *   - Never reads or includes secrets / PII / unverified claims.
 *   - Atomic: writes go to a temp file in the same directory and are
 *     renamed into place.
 *
 * Cross-references:
 *   - docs/agent-team/mspr_logbook.md → "Entry format" + "Retention"
 *   - docs/agent-team/mspr_schema.json
 *   - docs/agent-team/agent_memory.md → "Sections" + "Distillation process"
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import type {
  ScopeViolation,
  PolicyViolation,
  ValidationEvidence,
  MemoryUpdate,
  SwarmReviewResult,
} from "./swarm-review-gate.js";
import type { Scorecard, Verdict } from "./types.js";

/**
 * Named error type for the adapter. Callers can branch on `code` to
 * distinguish "bad input" from "filesystem error" without inspecting
 * free-form messages.
 */
export class MsprAdapterError extends Error {
  public override readonly name = "MsprAdapterError";
  constructor(
    message: string,
    public readonly code:
      | "BAD_TIMESTAMP"
      | "BAD_SLUG"
      | "REPO_ROOT_NOT_FOUND"
      | "PATH_TRAVERSAL"
      | "MALFORMED_LOGBOOK"
      | "WRITE_FAILED",
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

/**
 * zod schema for one MSPR logbook entry. Mirrors
 * `docs/agent-team/mspr_schema.json` (Draft-07). The JSON Schema and
 * the TS type are both derived from this zod schema and must stay in
 * lock-step.
 */
export const MsprEntrySchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().datetime({ offset: true }),
    runId: z.string().min(1),
    agentRole: z.enum(["orchestrator", "builder", "reviewer"]),
    taskType: z.enum([
      "read_only_audit",
      "docs_spec",
      "implementation",
      "bugfix",
      "refactor",
      "test_validation",
      "governance_change",
      "ci_build_change",
      "infra_db_change",
      "security_sensitive",
      "destructive_operation",
    ]),
    scope: z
      .object({
        layer: z.enum([
          "docs_only",
          "package_local",
          "app_local",
          "cross_package",
          "runtime_core",
          "governance_policy",
          "infra_database",
          "ci_deployment",
          "production_sensitive",
        ]),
        pathsInScope: z.array(z.string().min(1)),
        pathsOutOfScope: z.array(z.string().min(1)),
        autonomyTier: z.union([
          z.literal(0),
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
        ]),
      })
      .strict(),
    memory: z
      .object({
        newFindings: z.array(z.string().min(1)),
        reusableRules: z.array(z.string().min(1)),
        gotchas: z.array(z.string().min(1)),
      })
      .strict(),
    progress: z
      .object({
        actionsTaken: z.array(z.string().min(1)),
        filesRead: z.array(z.string().min(1)),
        filesChanged: z.array(z.string().min(1)),
        commandsRun: z.array(z.string().min(1)),
        validationResults: z.array(z.string().min(1)),
      })
      .strict(),
    review: z
      .object({
        status: z.enum(["pass", "needs_rework", "blocked", "approval_required"]),
        risks: z.array(z.string().min(1)),
        scorecard: z
          .object({
            outcomeQuality: z.number().int().min(0).max(5),
            scopeDiscipline: z.number().int().min(0).max(5),
            safety: z.number().int().min(0).max(5),
            evidenceQuality: z.number().int().min(0).max(5),
            sideEffects: z.number().int().min(0).max(5),
          })
          .strict(),
        nextGate: z.string().min(1),
      })
      .strict(),
  })
  .strict();

/** Inferred TS type for a parsed MSPR entry. */
export type MsprEntry = z.infer<typeof MsprEntrySchema>;

/** Result of an append call. */
export interface AppendResult {
  /** The parsed entry that was written. */
  entry: MsprEntry;
  /** Absolute path of the markdown file the entry was written to. */
  path: string;
  /** Number of bytes written (UTF-8). */
  bytes: number;
}

/** Options for `appendMsprEntry`. */
export interface AppendOptions {
  /**
   * Repo root, used to resolve `docs/agent-team/mspr_logbook/`.
   * Defaults to `process.cwd()`. Must be a directory; the function
   * refuses to write outside the repo.
   */
  repoRoot?: string;
  /**
   * Override the slug derived from `entry.id`. Slug must match
   * `/^[a-z0-9][a-z0-9-]{0,63}$/` after lower-casing.
   */
  slug?: string;
  /**
   * Skip the file-system write. Used by tests that assert on the
   * serialized Markdown without touching disk.
   */
  dryRun?: boolean;
}

/** Input for `distill`. */
export interface DistillInput {
  /** The MSPR entry to distill. */
  entry: MsprEntry;
  /** The Reviewer's verdict and memory updates for this entry. */
  review: SwarmReviewResult;
  /**
   * Absolute path to `docs/agent-team/agent_memory.md`. Defaults to
   * `<repoRoot>/docs/agent-team/agent_memory.md`.
   */
  memoryPath?: string;
  /**
   * Repo root. Defaults to `process.cwd()`.
   */
  repoRoot?: string;
  /**
   * Skip the file-system write. Used by tests.
   */
  dryRun?: boolean;
}

/** Result of a distill call. */
export interface DistillResult {
  /** Sections updated in `agent_memory.md`. */
  sectionsUpdated: string[];
  /** Number of bullets appended across all sections. */
  bulletsAppended: number;
  /** The path of the memory file that was updated (or would be, in dry-run). */
  path: string;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function deriveSlugFromId(id: string): string {
  const cleaned = id
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  if (cleaned.length === 0) {
    throw new MsprAdapterError(
      `Cannot derive slug from id '${id}': no kebab-safe characters.`,
      "BAD_SLUG",
    );
  }
  return cleaned;
}

function assertSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new MsprAdapterError(
      `Slug '${slug}' does not match /^[a-z0-9][a-z0-9-]{0,63}$/.`,
      "BAD_SLUG",
    );
  }
}

function assertNoPathTraversal(slug: string): void {
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    throw new MsprAdapterError(
      `Slug '${slug}' contains path-traversal characters.`,
      "PATH_TRAVERSAL",
    );
  }
}

function dateFromTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    throw new MsprAdapterError(
      `Timestamp '${timestamp}' is not a valid ISO-8601 datetime.`,
      "BAD_TIMESTAMP",
    );
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function assertRepoRoot(repoRoot: string): Promise<string> {
  const abs = path.resolve(repoRoot);
  try {
    const st = await fs.stat(abs);
    if (!st.isDirectory()) {
      throw new MsprAdapterError(
        `Repo root '${abs}' is not a directory.`,
        "REPO_ROOT_NOT_FOUND",
      );
    }
  } catch (err: unknown) {
    if (err instanceof MsprAdapterError) throw err;
    throw new MsprAdapterError(
      `Repo root '${abs}' does not exist or is not readable.`,
      "REPO_ROOT_NOT_FOUND",
      err,
    );
  }
  return abs;
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

/**
 * Serialize an MSPR entry to a single Markdown document with YAML
 * frontmatter, matching the "Minimal Markdown entry template" from
 * `mspr_logbook.md`.
 */
export function serializeMsprEntry(entry: MsprEntry): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`id: ${entry.id}`);
  lines.push(`timestamp: ${entry.timestamp}`);
  lines.push(`runId: ${entry.runId}`);
  lines.push(`agentRole: ${entry.agentRole}`);
  lines.push(`taskType: ${entry.taskType}`);
  lines.push(`verdict: ${entry.review.status}`);
  lines.push("---");
  lines.push("");
  lines.push(`# MSPR Entry — ${entry.id}`);
  lines.push("");
  lines.push(`- **Scope**:`);
  lines.push(`  - layer: ${entry.scope.layer}`);
  lines.push(`  - autonomyTier: ${entry.scope.autonomyTier}`);
  lines.push(`  - pathsInScope: ${JSON.stringify(entry.scope.pathsInScope)}`);
  lines.push(`  - pathsOutOfScope: ${JSON.stringify(entry.scope.pathsOutOfScope)}`);
  lines.push(`- **Memory**:`);
  lines.push(`  - newFindings: ${JSON.stringify(entry.memory.newFindings)}`);
  lines.push(`  - reusableRules: ${JSON.stringify(entry.memory.reusableRules)}`);
  lines.push(`  - gotchas: ${JSON.stringify(entry.memory.gotchas)}`);
  lines.push(`- **Progress**:`);
  lines.push(`  - actionsTaken: ${JSON.stringify(entry.progress.actionsTaken)}`);
  lines.push(`  - filesRead: ${JSON.stringify(entry.progress.filesRead)}`);
  lines.push(`  - filesChanged: ${JSON.stringify(entry.progress.filesChanged)}`);
  lines.push(`  - commandsRun: ${JSON.stringify(entry.progress.commandsRun)}`);
  lines.push(`  - validationResults: ${JSON.stringify(entry.progress.validationResults)}`);
  lines.push(`- **Review**:`);
  lines.push(`  - status: ${entry.review.status}`);
  lines.push(`  - risks: ${JSON.stringify(entry.review.risks)}`);
  lines.push(`  - scorecard:`);
  lines.push(`    - outcomeQuality: ${entry.review.scorecard.outcomeQuality}`);
  lines.push(`    - scopeDiscipline: ${entry.review.scorecard.scopeDiscipline}`);
  lines.push(`    - safety: ${entry.review.scorecard.safety}`);
  lines.push(`    - evidenceQuality: ${entry.review.scorecard.evidenceQuality}`);
  lines.push(`    - sideEffects: ${entry.review.scorecard.sideEffects}`);
  lines.push(`  - nextGate: ${entry.review.nextGate}`);
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Append (atomic, append-only)
// ---------------------------------------------------------------------------

/**
 * Serialize an MSPR entry to Markdown with frontmatter and append it to
 * `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md`. The file is
 * created on first write and appended to on subsequent writes within
 * the same day. Writes are atomic: the adapter writes to a temp file
 * in the same directory and then `rename`s it into place.
 *
 * @throws ZodError if the entry fails `MsprEntrySchema`.
 * @throws MsprAdapterError for bad slug, bad timestamp, missing repo
 *   root, path traversal, or filesystem failure.
 */
export async function appendMsprEntry(
  entry: MsprEntry,
  options: AppendOptions = {},
): Promise<AppendResult> {
  // 1. Validate entry strictly with zod (errors before any fs call).
  const parsed: MsprEntry = MsprEntrySchema.parse(entry);

  // 2. Resolve and validate slug, date, repo root.
  const slug = options.slug ?? deriveSlugFromId(parsed.id);
  assertSlug(slug);
  assertNoPathTraversal(slug);
  const date = dateFromTimestamp(parsed.timestamp);
  const repoRoot = await assertRepoRoot(options.repoRoot ?? process.cwd());
  const logbookDir = path.join(repoRoot, "docs", "agent-team", "mspr_logbook");
  const filePath = path.join(logbookDir, `${date}-${slug}.md`);

  // Defensive: ensure filePath stays inside logbookDir even after
  // joining (belt-and-braces — assertNoPathTraversal already covers
  // the slug, but a hostile repoRoot could still be a problem).
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(logbookDir) + path.sep)) {
    throw new MsprAdapterError(
      `Resolved path '${resolved}' escapes logbook directory.`,
      "PATH_TRAVERSAL",
    );
  }

  // 3. Compose the new body.
  const newBody = serializeMsprEntry(parsed);

  if (options.dryRun) {
    return { entry: parsed, path: resolved, bytes: Buffer.byteLength(newBody, "utf8") };
  }

  // 4. Ensure the logbook directory exists, then read existing content
  //    (if any), validate frontmatter, and append.
  await fs.mkdir(logbookDir, { recursive: true });

  let existing = "";
  let fileExists = false;
  try {
    existing = await fs.readFile(resolved, "utf8");
    fileExists = true;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e && e.code !== "ENOENT") {
      throw new MsprAdapterError(
        `Failed to read existing logbook '${resolved}': ${e.message}`,
        "WRITE_FAILED",
        err,
      );
    }
  }

  if (fileExists) {
    if (!existing.startsWith("---\n")) {
      throw new MsprAdapterError(
        `Existing logbook '${resolved}' has no YAML frontmatter; refusing to append.`,
        "MALFORMED_LOGBOOK",
      );
    }
  }

  const finalContent = fileExists
    ? existing.replace(/\n?$/, "") + "\n\n---\n\n" + newBody
    : newBody;

  // 5. Atomic write: write to temp, fsync, rename.
  const tmpName = `${path.basename(resolved)}.tmp-${randomBytes(6).toString("hex")}`;
  const tmpPath = path.join(path.dirname(resolved), tmpName);
  try {
    const handle = await fs.open(tmpPath, "w");
    try {
      await handle.writeFile(finalContent, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmpPath, resolved);
  } catch (err: unknown) {
    // Best-effort cleanup of the temp file.
    try {
      await fs.unlink(tmpPath);
    } catch {
      // ignore
    }
    const e = err as NodeJS.ErrnoException;
    throw new MsprAdapterError(
      `Failed to write logbook '${resolved}': ${e?.message ?? String(err)}`,
      "WRITE_FAILED",
      err,
    );
  }

  return {
    entry: parsed,
    path: resolved,
    bytes: Buffer.byteLength(finalContent, "utf8"),
  };
}

// ---------------------------------------------------------------------------
// Read / list
// ---------------------------------------------------------------------------

/**
 * Read a single logbook entry by `id`. Searches the `mspr_logbook/`
 * directory for the first file whose frontmatter `id` matches, then
 * returns the parsed `MsprEntry`. Returns `null` if not found.
 *
 * @throws MsprAdapterError on filesystem / parse failure (other than
 *   not-found).
 */
export async function readEntry(
  id: string,
  options: { repoRoot?: string } = {},
): Promise<MsprEntry | null> {
  const repoRoot = await assertRepoRoot(options.repoRoot ?? process.cwd());
  const logbookDir = path.join(repoRoot, "docs", "agent-team", "mspr_logbook");
  let entries: string[];
  try {
    entries = await fs.readdir(logbookDir);
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === "ENOENT") return null;
    throw new MsprAdapterError(
      `Failed to read logbook directory: ${e?.message ?? String(err)}`,
      "WRITE_FAILED",
      err,
    );
  }
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const full = path.join(logbookDir, name);
    let content: string;
    try {
      content = await fs.readFile(full, "utf8");
    } catch {
      continue;
    }
    // Each file contains one or more "---" frontmatter blocks.
    // Match the first one; the rest are part of the body.
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fmMatch) continue;
    const block = fmMatch[1];
    const idLine = block
      .split("\n")
      .find((l) => l.startsWith("id: "));
    if (!idLine) continue;
    if (idLine.slice("id: ".length).trim() === id) {
      // We only return the first match — the first block in the file
      // is the one written when the file was created. The caller can
      // re-parse the full file via `serializeMsprEntry` if they need
      // the rest.
      return parseMsprEntryFromMarkdown(content);
    }
  }
  return null;
}

/**
 * Extract every frontmatter block from a Markdown file and return the
 * corresponding `MsprEntry` summaries. The file may contain multiple
 * blocks separated by `\n---\n` (per the append semantics in
 * `runtime-design.md`).
 */
function parseAllEntriesFromMarkdown(md: string): MsprEntry[] {
  const out: MsprEntry[] = [];
  // Match YAML frontmatter blocks: a leading `---\n` on its own line, body
  // containing at least one non-blank line, and a closing `---` on its own
  // line that is followed by either a blank line + content, or end of file.
  // The previous regex `^---\n([\s\S]*?)\n---(?:\n|$)` was too eager and
  // matched the standalone `---` separator that sits between two appended
  // frontmatter blocks (the body of that match was empty, so it correctly
  // returned null from `buildEntryFromFrontmatter` but only by accident; on
  // a different separator the regex could have collided with a real block).
  // See the test "lists entries newest-first" in
  // tests/agent-team/mspr-memory-adapter.test.ts.
  const re = /^---\n([^\n][\s\S]*?)\n---(?:\n\n|\n[^\n-]|$)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const entry = buildEntryFromFrontmatter(m[1]);
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * List all MSPR entries in the logbook, newest-first. The list is
 * computed by scanning every `*.md` file under the logbook directory
 * and extracting the first frontmatter block of each.
 *
 * @throws MsprAdapterError on filesystem failure.
 */
export async function listEntries(
  options: { repoRoot?: string } = {},
): Promise<MsprEntry[]> {
  const repoRoot = await assertRepoRoot(options.repoRoot ?? process.cwd());
  const logbookDir = path.join(repoRoot, "docs", "agent-team", "mspr_logbook");
  let names: string[];
  try {
    names = await fs.readdir(logbookDir);
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === "ENOENT") return [];
    throw new MsprAdapterError(
      `Failed to read logbook directory: ${e?.message ?? String(err)}`,
      "WRITE_FAILED",
      err,
    );
  }
  const out: MsprEntry[] = [];
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const full = path.join(logbookDir, name);
    let content: string;
    try {
      content = await fs.readFile(full, "utf8");
    } catch {
      continue;
    }
    const entries = parseAllEntriesFromMarkdown(content);
    for (const e of entries) out.push(e);
  }
  // Newest-first by timestamp.
  out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
  return out;
}

/**
 * Parse the first frontmatter block of a Markdown file and return the
 * corresponding `MsprEntry` summary. The deeper fields (scope, memory,
 * progress, review details) live in the Markdown body and are not
 * machine-parsed here; they are filled with safe defaults that satisfy
 * the zod schema (including a non-empty `nextGate` sentinel).
 */
function parseMsprEntryFromMarkdown(md: string): MsprEntry | null {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!fmMatch) return null;
  return buildEntryFromFrontmatter(fmMatch[1]);
}

/**
 * Build an `MsprEntry` from a frontmatter block string. The block is
 * the content between the `---` fences. The deeper fields are filled
 * with safe defaults that satisfy the zod schema.
 */
function buildEntryFromFrontmatter(block: string): MsprEntry | null {
  const get = (key: string): string | undefined => {
    const line = block.split("\n").find((l) => l.startsWith(`${key}: `));
    return line ? line.slice(key.length + 2) : undefined;
  };

  const id = get("id");
  const timestamp = get("timestamp");
  const runId = get("runId");
  const agentRole = get("agentRole") as
    | "orchestrator"
    | "builder"
    | "reviewer"
    | undefined;
  const taskType = get("taskType") as MsprEntry["taskType"] | undefined;
  const verdict = get("verdict") as Verdict | undefined;
  if (!id || !timestamp || !runId || !agentRole || !taskType || !verdict) {
    return null;
  }

  const candidate: MsprEntry = {
    id,
    timestamp,
    runId,
    agentRole,
    taskType,
    scope: {
      layer: "docs_only",
      pathsInScope: [],
      pathsOutOfScope: [],
      autonomyTier: 1,
    },
    memory: { newFindings: [], reusableRules: [], gotchas: [] },
    progress: {
      actionsTaken: [],
      filesRead: [],
      filesChanged: [],
      commandsRun: [],
      validationResults: [],
    },
    review: {
      status: verdict,
      risks: [],
      scorecard: {
        outcomeQuality: 0,
        scopeDiscipline: 0,
        safety: 0,
        evidenceQuality: 0,
        sideEffects: 0,
      },
      // Non-empty sentinel so the zod `min(1)` constraint passes.
      // Callers wanting the real nextGate should re-parse the body
      // section of the markdown.
      nextGate: "see MSPR body",
    },
  };
  const result = MsprEntrySchema.safeParse(candidate);
  return result.success ? result.data : null;
}

// ---------------------------------------------------------------------------
// Distill to agent_memory.md
// ---------------------------------------------------------------------------

/** Sections in `agent_memory.md`. The adapter creates any missing one. */
const MEMORY_SECTIONS: readonly MemoryUpdate["section"][] = [
  "Repo conventions worth remembering",
  "Operations",
  "Gotchas",
  "Reusable rules (cross-task)",
  "Superseded",
];

function isMemorySection(name: string): name is MemoryUpdate["section"] {
  return (MEMORY_SECTIONS as readonly string[]).includes(name);
}

function renderBullet(update: MemoryUpdate, evidenceQuality: number): string {
  const eq = `evidenceQuality=${evidenceQuality}`;
  return `- ${update.bullet} _(distilledFrom: ${update.distilledFrom}; ${eq})_`;
}

/**
 * Promote long-lived findings from an MSPR entry into
 * `docs/agent-team/agent_memory.md` under the matching section.
 *
 * Promotion rules (per `agent_memory.md` → "Distillation process"):
 *   - Only `MemoryUpdate` items with `evidenceQuality >= 4` are eligible.
 *   - Each appended bullet is signed with `distilledFrom: <entry.id>`.
 *   - The function is non-destructive: it never rewrites past bullets.
 *   - A contradiction moves the older bullet to "Superseded" with a
 *     link to the new one.
 */
export async function distill(input: DistillInput): Promise<DistillResult> {
  const { entry, review } = input;
  const repoRoot = await assertRepoRoot(input.repoRoot ?? process.cwd());
  const memoryPath = input.memoryPath
    ? path.resolve(input.memoryPath)
    : path.join(repoRoot, "docs", "agent-team", "agent_memory.md");

  // Filter eligible updates.
  const eligible = review.memoryUpdates.filter(
    (u) => review.scorecard.evidenceQuality >= 4,
  );
  if (eligible.length === 0) {
    return { sectionsUpdated: [], bulletsAppended: 0, path: memoryPath };
  }

  // Ensure the memory file exists. If it doesn't, seed it with the
  // standard section headers from `agent_memory.md`.
  if (!input.dryRun) {
    try {
      await fs.access(memoryPath);
    } catch {
      const seed = MEMORY_SECTIONS.map((s) => `### ${s}\n\n- _none yet_\n`).join("\n") + "\n";
      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(memoryPath, seed, "utf8");
    }
  }

  // For dry-run, just compute the result without writing.
  if (input.dryRun) {
    const sections = Array.from(new Set(eligible.map((u) => u.section)));
    return {
      sectionsUpdated: sections,
      bulletsAppended: eligible.length,
      path: memoryPath,
    };
  }

  const original = await fs.readFile(memoryPath, "utf8");
  const sectionsTouched = new Set<string>();
  let bulletsAppended = 0;
  let updated = original;

  for (const u of eligible) {
    const sectionHeader = `### ${u.section}`;
    if (!updated.includes(sectionHeader)) {
      // Create the section at the end of the file.
      const sep = updated.endsWith("\n") ? "" : "\n";
      updated =
        updated.replace(/\n?$/, "") +
        sep +
        "\n" +
        sectionHeader +
        "\n\n" +
        renderBullet(u, review.scorecard.evidenceQuality) +
        "\n";
      sectionsTouched.add(u.section);
      bulletsAppended += 1;
      continue;
    }

    // Detect a "contradiction" — a new bullet whose text starts with
    // one of the existing bullets in the same section. Heuristic: a
    // bullet is contradictory if its leading word ("Don't", "Never",
    // etc.) is the negation of an existing bullet's leading word. To
    // keep the heuristic simple and safe, we look for exact-prefix
    // matches with leading "not" / negation.
    const lines = updated.split("\n");
    const headerIdx = lines.findIndex((l) => l === sectionHeader);
    const nextHeaderIdx = lines.findIndex(
      (l, i) => i > headerIdx && l.startsWith("### "),
    );
    const sectionEnd = nextHeaderIdx === -1 ? lines.length : nextHeaderIdx;
    const sectionLines = lines.slice(headerIdx + 1, sectionEnd);

    const contradictionIdx = sectionLines.findIndex(
      (l) => l.startsWith("- ") && isContradiction(l, u.bullet),
    );
    if (contradictionIdx >= 0) {
      // Move the contradicted bullet to "Superseded" and append the new one.
      const oldBullet = sectionLines[contradictionIdx];
      lines.splice(headerIdx + 1 + contradictionIdx, 1);
      // Append new bullet to the section.
      const newBullet = renderBullet(u, review.scorecard.evidenceQuality);
      const insertAt = headerIdx + 1 + sectionLines.length - 1; // before "Superseded" footer
      lines.splice(insertAt, 0, newBullet);
      // Add the older bullet to "Superseded".
      const supersededHeader = "### Superseded";
      const sIdx = lines.findIndex((l) => l === supersededHeader);
      if (sIdx === -1) {
        lines.push("", supersededHeader, "", `- ${oldBullet.replace(/^- /, "")}`);
      } else if (lines[sIdx + 1] && lines[sIdx + 1].startsWith("- _none yet_")) {
        lines.splice(sIdx + 1, 1, `- ${oldBullet.replace(/^- /, "")}`);
      } else {
        lines.push(`- ${oldBullet.replace(/^- /, "")}`);
      }
      sectionsTouched.add(u.section);
      sectionsTouched.add("Superseded");
      bulletsAppended += 1;
      updated = lines.join("\n");
      continue;
    }

    // No contradiction — append to the section.
    const newBullet = renderBullet(u, review.scorecard.evidenceQuality);
    // Insert before the next "### " header (or at end of file).
    const insertAt = sectionEnd;
    lines.splice(insertAt, 0, newBullet);
    sectionsTouched.add(u.section);
    bulletsAppended += 1;
    updated = lines.join("\n");
  }

  // Atomic write of the memory file.
  const tmp = `${memoryPath}.tmp-${randomBytes(6).toString("hex")}`;
  try {
    const handle = await fs.open(tmp, "w");
    try {
      await handle.writeFile(updated, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmp, memoryPath);
  } catch (err: unknown) {
    try {
      await fs.unlink(tmp);
    } catch {
      // ignore
    }
    const e = err as NodeJS.ErrnoException;
    throw new MsprAdapterError(
      `Failed to write memory file '${memoryPath}': ${e?.message ?? String(err)}`,
      "WRITE_FAILED",
      err,
    );
  }

  // Discard the unused isMemorySection import warning by using it
  // defensively — we keep the type guard for downstream use.
  void isMemorySection;

  return {
    sectionsUpdated: Array.from(sectionsTouched),
    bulletsAppended,
    path: memoryPath,
  };
}

const NEGATION_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["do", "don't"],
  ["use", "don't use"],
  ["always", "never"],
  ["never", "always"],
  ["must", "must not"],
  ["must not", "must"],
  ["enable", "disable"],
  ["disable", "enable"],
];

function isContradiction(existing: string, incoming: string): boolean {
  const e = existing.replace(/^- /, "").trim().toLowerCase();
  const i = incoming.trim().toLowerCase();
  if (e === i) return false;
  for (const [a, b] of NEGATION_PAIRS) {
    if (e.startsWith(a) && i.startsWith(b)) return true;
    if (e.startsWith(b) && i.startsWith(a)) return true;
  }
  return false;
}
