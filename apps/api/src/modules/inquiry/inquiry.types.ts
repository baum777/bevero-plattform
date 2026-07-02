import type {
  BusinessUnitName,
  InquirySource,
  InquiryStatus,
  InquirySubject,
} from "@prisma/client";
import type { Actor } from "../auth/actor.js";

export {
  BusinessUnitName,
  InquirySource,
  InquiryStatus,
  InquirySubject,
};

export type InquirySourceValue = (typeof InquirySource)[keyof typeof InquirySource];
export type InquiryStatusValue = (typeof InquiryStatus)[keyof typeof InquiryStatus];
export type InquirySubjectValue = (typeof InquirySubject)[keyof typeof InquirySubject];
export type BusinessUnitNameValue = (typeof BusinessUnitName)[keyof typeof BusinessUnitName];

export class InquiryError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 422;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 422) {
    super(message);
    this.name = "InquiryError";
    this.statusCode = statusCode;
  }
}

// ============================================================================
// Record types (DB layer — includes PII fields)
// ============================================================================

export type InquiryRecord = {
  id: string;
  organizationId: string;
  businessUnitHint: BusinessUnitNameValue | null;
  source: InquirySourceValue;
  externalRef: string | null;
  subject: InquirySubjectValue;
  guestCount: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactAddress: string | null;
  rawMessage: string | null;
  preferredDate: Date | null;
  preferredLocationId: string | null;
  preferredExternalCatalogEntryId: string | null;
  status: InquiryStatusValue;
  assignedToUserId: string | null;
  routingRuleId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InquiryRoutingRuleRecord = {
  id: string;
  organizationId: string;
  businessUnitHint: BusinessUnitNameValue;
  priority: number;
  matchKeywords: string[];
  matchSubjectTypes: InquirySubjectValue[];
  matchGuestCountMin: number | null;
  matchGuestCountMax: number | null;
  isActive: boolean;
  description: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// DTOs (API layer — PII-sanitized)
// ============================================================================

export type InquiryListItem = {
  id: string;
  organizationId: string;
  businessUnitHint: BusinessUnitNameValue | null;
  source: InquirySourceValue;
  subject: InquirySubjectValue;
  guestCount: number | null;
  preferredDate: string | null;
  status: InquiryStatusValue;
  assignedToUserId: string | null;
  // PII indicators (ADR-0021 §5)
  hasRawMessage: boolean;
  hasContactEmail: boolean;
  hasContactPhone: boolean;
  contactNameInitials: string;
  routingRuleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InquiryDetailHeader = InquiryListItem & {
  externalRef: string | null;
  preferredLocationId: string | null;
  preferredExternalCatalogEntryId: string | null;
};

export type ClassificationResult = {
  matchedRuleId: string | null;
  businessUnitHint: BusinessUnitNameValue | null;
  confidence: number;
  matchedKeywords: string[];
};

export type InquiryRoutingRuleDto = {
  id: string;
  organizationId: string;
  businessUnitHint: BusinessUnitNameValue;
  priority: number;
  matchKeywords: string[];
  matchSubjectTypes: InquirySubjectValue[];
  matchGuestCountMin: number | null;
  matchGuestCountMax: number | null;
  isActive: boolean;
  description: string | null;
};

// ============================================================================
// Database client interface
// ============================================================================

export type InquiryDatabaseClient = {
  inquiry: {
    findMany: (args: {
      where: {
        organizationId: string;
        status?: InquiryStatusValue;
        businessUnitHint?: BusinessUnitNameValue;
        source?: InquirySourceValue;
        createdAt?: { gte?: Date; lte?: Date };
      };
      orderBy?: Array<Record<string, "asc" | "desc">>;
      take?: number;
      skip?: number;
    }) => Promise<InquiryRecord[]>;
    findFirst: (args: {
      where: { id: string; organizationId: string };
    }) => Promise<InquiryRecord | null>;
  };
  inquiryRoutingRule: {
    findMany: (args: {
      where: { organizationId: string; isActive: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }) => Promise<InquiryRoutingRuleRecord[]>;
  };
  inquiryClassificationAudit: {
    create: (args: {
      data: {
        id: string;
        inquiryId?: string;
        matchedRuleId: string | null;
        matchedKeywords: string[];
        confidence: number;
        businessUnitHint: BusinessUnitNameValue | null;
        callerUserId?: string;
      };
    }) => Promise<{ id: string }>;
    findMany: (args: {
      where: { inquiryId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }) => Promise<ClassificationAuditRow[]>;
  };
};

export type ClassificationAuditRow = {
  id: string;
  inquiryId: string | null;
  matchedRuleId: string | null;
  matchedKeywords: string[];
  confidence: number;
  businessUnitHint: BusinessUnitNameValue | null;
  callerUserId: string | null;
  createdAt: Date;
};

// ============================================================================
// Service port
// ============================================================================

export type InquiryListFilters = {
  status?: InquiryStatusValue;
  businessUnitHint?: BusinessUnitNameValue;
  source?: InquirySourceValue;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type ClassificationAuditEntry = {
  id: string;
  inquiryId: string | null;
  matchedRuleId: string | null;
  matchedKeywords: string[];
  confidence: number;
  businessUnitHint: BusinessUnitNameValue | null;
  callerUserId: string | null;
  createdAt: string;
};

export type InquiryServicePort = {
  listInquiries: (
    actor: Actor,
    filters?: InquiryListFilters
  ) => Promise<InquiryListItem[]>;
  getInquiry: (actor: Actor, id: string) => Promise<InquiryDetailHeader | null>;
  classifyInquiry: (
    actor: Actor,
    input: {
      rawMessage?: string;
      subject?: InquirySubjectValue;
      guestCount?: number;
      inquiryId?: string;
      commitAudit?: boolean;
    }
  ) => Promise<ClassificationResult>;
  listClassificationAudit: (
    actor: Actor,
    inquiryId: string
  ) => Promise<ClassificationAuditEntry[]>;
};
