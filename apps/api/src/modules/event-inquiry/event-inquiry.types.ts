import type {
  EventInquirySubject,
  EventInquiryStatus,
  BeveragePackageName,
  EventPackageOrderMode,
} from "@prisma/client";
import type { Actor } from "../auth/actor.js";

export {
  EventInquirySubject,
  EventInquiryStatus,
  BeveragePackageName,
  EventPackageOrderMode,
};

export type EventInquirySubjectValue =
  (typeof EventInquirySubject)[keyof typeof EventInquirySubject];
export type EventInquiryStatusValue =
  (typeof EventInquiryStatus)[keyof typeof EventInquiryStatus];
export type BeveragePackageNameValue =
  (typeof BeveragePackageName)[keyof typeof BeveragePackageName];
export type EventPackageOrderModeValue =
  (typeof EventPackageOrderMode)[keyof typeof EventPackageOrderMode];

export class EventInquiryError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 422;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 422) {
    super(message);
    this.name = "EventInquiryError";
    this.statusCode = statusCode;
  }
}

// ============================================================================
// Record types (Prisma row shapes — include PII fields for DB layer only)
// ============================================================================

export type EventInquiryRecord = {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  source: string;
  subject: EventInquirySubjectValue;
  guestCount: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  rawMessage: string | null;
  preferredDate: Date | null;
  preferredAreas: string[];
  status: EventInquiryStatusValue;
  assignedToUserId: string | null;
  confirmationEmailSentAt: Date | null;
  confirmationExpectedWithinMinutes: number;
  confirmationReminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BeveragePackageRecord = {
  id: string;
  organizationId: string;
  name: BeveragePackageNameValue;
  durationHours: number;
  durationHoursMin: number;
  durationHoursMax: number;
  includedCategories: string[];
  pricePerPersonCents: number | null;
  serviceIncluded: boolean;
  isActive: boolean;
  isKidsPackage: boolean;
  childAgeMin: number | null;
  childAgeMax: number | null;
  under5Free: boolean;
  eventPhaseFactor: number;
  createdAt: Date;
  updatedAt: Date;
};

export type EventPackageRecord = {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  name: string;
  courseCount: number | null;
  pricePerPersonCents: number | null;
  priceMode: string;
  scope: string;
  orderMode: EventPackageOrderModeValue;
  requiredLeadTimeDays: number;
  paymentMode: string;
  cancellationPolicy: string;
  windowSeat: string;
  includedItems: string[];
  addOns: string[];
  defaultGuestCount: number;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// DTOs — PII fields (rawMessage, contactEmail, contactPhone) are NEVER exposed
// ============================================================================

// Header DTO: safe fields only (00a §8 + ADR-0021 §5)
export type EventInquiryHeaderDto = {
  id: string;
  operationalUnitId: string;
  source: string;
  subject: EventInquirySubjectValue;
  guestCount: number;
  preferredDate: string | null;
  preferredAreas: string[];
  status: EventInquiryStatusValue;
  assignedToUserId: string | null;
  confirmationEmailSentAt: string | null;
  confirmationExpectedWithinMinutes: number;
  confirmationReminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BeveragePackageDto = {
  id: string;
  name: BeveragePackageNameValue;
  durationHours: number;
  durationHoursMin: number;
  durationHoursMax: number;
  includedCategories: string[];
  pricePerPersonCents: number | null;
  serviceIncluded: boolean;
  isActive: boolean;
  isKidsPackage: boolean;
  childAgeMin: number | null;
  childAgeMax: number | null;
  under5Free: boolean;
  eventPhaseFactor: number;
};

export type EventPackageListItem = {
  id: string;
  operationalUnitId: string;
  name: string;
  courseCount: number | null;
  pricePerPersonCents: number | null;
  priceMode: string;
  scope: string;
  orderMode: EventPackageOrderModeValue;
  requiredLeadTimeDays: number;
  paymentMode: string;
  cancellationPolicy: string;
  windowSeat: string;
  includedItems: string[];
  addOns: string[];
  defaultGuestCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
};

export type EventPackageDetailDto = EventPackageListItem & {
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Service port + database client
// ============================================================================

export type EventInquiryDatabaseClient = {
  eventInquiry: {
    findMany(args: {
      where: {
        organizationId: string;
        status?: EventInquiryStatusValue;
      };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<EventInquiryRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<EventInquiryRecord | null>;
  };
  eventPackage: {
    findMany(args: {
      where: { organizationId: string; isActive?: boolean; operationalUnitId?: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<EventPackageRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<EventPackageRecord | null>;
  };
  beveragePackage: {
    findMany(args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<BeveragePackageRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<BeveragePackageRecord | null>;
  };
};

export type EventInquiryServicePort = {
  listInquiries(actor: Actor): Promise<EventInquiryHeaderDto[]>;
  getInquiry(actor: Actor, id: string): Promise<EventInquiryHeaderDto | null>;
  listPackages(actor: Actor, unitId?: string): Promise<EventPackageListItem[]>;
  getPackage(actor: Actor, id: string): Promise<EventPackageDetailDto | null>;
  listBeveragePackages(actor: Actor): Promise<BeveragePackageDto[]>;
};
