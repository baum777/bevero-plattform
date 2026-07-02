import cors from "@fastify/cors";
import compress from "@fastify/compress";
import helmet from "@fastify/helmet";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import prisma from "./lib/prisma.js";
import {
  BarRefillService,
  type BarRefillDatabaseClient
} from "./modules/inventory/bar-refill.service.js";
import {
  CorrectionService,
  type CorrectionDatabaseClient
} from "./modules/inventory/correction.service.js";
import {
  DemoSeedService,
  type DemoSeedDatabaseClient,
  type DemoSeedServicePort
} from "./modules/inventory/demo-seed.service.js";
import {
  GoodsReceiptService,
  type GoodsReceiptDatabaseClient
} from "./modules/inventory/goods-receipt.service.js";
import {
  InventoryCsvService,
  type InventoryCsvDatabaseClient
} from "./modules/inventory/inventory-csv.service.js";
import { InventoryItemService } from "./modules/inventory/inventory-item.service.js";
import {
  InventoryMasterDataService,
  type InventoryMasterDataDatabaseClient
} from "./modules/inventory/inventory-master-data.service.js";
import {
  InventoryReadService,
  type InventoryReadDatabaseClient
} from "./modules/inventory/inventory-read.service.js";
import {
  PurchaseOrderService,
  type PurchaseOrderDatabaseClient
} from "./modules/inventory/purchase-order.service.js";
import {
  ReviewTaskService,
  type ReviewTaskDatabaseClient
} from "./modules/inventory/review-task.service.js";
import {
  TransferService,
  type TransferDatabaseClient
} from "./modules/inventory/transfer.service.js";
import {
  WithdrawalService,
  type WithdrawalDatabaseClient
} from "./modules/inventory/withdrawal.service.js";
import {
  ProcurementIngestService,
  type ProcurementIngestDatabaseClient
} from "./modules/procurement/procurement-ingest.service.js";
import {
  ProcurementReadService,
  type ProcurementReadDatabaseClient
} from "./modules/procurement/procurement-read.service.js";
import {
  ProcurementWriteService,
  type ProcurementWriteDatabaseClient
} from "./modules/procurement/procurement-write.service.js";
import { createMicrosoftGraphMailSourceFromEnv } from "./modules/procurement/microsoft-graph-mail-source.js";
import {
  TeamAdminService,
  type TeamAdminDatabaseClient
} from "./modules/team/team-admin.service.js";
import {
  InviteService,
  type InviteDatabaseClient
} from "./modules/team/invite.service.js";
import {
  AutomationRuleService,
  type AutomationRuleDatabaseClient
} from "./modules/automation/automation-rule.service.js";
import {
  AutomationRuleWriteService,
  type AutomationRuleWriteServicePort
} from "./modules/automation/automation-rule-write.service.js";
import {
  AutomationSuggestionService,
  type AutomationSuggestionServicePort
} from "./modules/automation/automation-suggestion.service.js";
import { NullMailSource, type MailSource } from "./modules/procurement/mail.types.js";
import {
  automationRoute,
  type AutomationRouteDependencies
} from "./routes/automation.route.js";
import {
  automationRuleWriteRoute,
  type AutomationRuleWriteRouteDependencies
} from "./routes/automation-rule-write.route.js";
import {
  automationSuggestionRoute,
  type AutomationSuggestionRouteDependencies
} from "./routes/automation-suggestion.route.js";
import { healthRoute } from "./routes/health.route.js";
import { inventoryRoute, type InventoryRouteDependencies } from "./routes/inventory.route.js";
import {
  procurementRoute,
  type ProcurementRouteDependencies
} from "./routes/procurement.route.js";
import { teamRoute, type TeamRouteDependencies } from "./routes/team.route.js";
import { locationRoute, type LocationRouteDependencies } from "./routes/location.route.js";
import { LocationService, type LocationDatabaseClient } from "./modules/location/location.service.js";
import {
  operationalUnitRoute,
  type OperationalUnitRouteDependencies
} from "./routes/operational-unit.route.js";
import {
  OperationalUnitService,
  type OperationalUnitDatabaseClient
} from "./modules/operational-unit/operational-unit.service.js";
import {
  cubeSourceConflictRoute,
  type CUBE_SourceConflictRouteDependencies
} from "./routes/cube-source-conflict.route.js";
import {
  CUBE_SourceConflictService,
  type CUBE_SourceConflictDatabaseClient
} from "./modules/cube-source-conflict/cube-source-conflict.service.js";
import {
  cubeEconomicRoute,
  type CUBE_EconomicRouteDependencies
} from "./routes/cube-economic.route.js";
import {
  CUBE_EconomicService,
  type CUBE_EconomicDatabaseClient
} from "./modules/cube-economic/cube-economic.service.js";
import {
  menuRoute,
  type MenuRouteDependencies
} from "./routes/menu.route.js";
import {
  MenuService,
  type MenuDatabaseClient
} from "./modules/menu/menu.service.js";
import {
  eventInquiryRoute,
  type EventInquiryRouteDependencies
} from "./routes/event-inquiry.route.js";
import {
  EventInquiryService,
  type EventInquiryDatabaseClient
} from "./modules/event-inquiry/event-inquiry.service.js";
import {
  organizationRoute,
  type OrganizationRouteDependencies
} from "./routes/organization.route.js";
import {
  OrganizationService,
  type OrganizationDatabaseClient
} from "./modules/organization/organization.service.js";
import {
  inquiryRoute,
  type InquiryRouteDependencies
} from "./routes/inquiry.route.js";
import {
  InquiryService,
  type InquiryDatabaseClient
} from "./modules/inquiry/inquiry.service.js";
import {
  shiftHandoverRoute,
  type ShiftHandoverRouteDependencies
} from "./routes/shift-handover.route.js";
import {
  shiftHandoverConfirmRoute,
  type ShiftHandoverConfirmRouteDependencies
} from "./routes/shift-handover-confirm.route.js";
import {
  ShiftHandoverService,
  type ShiftHandoverDatabaseClient
} from "./modules/shift-handover/shift-handover.service.js";
import {
  operationalNoteRoute,
  type OperationalNoteRouteDependencies
} from "./routes/operational-note.route.js";
import {
  OperationalNoteService,
  type OperationalNoteDatabaseClient
} from "./modules/operational-note/operational-note.service.js";
import {
  workspaceGroupRoute,
  type WorkspaceGroupRouteDependencies
} from "./routes/workspace-group.route.js";
import {
  WorkspaceGroupService,
  type WorkspaceGroupDatabaseClient
} from "./modules/workspace-group/workspace-group.service.js";
import {
  shiftPlanningRoute,
  type ShiftPlanningRouteDependencies
} from "./routes/shift-planning.route.js";
import {
  ShiftPlanImportService,
  type ShiftPlanImportDatabaseClient
} from "./modules/shift-planning/shift-plan-import.service.js";
import {
  TaskGenerationService,
  type TaskGenerationDatabaseClient
} from "./modules/shift-planning/task-generation.service.js";
import {
  MatrixReadService,
  type MatrixReadDatabaseClient
} from "./modules/shift-planning/matrix-read.service.js";
import {
  ShiftLeadSummaryService,
  type ShiftLeadSummaryDatabaseClient
} from "./modules/shift-planning/shift-lead-summary.service.js";
import {
  ShiftSessionService,
  type ShiftSessionDatabaseClient
} from "./modules/shift-planning/shift-session.service.js";
import {
  IssueService,
  type IssueServiceDatabaseClient
} from "./modules/shift-planning/issue.service.js";
import {
  SignoffService,
  type SignoffServiceDatabaseClient
} from "./modules/shift-planning/signoff.service.js";
import type { Env } from "./config/env.js";

