import type { Actor } from "../auth/actor.js";
import {
  EventInquiryError,
  type BeveragePackageDto,
  type BeveragePackageRecord,
  type EventInquiryDatabaseClient,
  type EventInquiryHeaderDto,
  type EventInquiryRecord,
  type EventInquiryServicePort,
  type EventPackageDetailDto,
  type EventPackageListItem,
  type EventPackageRecord,
} from "./event-inquiry.types.js";

export {
  EventInquiryError,
  type EventInquiryServicePort,
  type EventInquiryDatabaseClient,
} from "./event-inquiry.types.js";

// PII scrubbing (mirror ADR-0029-B sanitizePII pattern + ADR-0021 §5)
// Deterministic regex; no LLM. Applied on every inquiry read before returning DTO.
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_DE_PATTERN = /(\+49|0)[1-9][0-9 \-]{6,18}\d/g;
const PHONE_E164_PATTERN = /\+[1-9]\d{6,14}/g;
const POSTAL_DE_PATTERN = /(\d{5})\s+[A-ZÄÖÜ][a-zäöüß]+/g;
const STREET_DE_PATTERN = /\d+[a-z]?\s+[A-ZÄÖÜ][a-zäöüß]+(str\.|straße|weg|platz|allee)/g;

export function sanitizePII(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "<email>")
    .replace(PHONE_DE_PATTERN, "<phone>")
    .replace(PHONE_E164_PATTERN, "<phone>")
    .replace(POSTAL_DE_PATTERN, "<address>")
    .replace(STREET_DE_PATTERN, "<address>");
}

export class EventInquiryService implements EventInquiryServicePort {
  private readonly db: EventInquiryDatabaseClient;

  public constructor(options: { db: EventInquiryDatabaseClient }) {
    this.db = options.db;
  }

  public async listInquiries(actor: Actor): Promise<EventInquiryHeaderDto[]> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.eventInquiry.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: "desc" }]
    });
    return rows.map(toHeaderDto);
  }

  public async getInquiry(
    actor: Actor,
    id: string
  ): Promise<EventInquiryHeaderDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.eventInquiry.findFirst({
      where: { id, organizationId }
    });
    if (!row) {
      return null;
    }
    // RLS-Scope: if assignedToUserId is set, only that user may see the record.
    // The DB-layer policy enforces this for Supabase; the service layer mirrors
    // it deterministically for test coverage (ADR-0062 reserved).
    if (row.assignedToUserId !== null && row.assignedToUserId !== actor.userId) {
      return null;
    }
    return toHeaderDto(row);
  }

  public async listPackages(
    actor: Actor,
    unitId?: string
  ): Promise<EventPackageListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const where: Parameters<EventInquiryDatabaseClient["eventPackage"]["findMany"]>[0]["where"] = {
      organizationId,
      isActive: true
    };
    if (unitId) {
      where.operationalUnitId = unitId;
    }
    const rows = await this.db.eventPackage.findMany({
      where,
      orderBy: [{ name: "asc" }]
    });
    return rows.map(toEventPackageListItem);
  }

  public async getPackage(
    actor: Actor,
    id: string
  ): Promise<EventPackageDetailDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.eventPackage.findFirst({
      where: { id, organizationId }
    });
    if (!row) {
      return null;
    }
    return toEventPackageDetailDto(row);
  }

  public async listBeveragePackages(actor: Actor): Promise<BeveragePackageDto[]> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.beveragePackage.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ name: "asc" }]
    });
    return rows.map(toBeveragePackageDto);
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new EventInquiryError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

// PII-safe header DTO: never includes rawMessage, contactEmail, contactPhone
function toHeaderDto(record: EventInquiryRecord): EventInquiryHeaderDto {
  return {
    id: record.id,
    operationalUnitId: record.operationalUnitId,
    source: record.source,
    subject: record.subject,
    guestCount: record.guestCount,
    preferredDate: record.preferredDate ? record.preferredDate.toISOString() : null,
    preferredAreas: [...record.preferredAreas],
    status: record.status,
    assignedToUserId: record.assignedToUserId,
    confirmationEmailSentAt: record.confirmationEmailSentAt
      ? record.confirmationEmailSentAt.toISOString()
      : null,
    confirmationExpectedWithinMinutes: record.confirmationExpectedWithinMinutes,
    confirmationReminderSentAt: record.confirmationReminderSentAt
      ? record.confirmationReminderSentAt.toISOString()
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toEventPackageListItem(record: EventPackageRecord): EventPackageListItem {
  return {
    id: record.id,
    operationalUnitId: record.operationalUnitId,
    name: record.name,
    courseCount: record.courseCount,
    pricePerPersonCents: record.pricePerPersonCents,
    priceMode: record.priceMode,
    scope: record.scope,
    orderMode: record.orderMode,
    requiredLeadTimeDays: record.requiredLeadTimeDays,
    paymentMode: record.paymentMode,
    cancellationPolicy: record.cancellationPolicy,
    windowSeat: record.windowSeat,
    includedItems: [...record.includedItems],
    addOns: [...record.addOns],
    defaultGuestCount: record.defaultGuestCount,
    validFrom: record.validFrom ? record.validFrom.toISOString() : null,
    validUntil: record.validUntil ? record.validUntil.toISOString() : null,
    isActive: record.isActive
  };
}

function toEventPackageDetailDto(record: EventPackageRecord): EventPackageDetailDto {
  return {
    ...toEventPackageListItem(record),
    organizationId: record.organizationId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toBeveragePackageDto(record: BeveragePackageRecord): BeveragePackageDto {
  return {
    id: record.id,
    name: record.name,
    durationHours: record.durationHours,
    durationHoursMin: record.durationHoursMin,
    durationHoursMax: record.durationHoursMax,
    includedCategories: [...record.includedCategories],
    pricePerPersonCents: record.pricePerPersonCents,
    serviceIncluded: record.serviceIncluded,
    isActive: record.isActive,
    isKidsPackage: record.isKidsPackage,
    childAgeMin: record.childAgeMin,
    childAgeMax: record.childAgeMax,
    under5Free: record.under5Free,
    eventPhaseFactor: record.eventPhaseFactor
  };
}
