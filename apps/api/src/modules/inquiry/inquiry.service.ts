import type { Actor } from "../auth/actor.js";
import { InquiryRoutingService } from "./inquiry-routing.service.js";
import {
  InquiryError,
  type BusinessUnitNameValue,
  type ClassificationAuditEntry,
  type ClassificationResult,
  type InquiryDatabaseClient,
  type InquiryDetailHeader,
  type InquiryListFilters,
  type InquiryListItem,
  type InquiryRecord,
  type InquiryServicePort,
  type InquirySourceValue,
  type InquiryStatusValue,
  type InquirySubjectValue,
} from "./inquiry.types.js";
import { derivePiiIndicators } from "../../lib/pii-sanitizer.js";

export {
  InquiryError,
  type InquiryServicePort,
  type InquiryDatabaseClient,
} from "./inquiry.types.js";

export class InquiryService implements InquiryServicePort {
  private readonly db: InquiryDatabaseClient;
  private readonly routing: InquiryRoutingService;

  public constructor(options: { db: InquiryDatabaseClient }) {
    this.db = options.db;
    this.routing = new InquiryRoutingService({ db: options.db });
  }

  public async listInquiries(
    actor: Actor,
    filters?: InquiryListFilters
  ): Promise<InquiryListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const createdAt = buildDateRange(filters?.dateFrom, filters?.dateTo);
    const rows = await this.db.inquiry.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.businessUnitHint ? { businessUnitHint: filters.businessUnitHint } : {}),
        ...(filters?.source ? { source: filters.source } : {}),
        ...(createdAt ? { createdAt } : {})
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(filters?.limit ?? 50, 100),
      skip: filters?.offset ?? 0
    });
    return rows.map(toListItem);
  }

  public async getInquiry(
    actor: Actor,
    id: string
  ): Promise<InquiryDetailHeader | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.inquiry.findFirst({
      where: { id, organizationId }
    });
    if (!row) return null;
    return toDetailHeader(row);
  }

  public async classifyInquiry(
    actor: Actor,
    input: {
      rawMessage?: string;
      subject?: InquirySubjectValue;
      guestCount?: number;
      inquiryId?: string;
      commitAudit?: boolean;
    }
  ): Promise<ClassificationResult> {
    const organizationId = requireOrganizationId(actor);
    return this.routing.classifyInquiry(organizationId, {
      rawMessage: input.rawMessage,
      subject: input.subject,
      guestCount: input.guestCount,
      inquiryId: input.inquiryId,
      callerUserId: actor.userId,
      writeAudit: input.commitAudit !== false
    });
  }

  public async listClassificationAudit(
    actor: Actor,
    inquiryId: string
  ): Promise<ClassificationAuditEntry[]> {
    const organizationId = requireOrganizationId(actor);
    const inquiry = await this.db.inquiry.findFirst({
      where: { id: inquiryId, organizationId }
    });
    if (!inquiry) {
      throw new InquiryError("inquiry not found", 404);
    }
    const rows = await this.db.inquiryClassificationAudit.findMany({
      where: { inquiryId },
      orderBy: [{ createdAt: "desc" }]
    });
    return rows.map((r) => ({
      id: r.id,
      inquiryId: r.inquiryId,
      matchedRuleId: r.matchedRuleId,
      matchedKeywords: [...r.matchedKeywords],
      confidence: r.confidence,
      businessUnitHint: r.businessUnitHint,
      callerUserId: r.callerUserId,
      createdAt: r.createdAt.toISOString()
    }));
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new InquiryError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

function buildDateRange(
  dateFrom?: string,
  dateTo?: string
): { gte?: Date; lte?: Date } | undefined {
  if (!dateFrom && !dateTo) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (dateFrom) {
    const d = new Date(dateFrom);
    if (Number.isNaN(d.getTime())) {
      throw new InquiryError("dateFrom is not a valid ISO date", 400);
    }
    range.gte = d;
  }
  if (dateTo) {
    const d = new Date(dateTo);
    if (Number.isNaN(d.getTime())) {
      throw new InquiryError("dateTo is not a valid ISO date", 400);
    }
    range.lte = d;
  }
  return range;
}

function toListItem(r: InquiryRecord): InquiryListItem {
  return {
    id: r.id,
    organizationId: r.organizationId,
    businessUnitHint: r.businessUnitHint,
    source: r.source,
    subject: r.subject,
    guestCount: r.guestCount,
    preferredDate: r.preferredDate ? r.preferredDate.toISOString() : null,
    status: r.status,
    assignedToUserId: r.assignedToUserId,
    ...derivePiiIndicators(r),
    routingRuleId: r.routingRuleId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  };
}

function toDetailHeader(r: InquiryRecord): InquiryDetailHeader {
  return {
    ...toListItem(r),
    externalRef: r.externalRef,
    preferredLocationId: r.preferredLocationId,
    preferredExternalCatalogEntryId: r.preferredExternalCatalogEntryId
  };
}