const localWebAppOriginPattern = /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/;
const allowedCorsMethods = ["GET", "POST", "PATCH", "OPTIONS"];
const allowedCorsHeaders = ["content-type", "authorization", "x-organization-id"];

type ErrorWithStatusCode = Error & {
  statusCode?: number;
};

export type AppOptions = {
  logger?: FastifyServerOptions["logger"];
  now?: () => Date;
  inventory?: InventoryRouteDependencies;
  procurement?: ProcurementRouteDependencies;
  team?: TeamRouteDependencies;
  automation?: AutomationRouteDependencies &
    AutomationSuggestionRouteDependencies &
    AutomationRuleWriteRouteDependencies;
  location?: LocationRouteDependencies;
  shiftHandover?: ShiftHandoverRouteDependencies & ShiftHandoverConfirmRouteDependencies;
  operationalNote?: OperationalNoteRouteDependencies;
  workspaceGroup?: WorkspaceGroupRouteDependencies;
  shiftPlanning?: ShiftPlanningRouteDependencies;
  operationalUnit?: OperationalUnitRouteDependencies;
  cubeSourceConflict?: CUBE_SourceConflictRouteDependencies;
  cubeEconomic?: CUBE_EconomicRouteDependencies;
  menu?: MenuRouteDependencies;
  eventInquiry?: EventInquiryRouteDependencies;
  organization?: OrganizationRouteDependencies;
  inquiry?: InquiryRouteDependencies;
  mailSource?: MailSource;
  env?: Partial<
    Pick<
      Env,
      | "NODE_ENV"
      | "DEMO_MODE"
      | "SUPABASE_JWT_SECRET"
      | "CORS_ALLOWED_ORIGINS"
      | "PROCUREMENT_ORGANIZATION_ID"
      | "FOODNOTIFY_PARSE_CONFIDENCE_MIN"
      | "FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD"
      | "FOODNOTIFY_RAW_MAIL_MAX_BYTES"
      | "FOODNOTIFY_TRUSTED_SENDER_DOMAINS"
      | "MICROSOFT_TENANT_ID"
      | "MICROSOFT_CLIENT_ID"
      | "MICROSOFT_CLIENT_SECRET"
      | "FOODNOTIFY_MAILBOX"
      | "FOODNOTIFY_MAIL_FOLDER"
      | "FOODNOTIFY_IMPORTED_FOLDER"
      | "FOODNOTIFY_FAILED_FOLDER"
      | "FOODNOTIFY_IGNORED_FOLDER"
      | "FOODNOTIFY_FROM_FILTER"
      | "FOODNOTIFY_IMPORT_MODE"
      | "FOODNOTIFY_IMPORT_ENABLED"
      | "FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS"
    >
  > & {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    SUPABASE_URL?: string;
  };
  demoSeedService?: DemoSeedServicePort;
};

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const env = runtimeContext(options);
  const app = Fastify({
    logger: options.logger ?? false,
    // Accommodates the CSV import cap (5 MB) enforced in importInventoryCsvSchema.
    bodyLimit: 6 * 1024 * 1024
  });

  registerUnexpectedErrorHandler(app);
  app.register(helmet);
  app.register(compress);
  registerCors(app, options);
  registerAppContext(app, env);
  registerDemoSeed(app, options, env);

  app.register(healthRoute, {
    now: options.now
  });
  app.register(inventoryRoute, options.inventory ?? buildInventoryDependencies(options));
  app.register(procurementRoute, options.procurement ?? buildProcurementDependencies(options));
  app.register(teamRoute, options.team ?? buildTeamDependencies(options));
  const automationDeps = options.automation ?? buildAutomationDependencies(options);
  app.register(automationRoute, automationDeps);
  app.register(automationSuggestionRoute, automationDeps);
  app.register(automationRuleWriteRoute, automationDeps);
  app.register(locationRoute, options.location ?? buildLocationDependencies(options));
  app.register(shiftHandoverRoute, options.shiftHandover ?? buildShiftHandoverDependencies(options));
  app.register(shiftHandoverConfirmRoute, options.shiftHandover ?? buildShiftHandoverDependencies(options));
  app.register(
    operationalUnitRoute,
    options.operationalUnit ?? buildOperationalUnitDependencies(options)
  );
  app.register(
    cubeSourceConflictRoute,
    options.cubeSourceConflict ?? buildCUBE_SourceConflictDependencies(options)
  );
  app.register(
    cubeEconomicRoute,
    options.cubeEconomic ?? buildCUBE_EconomicDependencies(options)
  );
  app.register(
    menuRoute,
    options.menu ?? buildMenuDependencies(options)
  );
  app.register(
    eventInquiryRoute,
    options.eventInquiry ?? buildEventInquiryDependencies(options)
  );
  app.register(
    organizationRoute,
    options.organization ?? buildOrganizationDependencies(options)
  );
  app.register(
    inquiryRoute,
    options.inquiry ?? buildInquiryDependencies(options)
  );
  app.register(
    operationalNoteRoute,
    options.operationalNote ?? buildOperationalNoteDependencies(options)
  );
  app.register(
    workspaceGroupRoute,
    options.workspaceGroup ?? buildWorkspaceGroupDependencies(options)
  );
  app.register(
    shiftPlanningRoute,
    options.shiftPlanning ?? buildShiftPlanningDependencies(options)
  );

  return app;
}

