import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  MsprAdapterError,
  MsprEntrySchema,
  appendMsprEntry,
  distill,
  listEntries,
  readEntry,
  serializeMsprEntry,
  type MsprEntry,
} from "../../src/agent-team/mspr-memory-adapter.js";
import type {
  MemoryUpdate,
  SwarmReviewResult,
} from "../../src/agent-team/swarm-review-gate.js";
import type { SwarmTaskEnvelope } from "../../src/agent-team/swarm-task-envelope.js";

function makeMsprEntry(overrides: Partial<MsprEntry> = {}): MsprEntry {
  return {
    id: "mspr-2026-06-08-0001",
    timestamp: "2026-06-08T10:00:00.000Z",
    runId: "run-1",
    agentRole: "reviewer",
    taskType: "implementation",
    scope: {
      layer: "runtime_core",
      pathsInScope: ["src/agent-team/"],
      pathsOutOfScope: ["web/", "prisma/"],
      autonomyTier: 3,
    },
    memory: {
      newFindings: ["zod .datetime() requires offset for non-UTC"],
      reusableRules: [],
      gotchas: [],
    },
    progress: {
      actionsTaken: ["created src/agent-team/types.ts"],
      filesRead: ["docs/agent-team/runtime-design.md"],
      filesChanged: ["src/agent-team/types.ts"],
      commandsRun: ["npm run typecheck"],
      validationResults: ["typecheck: ok"],
    },
    review: {
      status: "pass",
      risks: [],
      scorecard: {
        outcomeQuality: 5,
        scopeDiscipline: 5,
        safety: 5,
        evidenceQuality: 5,
        sideEffects: 5,
      },
      nextGate: "Builder may finalize",
    },
    ...overrides,
  };
}

function makeReview(overrides: Partial<SwarmReviewResult> = {}): SwarmReviewResult {
  return {
    verdict: "pass",
    scopeViolations: [],
    policyViolations: [],
    validationEvidence: [
      { kind: "command", ref: "npm run typecheck", outcome: "exit 0" },
    ],
    scorecard: {
      outcomeQuality: 5,
      scopeDiscipline: 5,
      safety: 5,
      evidenceQuality: 5,
      sideEffects: 5,
    },
    memoryUpdates: [],
    nextGate: "Builder may finalize",
    reworkIteration: 0,
    ...overrides,
  };
}

function makeMemoryUpdate(overrides: Partial<MemoryUpdate> = {}): MemoryUpdate {
  return {
    section: "Gotchas",
    bullet: "zod .datetime() requires offset for non-UTC.",
    distilledFrom: "mspr-2026-06-08-0001",
    ...overrides,
  };
}

