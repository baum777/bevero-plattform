import { pathToFileURL } from "node:url";

import { config } from "dotenv";

type GuardEnvironment = Record<string, string | undefined>;
type TargetRole = "local" | "development" | "production";

export interface VerifiedDatabaseTarget {
  projectRef: string;
  projectName: string;
  role: TargetRole;
}

const PRODUCTION_APPROVAL = "I_UNDERSTAND_THIS_TOUCHES_PRODUCTION";
const CROSS_PROJECT_READ_APPROVAL = "I_UNDERSTAND_THIS_IS_A_BEVERO_DEV_DB";

const OWNED_SUPABASE_TARGETS: Record<string, Omit<VerifiedDatabaseTarget, "projectRef">> = {
  ienwshemokpsjwkedmyp: {
    projectName: "bevero-os",
    role: "development"
  }
};

const FOREIGN_SUPABASE_TARGETS: Record<string, Omit<VerifiedDatabaseTarget, "projectRef">> = {
  czinchfegtglmrloxlmh: {
    projectName: "warenwirtschaft",
    role: "production"
  }
};

const RISKY_PRISMA_COMMANDS = new Set([
  "db execute",
  "db push",
  "db seed",
  "migrate deploy",
  "migrate dev",
  "migrate reset",
  "migrate resolve"
]);

export function isRiskyPrismaCommand(argv: readonly string[]): boolean {
  return [...RISKY_PRISMA_COMMANDS].some((command) => {
    const [group, action] = command.split(" ");
    const groupIndex = argv.indexOf(group);
    return groupIndex >= 0 && argv.indexOf(action, groupIndex + 1) > groupIndex;
  });
}

export function verifyPrismaCommandTarget(
  argv: readonly string[],
  environment: GuardEnvironment
): VerifiedDatabaseTarget | undefined {
  if (!isRiskyPrismaCommand(argv)) {
    return undefined;
  }

  return verifyDatabaseTarget(environment, argv);
}

export function verifyDatabaseTarget(
  environment: GuardEnvironment,
  riskyCommandContext?: readonly string[]
): VerifiedDatabaseTarget {
  const databaseUrls = [environment.DIRECT_URL, environment.DATABASE_URL]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (databaseUrls.length === 0) {
    throw new Error("Database target verification failed: DATABASE_URL or DIRECT_URL is required.");
  }

  const detectedTargets = databaseUrls.map(detectDatabaseTarget);
  const uniqueTargets = new Map(
    detectedTargets.map((target) => [`${target.role}:${target.projectRef}`, target])
  );

  if (uniqueTargets.size !== 1) {
    const refs = [...uniqueTargets.values()].map((target) => target.projectRef).join(", ");
    throw new Error(`Database target mismatch: configured URLs resolve to different refs (${refs}).`);
  }

  const target = detectedTargets[0];
  const declaredRole = environment.BEVERO_DB_TARGET?.trim();
  const expectedRef = environment.BEVERO_EXPECTED_SUPABASE_REF?.trim();

  if (declaredRole !== target.role) {
    throw new Error(
      `Database target role mismatch: detected ${target.role}, BEVERO_DB_TARGET is ${declaredRole || "unset"}.`
    );
  }

  if (target.role === "local") {
    if (expectedRef && expectedRef !== "local") {
      throw new Error("Expected Supabase ref mismatch: local targets must not declare a remote ref.");
    }
    return target;
  }

  if (expectedRef !== target.projectRef) {
    throw new Error(
      `Expected Supabase ref mismatch: detected ${target.projectRef}, expected ${expectedRef || "unset"}.`
    );
  }

  const isForeignTarget = target.projectRef in FOREIGN_SUPABASE_TARGETS;
  if (isForeignTarget) {
    return assertForeignReadOnlyAllowed(target, environment, riskyCommandContext);
  }

  if (
    target.role === "production" &&
    environment.BEVERO_ALLOW_PRODUCTION_MIGRATION !== PRODUCTION_APPROVAL
  ) {
    throw new Error(
      `Production approval missing for ${target.projectRef}: explicit owner approval token is required.`
    );
  }

  return target;
}

function assertForeignReadOnlyAllowed(
  target: VerifiedDatabaseTarget,
  environment: GuardEnvironment,
  riskyCommandContext?: readonly string[]
): VerifiedDatabaseTarget {
  const override = environment.BEVERO_ALLOW_CROSS_PROJECT_READ?.trim();

  if (override !== CROSS_PROJECT_READ_APPROVAL) {
    throw new Error(
      `Cross-project target blocked: ${target.projectRef} is owned by rauschenberger-os and not writable from bevero-plattform. Set BEVERO_ALLOW_CROSS_PROJECT_READ=${CROSS_PROJECT_READ_APPROVAL} only for explicit read-only verification.`
    );
  }

  const argvForRiskCheck = riskyCommandContext ?? process.argv.slice(2);
  if (isRiskyPrismaCommand(argvForRiskCheck)) {
    throw new Error(
      `Cross-project read-only override does not permit risk-bearing Prisma commands against ${target.projectRef}.`
    );
  }

  return target;
}

function detectDatabaseTarget(connectionString: string): VerifiedDatabaseTarget {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Database target verification failed: configured database URL is invalid.");
  }

  if (isLocalHostname(url.hostname)) {
    return {
      projectRef: "local",
      projectName: "local-postgres",
      role: "local"
    };
  }

  const projectRef = extractSupabaseProjectRef(url);
  if (!projectRef) {
    throw new Error("Database target verification failed: no Supabase project ref could be derived.");
  }

  const owned = OWNED_SUPABASE_TARGETS[projectRef];
  if (owned) {
    return {
      projectRef,
      ...owned
    };
  }

  const foreign = FOREIGN_SUPABASE_TARGETS[projectRef];
  if (foreign) {
    return {
      projectRef,
      ...foreign
    };
  }

  throw new Error(`Database target verification failed: unknown Supabase project ref ${projectRef}.`);
}

function extractSupabaseProjectRef(url: URL): string | undefined {
  const directHostMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (directHostMatch) {
    return directHostMatch[1].toLowerCase();
  }

  const username = decodeURIComponent(url.username);
  const poolerUserMatch = username.match(/^postgres\.([a-z0-9]+)$/i);
  return poolerUserMatch?.[1].toLowerCase();
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function runCli(): void {
  config({ path: ".env" });

  try {
    const target = verifyDatabaseTarget(process.env);
    console.log(
      `Database target verified: ${target.projectRef} (${target.projectName} / ${target.role}).`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database target verification failed.";
    console.error(message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