function runtimeContext(
  options: AppOptions
): Pick<Env, "NODE_ENV" | "DEMO_MODE" | "SUPABASE_JWT_SECRET"> {
  const nodeEnv = options.env?.NODE_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
  const requestedDemoMode = options.env?.DEMO_MODE ?? process.env.DEMO_MODE === "true";
  const supabaseJwtSecret =
    options.env?.SUPABASE_JWT_SECRET ??
    process.env.SUPABASE_JWT_SECRET ??
    (nodeEnv === "production" ? "" : "test-supabase-jwt-secret");

  if (nodeEnv === "production" && supabaseJwtSecret.trim() === "") {
    throw new Error("SUPABASE_JWT_SECRET is required in production");
  }

  return {
    NODE_ENV: nodeEnv,
    // Hard guard: demo mode (seed + reset route) must never run in production,
    // even if an upstream env check is bypassed.
    DEMO_MODE: nodeEnv === "production" ? false : requestedDemoMode,
    SUPABASE_JWT_SECRET: supabaseJwtSecret
  };
}

function registerAppContext(
  app: FastifyInstance,
  env: Pick<Env, "NODE_ENV" | "DEMO_MODE">
): void {
  if (env.NODE_ENV === "production") {
    return;
  }

  app.get("/app-context", async () => ({
    demoMode: env.DEMO_MODE,
    devPanelEnabled: env.NODE_ENV !== "production" || env.DEMO_MODE,
    defaultActor: {
      userId: "demo-admin",
      role: "admin"
    }
  }));
}