describe("mspr-memory-adapter", () => {
  let tempRepo: string;
  let logbookDir: string;

  beforeEach(async () => {
    tempRepo = await fs.mkdtemp(path.join(os.tmpdir(), "mspr-test-"));
    logbookDir = path.join(tempRepo, "docs", "agent-team", "mspr_logbook");
    await fs.mkdir(logbookDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRepo, { recursive: true, force: true });
  });

  describe("MsprEntrySchema (zod)", () => {
    it("accepts a fully-populated entry", () => {
      const result = MsprEntrySchema.safeParse(makeMsprEntry());
      expect(result.success).toBe(true);
    });

    it("rejects an entry with a non-ISO timestamp", () => {
      const result = MsprEntrySchema.safeParse(
        makeMsprEntry({ timestamp: "yesterday" }),
      );
      expect(result.success).toBe(false);
    });

    it("rejects an entry with an out-of-range scorecard value", () => {
      const result = MsprEntrySchema.safeParse(
        makeMsprEntry({
          review: {
            ...makeMsprEntry().review,
            scorecard: {
              ...makeMsprEntry().review.scorecard,
              safety: 6,
            },
          },
        }),
      );
      expect(result.success).toBe(false);
    });

    it("rejects an entry with an unknown agentRole", () => {
      const result = MsprEntrySchema.safeParse(
        makeMsprEntry({ agentRole: "god" as unknown as "reviewer" }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe("serializeMsprEntry", () => {
    it("emits a YAML frontmatter block", () => {
      const md = serializeMsprEntry(makeMsprEntry());
      expect(md.startsWith("---\n")).toBe(true);
      expect(md).toContain("id: mspr-2026-06-08-0001");
      expect(md).toContain("timestamp: 2026-06-08T10:00:00.000Z");
      expect(md).toContain("verdict: pass");
    });

    it("emits the human-readable body fields", () => {
      const md = serializeMsprEntry(makeMsprEntry());
      expect(md).toContain("# MSPR Entry — mspr-2026-06-08-0001");
      expect(md).toContain("- **Scope**:");
      expect(md).toContain("- **Memory**:");
      expect(md).toContain("- **Progress**:");
      expect(md).toContain("- **Review**:");
      expect(md).toContain("outcomeQuality: 5");
    });
  });

  describe("appendMsprEntry", () => {
    it("creates a new logbook file when none exists", async () => {
      const result = await appendMsprEntry(makeMsprEntry(), {
        repoRoot: tempRepo,
      });
      expect(result.path).toContain("2026-06-08-mspr-2026-06-08-0001.md");
      const content = await fs.readFile(result.path, "utf8");
      expect(content).toContain("id: mspr-2026-06-08-0001");
    });

    it("appends a second entry to the same day file (separator + new block)", async () => {
      const a = await appendMsprEntry(
        makeMsprEntry({ id: "mspr-2026-06-08-0001" }),
        { repoRoot: tempRepo, slug: "same-slug" },
      );
      const b = await appendMsprEntry(
        makeMsprEntry({
          id: "mspr-2026-06-08-0002",
          runId: "run-2",
        }),
        { repoRoot: tempRepo, slug: "same-slug" },
      );
      expect(b.path).toBe(a.path);
      const content = await fs.readFile(b.path, "utf8");
      expect(content).toContain("id: mspr-2026-06-08-0001");
      expect(content).toContain("id: mspr-2026-06-08-0002");
      // The separator + new block should be present.
      expect(content.match(/---\n/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    });

    it("writes a temp file then renames atomically (no leftover temp files)", async () => {
      await appendMsprEntry(makeMsprEntry(), { repoRoot: tempRepo });
      const files = await fs.readdir(logbookDir);
      const temps = files.filter((f) => f.includes(".tmp-"));
      expect(temps).toEqual([]);
    });

    it("rejects an entry that fails MsprEntrySchema", async () => {
      await expect(
        appendMsprEntry(
          { ...makeMsprEntry(), id: "" } as unknown as MsprEntry,
          { repoRoot: tempRepo },
        ),
      ).rejects.toThrow();
    });

    it("rejects a bad timestamp", async () => {
      // zod validates the timestamp format before our code runs, so a
      // malformed string throws ZodError. We accept either zod or
      // MsprAdapterError — both are correct fail-fast signals.
      try {
        await appendMsprEntry(
          makeMsprEntry({ timestamp: "not-a-date" }),
          { repoRoot: tempRepo },
        );
        expect.unreachable("expected appendMsprEntry to throw");
      } catch (err) {
        expect(
          err instanceof MsprAdapterError ||
            (err as { name?: string }).name === "ZodError",
        ).toBe(true);
      }
    });

    it("rejects a slug that contains '..' (PATH_TRAVERSAL)", async () => {
      await expect(
        appendMsprEntry(makeMsprEntry(), {
          repoRoot: tempRepo,
          slug: "../etc/passwd",
        }),
      ).rejects.toThrow(MsprAdapterError);
    });

    it("rejects a slug with a slash (PATH_TRAVERSAL)", async () => {
      await expect(
        appendMsprEntry(makeMsprEntry(), {
          repoRoot: tempRepo,
          slug: "foo/bar",
        }),
      ).rejects.toThrow(MsprAdapterError);
    });

    it("rejects a slug that does not match the kebab pattern (BAD_SLUG)", async () => {
      await expect(
        appendMsprEntry(makeMsprEntry(), {
          repoRoot: tempRepo,
          slug: "Not_Kebab",
        }),
      ).rejects.toThrow(MsprAdapterError);
    });

    it("rejects a non-existent repoRoot (REPO_ROOT_NOT_FOUND)", async () => {
      await expect(
        appendMsprEntry(makeMsprEntry(), {
          repoRoot: path.join(tempRepo, "does-not-exist"),
        }),
      ).rejects.toThrow(MsprAdapterError);
    });

    it("refuses to write if the existing logbook has no frontmatter (MALFORMED_LOGBOOK)", async () => {
      // Pre-create a malformed file.
      const targetDate = dateFromTimestamp(
        makeMsprEntry().timestamp,
      );
      const malformedPath = path.join(
        logbookDir,
        `${targetDate}-malformed.md`,
      );
      await fs.writeFile(malformedPath, "this is not frontmatter\n", "utf8");
      await expect(
        appendMsprEntry(makeMsprEntry(), {
          repoRoot: tempRepo,
          slug: "malformed",
        }),
      ).rejects.toThrow(MsprAdapterError);
    });

    it("dry-run returns a result without touching disk", async () => {
      const result = await appendMsprEntry(makeMsprEntry(), {
        repoRoot: tempRepo,
        dryRun: true,
      });
      expect(result.bytes).toBeGreaterThan(0);
      const files = await fs.readdir(logbookDir);
      expect(files).toEqual([]);
    });
  });

  describe("readEntry", () => {
    it("returns the entry by id", async () => {
      const written = await appendMsprEntry(makeMsprEntry(), {
        repoRoot: tempRepo,
      });
      const read = await readEntry("mspr-2026-06-08-0001", {
        repoRoot: tempRepo,
      });
      expect(read).not.toBeNull();
      expect(read?.id).toBe(written.entry.id);
      expect(read?.timestamp).toBe(written.entry.timestamp);
      expect(read?.runId).toBe(written.entry.runId);
    });

    it("returns null when the id is not present", async () => {
      await appendMsprEntry(makeMsprEntry(), { repoRoot: tempRepo });
      const read = await readEntry("not-here", { repoRoot: tempRepo });
      expect(read).toBeNull();
    });

    it("returns null when the logbook directory does not exist", async () => {
      const freshRepo = await fs.mkdtemp(path.join(os.tmpdir(), "mspr-empty-"));
      try {
        const read = await readEntry("any", { repoRoot: freshRepo });
        expect(read).toBeNull();
      } finally {
        await fs.rm(freshRepo, { recursive: true, force: true });
      }
    });
  });

  describe("listEntries", () => {
    it("lists entries newest-first", async () => {
      await appendMsprEntry(
        makeMsprEntry({
          id: "mspr-2026-06-08-0001",
          timestamp: "2026-06-08T08:00:00.000Z",
        }),
        { repoRoot: tempRepo, slug: "shared" },
      );
      await appendMsprEntry(
        makeMsprEntry({
          id: "mspr-2026-06-08-0002",
          timestamp: "2026-06-08T11:00:00.000Z",
        }),
        { repoRoot: tempRepo, slug: "shared" },
      );
      const all = await listEntries({ repoRoot: tempRepo });
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe("mspr-2026-06-08-0002");
      expect(all[1].id).toBe("mspr-2026-06-08-0001");
    });

    it("returns an empty array when the logbook directory does not exist", async () => {
      const freshRepo = await fs.mkdtemp(path.join(os.tmpdir(), "mspr-empty-"));
      try {
        const all = await listEntries({ repoRoot: freshRepo });
        expect(all).toEqual([]);
      } finally {
        await fs.rm(freshRepo, { recursive: true, force: true });
      }
    });
  });

  describe("distill", () => {
    it("appends a bullet to an existing section", async () => {
      // Seed agent_memory.md with a Gotchas section.
      const memoryPath = path.join(
        tempRepo,
        "docs",
        "agent-team",
        "agent_memory.md",
      );
      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(
        memoryPath,
        "### Gotchas\n\n- existing bullet\n",
        "utf8",
      );
      const entry = makeMsprEntry();
      const review = makeReview({
        memoryUpdates: [makeMemoryUpdate()],
      });
      const result = await distill({
        entry,
        review,
        repoRoot: tempRepo,
        memoryPath,
      });
      expect(result.bulletsAppended).toBe(1);
      expect(result.sectionsUpdated).toContain("Gotchas");
      const content = await fs.readFile(memoryPath, "utf8");
      expect(content).toContain("zod .datetime() requires offset");
      expect(content).toContain("distilledFrom: mspr-2026-06-08-0001");
    });

    it("creates a section that does not exist", async () => {
      const memoryPath = path.join(
        tempRepo,
        "docs",
        "agent-team",
        "agent_memory.md",
      );
      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(
        memoryPath,
        "### Gotchas\n\n- existing bullet\n",
        "utf8",
      );
      const entry = makeMsprEntry();
      const review = makeReview({
        memoryUpdates: [
          makeMemoryUpdate({
            section: "Operations",
            bullet: "Use vitest's --run flag in CI.",
          }),
        ],
      });
      const result = await distill({
        entry,
        review,
        repoRoot: tempRepo,
        memoryPath,
      });
      expect(result.sectionsUpdated).toContain("Operations");
      const content = await fs.readFile(memoryPath, "utf8");
      expect(content).toContain("### Operations");
      expect(content).toContain("Use vitest's --run flag in CI.");
    });

    it("does NOT append when evidenceQuality < 4", async () => {
      const memoryPath = path.join(
        tempRepo,
        "docs",
        "agent-team",
        "agent_memory.md",
      );
      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(
        memoryPath,
        "### Gotchas\n\n- existing bullet\n",
        "utf8",
      );
      const entry = makeMsprEntry();
      const review = makeReview({
        scorecard: {
          outcomeQuality: 5,
          scopeDiscipline: 5,
          safety: 5,
          evidenceQuality: 3,
          sideEffects: 5,
        },
        memoryUpdates: [makeMemoryUpdate()],
      });
      const result = await distill({
        entry,
        review,
        repoRoot: tempRepo,
        memoryPath,
      });
      expect(result.bulletsAppended).toBe(0);
      const content = await fs.readFile(memoryPath, "utf8");
      expect(content).not.toContain("distilledFrom");
    });

    it("moves an existing contradictory bullet to Superseded", async () => {
      const memoryPath = path.join(
        tempRepo,
        "docs",
        "agent-team",
        "agent_memory.md",
      );
      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(
        memoryPath,
        [
          "### Operations",
          "",
          "- always run typecheck before commit",
          "",
          "### Superseded",
          "",
          "- _none yet_",
          "",
        ].join("\n"),
        "utf8",
      );
      const entry = makeMsprEntry();
      const review = makeReview({
        memoryUpdates: [
          makeMemoryUpdate({
            section: "Operations",
            bullet: "never run typecheck before commit",
          }),
        ],
      });
      const result = await distill({
        entry,
        review,
        repoRoot: tempRepo,
        memoryPath,
      });
      const content = await fs.readFile(memoryPath, "utf8");
      // The new bullet should be present in Operations.
      expect(content).toContain("never run typecheck before commit");
      // The old bullet should have moved to Superseded.
      expect(content.match(/### Superseded[\s\S]*?always run typecheck before commit/)).not.toBeNull();
      expect(result.sectionsUpdated).toContain("Operations");
      expect(result.sectionsUpdated).toContain("Superseded");
    });

    it("creates the memory file with seeded section headers when missing", async () => {
      const memoryPath = path.join(
        tempRepo,
        "docs",
        "agent-team",
        "agent_memory.md",
      );
      // No prior content.
      const entry = makeMsprEntry();
      const review = makeReview({
        memoryUpdates: [makeMemoryUpdate()],
      });
      const result = await distill({
        entry,
        review,
        repoRoot: tempRepo,
        memoryPath,
      });
      expect(result.bulletsAppended).toBe(1);
      const content = await fs.readFile(memoryPath, "utf8");
      expect(content).toContain("### Gotchas");
    });

    it("dry-run does not touch disk and returns a result", async () => {
      const memoryPath = path.join(
        tempRepo,
        "docs",
        "agent-team",
        "agent_memory.md",
      );
      // No prior content.
      const entry = makeMsprEntry();
      const review = makeReview({
        memoryUpdates: [makeMemoryUpdate()],
      });
      const result = await distill({
        entry,
        review,
        repoRoot: tempRepo,
        memoryPath,
        dryRun: true,
      });
      expect(result.bulletsAppended).toBe(1);
      const exists = await fs
        .access(memoryPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });
  });
});

/** Helper: convert ISO timestamp to YYYY-MM-DD (UTC). */
function dateFromTimestamp(ts: string): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Use SwarmTaskEnvelope type to silence "unused" warnings if any.
type _Used = SwarmTaskEnvelope;
const _u: _Used | undefined = undefined;
void _u;
