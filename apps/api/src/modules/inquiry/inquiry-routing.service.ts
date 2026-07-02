import { randomUUID } from "node:crypto";

import type {
  BusinessUnitNameValue,
  ClassificationResult,
  InquiryDatabaseClient,
  InquiryRoutingRuleRecord,
  InquirySubjectValue,
} from "./inquiry.types.js";

export type RoutingInput = {
  rawMessage?: string;
  subject?: InquirySubjectValue;
  guestCount?: number;
  inquiryId?: string;
  callerUserId?: string;
  writeAudit?: boolean;
};

export class InquiryRoutingService {
  private readonly db: InquiryDatabaseClient;

  public constructor(options: { db: InquiryDatabaseClient }) {
    this.db = options.db;
  }

  public async classifyInquiry(
    organizationId: string,
    input: RoutingInput
  ): Promise<ClassificationResult> {
    const rules = await this.db.inquiryRoutingRule.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ priority: "asc" }]
    });

    const normalizedText = normalize(
      (input.rawMessage ?? "") + " " + (input.subject ?? "")
    );

    const shouldWriteAudit = input.writeAudit !== false;

    for (const rule of rules) {
      const matchedKeywords = findMatchedKeywords(rule, normalizedText);
      const subjectMatch =
        rule.matchSubjectTypes.length > 0 &&
        input.subject !== undefined &&
        rule.matchSubjectTypes.includes(input.subject);
      const guestMatch = guestCountInRange(rule, input.guestCount);

      if ((matchedKeywords.length > 0 || subjectMatch) && guestMatch) {
        const confidence = computeConfidence(
          matchedKeywords,
          subjectMatch,
          guestMatch,
          rule,
          input.guestCount
        );

        if (shouldWriteAudit) {
          await this.writeAudit({
            inquiryId: input.inquiryId,
            matchedRuleId: rule.id,
            matchedKeywords,
            confidence,
            businessUnitHint: rule.businessUnitHint,
            callerUserId: input.callerUserId
          });
        }

        return {
          matchedRuleId: rule.id,
          businessUnitHint: rule.businessUnitHint,
          confidence,
          matchedKeywords
        };
      }
    }

    if (shouldWriteAudit) {
      await this.writeAudit({
        inquiryId: input.inquiryId,
        matchedRuleId: null,
        matchedKeywords: [],
        confidence: 0,
        businessUnitHint: null,
        callerUserId: input.callerUserId
      });
    }

    return {
      matchedRuleId: null,
      businessUnitHint: null,
      confidence: 0,
      matchedKeywords: []
    };
  }

  private async writeAudit(entry: {
    inquiryId?: string;
    matchedRuleId: string | null;
    matchedKeywords: string[];
    confidence: number;
    businessUnitHint: BusinessUnitNameValue | null;
    callerUserId?: string;
  }): Promise<void> {
    await this.db.inquiryClassificationAudit.create({
      data: {
        id: randomUUID(),
        inquiryId: entry.inquiryId,
        matchedRuleId: entry.matchedRuleId,
        matchedKeywords: entry.matchedKeywords,
        confidence: entry.confidence,
        businessUnitHint: entry.businessUnitHint,
        callerUserId: entry.callerUserId,
      },
    });
  }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss");
}

function findMatchedKeywords(
  rule: InquiryRoutingRuleRecord,
  normalizedText: string
): string[] {
  return rule.matchKeywords.filter((kw) => normalizedText.includes(normalize(kw)));
}

function guestCountInRange(
  rule: InquiryRoutingRuleRecord,
  guestCount: number | undefined
): boolean {
  if (rule.matchGuestCountMin === null && rule.matchGuestCountMax === null) {
    return true;
  }
  if (guestCount === undefined) {
    // Range guard active but no guest count provided — skip range guard
    return rule.matchGuestCountMin === null && rule.matchGuestCountMax === null;
  }
  const minOk = rule.matchGuestCountMin === null || guestCount >= rule.matchGuestCountMin;
  const maxOk = rule.matchGuestCountMax === null || guestCount <= rule.matchGuestCountMax;
  return minOk && maxOk;
}

function computeConfidence(
  matchedKeywords: string[],
  subjectMatch: boolean,
  guestMatch: boolean,
  rule: InquiryRoutingRuleRecord,
  guestCount: number | undefined
): number {
  const base = matchedKeywords.length > 0 ? 60 : 0;
  const subjectBonus = subjectMatch ? 25 : 0;
  const hasRangeGuard =
    rule.matchGuestCountMin !== null || rule.matchGuestCountMax !== null;
  const guestBonus = hasRangeGuard && guestMatch && guestCount !== undefined ? 15 : 0;
  return Math.min(100, base + subjectBonus + guestBonus);
}