function registerDemoSeed(
  app: FastifyInstance,
  options: AppOptions,
  env: Pick<Env, "DEMO_MODE">
): void {
  if (!env.DEMO_MODE) {
    return;
  }

  const demoSeedService =
    options.demoSeedService ??
    new DemoSeedService({
      db: prisma as unknown as DemoSeedDatabaseClient,
      now: options.now
    });

  app.addHook("onReady", async () => {
    await demoSeedService.ensure();
  });
}

function registerUnexpectedErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: ErrorWithStatusCode, _request, reply) => {
    const rawStatusCode = error.statusCode;
    const statusCode =
      typeof rawStatusCode === "number" && Number.isInteger(rawStatusCode) ? rawStatusCode : 500;

    if (statusCode >= 500) {
      app.log.error({ err: error, statusCode }, "unexpected server error");
      reply.code(500).send({
        error: "Internal Server Error",
        message: "internal server error"
      });
      return;
    }

    reply.code(statusCode).send({
      error: error.name || "Error",
      message: error.message
    });
  });
}

function registerCors(app: FastifyInstance, options: AppOptions): void {
  const allowedOrigins = readAllowedCorsOrigins(options);

  app.register(cors, {
    allowedHeaders: allowedCorsHeaders,
    maxAge: 600,
    methods: allowedCorsMethods,
    origin(origin, callback) {
      callback(null, typeof origin === "string" && isAllowedCorsOrigin(origin, allowedOrigins));
    },
    optionsSuccessStatus: 204
  });
}

function readAllowedCorsOrigins(options: AppOptions): Set<string> {
  const raw =
    options.env?.CORS_ALLOWED_ORIGINS ?? process.env.CORS_ALLOWED_ORIGINS ?? "";

  return new Set(
    raw
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );
}

function isAllowedCorsOrigin(origin: string, allowedOrigins: Set<string>): boolean {
  return localWebAppOriginPattern.test(origin) || allowedOrigins.has(origin);
}

function buildProcurementDependencies(options: AppOptions): ProcurementRouteDependencies {
  const env = runtimeContext(options);
  const confidenceMin = readNumberConfig(options, "FOODNOTIFY_PARSE_CONFIDENCE_MIN", 0.85);
  const rawMailMaxBytes = readNumberConfig(options, "FOODNOTIFY_RAW_MAIL_MAX_BYTES", 204800);
  const failureAlertThreshold = readNumberConfig(
    options,
    "FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD",
    0
  );
  const organizationId =
    options.env?.PROCUREMENT_ORGANIZATION_ID ?? process.env.PROCUREMENT_ORGANIZATION_ID ?? "";
  const trustedSenderDomains = (
    options.env?.FOODNOTIFY_TRUSTED_SENDER_DOMAINS ??
    process.env.FOODNOTIFY_TRUSTED_SENDER_DOMAINS ??
    "foodnotify.com"
  )
    .split(",")
    .map((domain) => domain.trim())
    .filter(Boolean);

  const readService = new ProcurementReadService({
    db: prisma as unknown as ProcurementReadDatabaseClient,
    failureAlertThreshold,
    now: options.now
  });

  const ingestService = new ProcurementIngestService({
    db: prisma as unknown as ProcurementIngestDatabaseClient,
    mailSource: options.mailSource ?? buildMailSource(options) ?? new NullMailSource(),
    organizationId,
    confidenceMin,
    rawMailMaxBytes,
    trustedSenderDomains,
    importEnabled: readBooleanConfig(options, "FOODNOTIFY_IMPORT_ENABLED", false),
    now: options.now
  });

  const writeService = new ProcurementWriteService({
    db: prisma as unknown as ProcurementWriteDatabaseClient,
    now: options.now
  });

  return {
    readService,
    writeService,
    ingestService,
    auth: {
      db: prisma as unknown as NonNullable<ProcurementRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildMailSource(options: AppOptions): MailSource | undefined {
  return createMicrosoftGraphMailSourceFromEnv({
    FOODNOTIFY_IMPORT_ENABLED:
      options.env?.FOODNOTIFY_IMPORT_ENABLED ?? process.env.FOODNOTIFY_IMPORT_ENABLED,
    MICROSOFT_TENANT_ID:
      options.env?.MICROSOFT_TENANT_ID ?? process.env.MICROSOFT_TENANT_ID,
    MICROSOFT_CLIENT_ID:
      options.env?.MICROSOFT_CLIENT_ID ?? process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET:
      options.env?.MICROSOFT_CLIENT_SECRET ?? process.env.MICROSOFT_CLIENT_SECRET,
    FOODNOTIFY_MAILBOX:
      options.env?.FOODNOTIFY_MAILBOX ?? process.env.FOODNOTIFY_MAILBOX,
    FOODNOTIFY_MAIL_FOLDER:
      options.env?.FOODNOTIFY_MAIL_FOLDER ?? process.env.FOODNOTIFY_MAIL_FOLDER,
    FOODNOTIFY_IMPORTED_FOLDER:
      options.env?.FOODNOTIFY_IMPORTED_FOLDER ?? process.env.FOODNOTIFY_IMPORTED_FOLDER,
    FOODNOTIFY_FAILED_FOLDER:
      options.env?.FOODNOTIFY_FAILED_FOLDER ?? process.env.FOODNOTIFY_FAILED_FOLDER,
    FOODNOTIFY_IGNORED_FOLDER:
      options.env?.FOODNOTIFY_IGNORED_FOLDER ?? process.env.FOODNOTIFY_IGNORED_FOLDER,
    FOODNOTIFY_FROM_FILTER:
      options.env?.FOODNOTIFY_FROM_FILTER ?? process.env.FOODNOTIFY_FROM_FILTER
  });
}

function buildTeamDependencies(options: AppOptions): TeamRouteDependencies {
  const env = runtimeContext(options);

  return {
    teamAdminService: new TeamAdminService({
      db: prisma as unknown as TeamAdminDatabaseClient
    }),
    inviteService: new InviteService({
      db: prisma as unknown as InviteDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<TeamRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildLocationDependencies(options: AppOptions): LocationRouteDependencies {
  const env = runtimeContext(options);

  return {
    locationService: new LocationService({
      db: prisma as unknown as LocationDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<LocationRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildOperationalUnitDependencies(
  options: AppOptions
): OperationalUnitRouteDependencies {
  const env = runtimeContext(options);

  return {
    operationalUnitService: new OperationalUnitService({
      db: prisma as unknown as OperationalUnitDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<OperationalUnitRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildCUBE_SourceConflictDependencies(
  options: AppOptions
): CUBE_SourceConflictRouteDependencies {
  const env = runtimeContext(options);

  return {
    cubeSourceConflictService: new CUBE_SourceConflictService({
      db: prisma as unknown as CUBE_SourceConflictDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<CUBE_SourceConflictRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildCUBE_EconomicDependencies(
  options: AppOptions
): CUBE_EconomicRouteDependencies {
  const env = runtimeContext(options);

  return {
    cubeEconomicService: new CUBE_EconomicService({
      db: prisma as unknown as CUBE_EconomicDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<CUBE_EconomicRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildMenuDependencies(options: AppOptions): MenuRouteDependencies {
  const env = runtimeContext(options);

  return {
    menuService: new MenuService({
      db: prisma as unknown as MenuDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<MenuRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildEventInquiryDependencies(
  options: AppOptions
): EventInquiryRouteDependencies {
  const env = runtimeContext(options);

  return {
    eventInquiryService: new EventInquiryService({
      db: prisma as unknown as EventInquiryDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<EventInquiryRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildShiftHandoverDependencies(
  options: AppOptions
): ShiftHandoverRouteDependencies & ShiftHandoverConfirmRouteDependencies {
  const env = runtimeContext(options);

  return {
    shiftHandoverService: new ShiftHandoverService({
      db: prisma as unknown as ShiftHandoverDatabaseClient,
      now: options.now
    }),
    auth: {
      db: prisma as unknown as NonNullable<ShiftHandoverRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildAutomationDependencies(
  options: AppOptions
): AutomationRouteDependencies &
  AutomationSuggestionRouteDependencies &
  AutomationRuleWriteRouteDependencies {
  const env = runtimeContext(options);
  const db = prisma as unknown as AutomationRuleDatabaseClient;
  const automationRuleService = new AutomationRuleService({
    db,
    now: options.now
  });
  const automationSuggestionService: AutomationSuggestionServicePort = new AutomationSuggestionService(
    {
      db,
      now: options.now
    }
  );
  const automationRuleWriteService: AutomationRuleWriteServicePort = new AutomationRuleWriteService({
    db,
    now: options.now
  });

  return {
    automationRuleService,
    automationSuggestionService,
    automationRuleWriteService,
    auth: {
      db: prisma as unknown as NonNullable<AutomationRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildOperationalNoteDependencies(options: AppOptions): OperationalNoteRouteDependencies {
  const env = runtimeContext(options);

  return {
    operationalNoteService: new OperationalNoteService({
      db: prisma as unknown as OperationalNoteDatabaseClient,
      now: options.now
    }),
    auth: {
      db: prisma as unknown as NonNullable<OperationalNoteRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildWorkspaceGroupDependencies(options: AppOptions): WorkspaceGroupRouteDependencies {
  const env = runtimeContext(options);

  return {
    workspaceGroupService: new WorkspaceGroupService({
      db: prisma as unknown as WorkspaceGroupDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<WorkspaceGroupRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildShiftPlanningDependencies(options: AppOptions): ShiftPlanningRouteDependencies {
  const env = runtimeContext(options);

  return {
    importService: new ShiftPlanImportService({
      db: prisma as unknown as ShiftPlanImportDatabaseClient,
      now: options.now
    }),
    taskGenerationService: new TaskGenerationService({
      db: prisma as unknown as TaskGenerationDatabaseClient,
      now: options.now
    }),
    matrixReadService: new MatrixReadService({
      db: prisma as unknown as MatrixReadDatabaseClient
    }),
    summaryService: new ShiftLeadSummaryService({
      db: prisma as unknown as ShiftLeadSummaryDatabaseClient
    }),
    issueService: new IssueService({
      db: prisma as unknown as IssueServiceDatabaseClient,
      now: options.now
    }),
    signoffService: new SignoffService({
      db: prisma as unknown as SignoffServiceDatabaseClient,
      now: options.now
    }),
    shiftSessionService: new ShiftSessionService({
      db: prisma as unknown as ShiftSessionDatabaseClient,
      now: options.now
    }),
    auth: {
      db: prisma as unknown as NonNullable<ShiftPlanningRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function readNumberConfig(
  options: AppOptions,
  key:
    | "FOODNOTIFY_PARSE_CONFIDENCE_MIN"
    | "FOODNOTIFY_RAW_MAIL_MAX_BYTES"
    | "FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD",
  fallback: number
): number {
  const fromOptions = options.env?.[key];
  if (typeof fromOptions === "number") {
    return fromOptions;
  }
  const fromProcess = process.env[key];
  if (fromProcess !== undefined && fromProcess.trim() !== "") {
    const parsed = Number(fromProcess);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readBooleanConfig(
  options: AppOptions,
  key: "FOODNOTIFY_IMPORT_ENABLED",
  fallback: boolean
): boolean {
  const fromOptions = options.env?.[key];
  if (typeof fromOptions === "boolean") {
    return fromOptions;
  }
  const fromProcess = process.env[key];
  if (fromProcess === "true") return true;
  if (fromProcess === "false") return false;
  return fallback;
}

function buildOrganizationDependencies(options: AppOptions): OrganizationRouteDependencies {
  const env = runtimeContext(options);

  return {
    organizationService: new OrganizationService({
      db: prisma as unknown as OrganizationDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<OrganizationRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildInquiryDependencies(options: AppOptions): InquiryRouteDependencies {
  const env = runtimeContext(options);

  return {
    inquiryService: new InquiryService({
      db: prisma as unknown as InquiryDatabaseClient
    }),
    auth: {
      db: prisma as unknown as NonNullable<InquiryRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}

function buildInventoryDependencies(options: AppOptions): InventoryRouteDependencies {
  const env = runtimeContext(options);
  const inventoryReadService = new InventoryReadService(
    prisma as unknown as InventoryReadDatabaseClient
  );

  return {
    purchaseOrderService: new PurchaseOrderService({
      db: prisma as unknown as PurchaseOrderDatabaseClient,
      now: options.now
    }),
    inventoryItemService: new InventoryItemService({
      db: prisma
    }),
    inventoryMasterDataService: new InventoryMasterDataService({
      db: prisma as unknown as InventoryMasterDataDatabaseClient,
      inventoryReadService
    }),
    goodsReceiptService: new GoodsReceiptService({
      db: prisma as unknown as GoodsReceiptDatabaseClient,
      now: options.now
    }),
    withdrawalService: new WithdrawalService({
      db: prisma as unknown as WithdrawalDatabaseClient,
      now: options.now
    }),
    transferService: new TransferService({
      db: prisma as unknown as TransferDatabaseClient,
      now: options.now
    }),
    correctionService: new CorrectionService({
      db: prisma as unknown as CorrectionDatabaseClient,
      now: options.now
    }),
    reviewTaskService: new ReviewTaskService({
      db: prisma as unknown as ReviewTaskDatabaseClient
    }),
    barRefillService: new BarRefillService({
      db: prisma as unknown as BarRefillDatabaseClient,
      now: options.now
    }),
    demoMode: env.DEMO_MODE,
    inventoryReadService,
    inventoryCsvService: new InventoryCsvService({
      db: prisma as unknown as InventoryCsvDatabaseClient,
      now: options.now
    }),
    auth: {
      db: prisma as unknown as NonNullable<InventoryRouteDependencies["auth"]>["db"],
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl:
        options.env?.SUPABASE_URL ??
        options.env?.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  };
}
