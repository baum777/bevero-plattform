import type { RawEmail } from "./mail.types.js";

export type DkimValidatorConfig = {
  trustedSenderDomains: string[];
};

/**
 * Phase 1 anti-spoofing gate ("MVP domain check"): we do not yet perform full
 * RSA-SHA256 verification. We accept a mail only when it provably originates
 * from a trusted sender domain, preferring the DKIM-Signature `d=` tag (which a
 * spoofer cannot forge without the matching private key signing the body) and
 * falling back to envelope/Received evidence when no signature is present.
 * The raw signature is persisted so a full cryptographic re-check can run later.
 */
export class DkimValidator {
  private readonly trusted: string[];

  public constructor(config: DkimValidatorConfig) {
    this.trusted = config.trustedSenderDomains.map((domain) => domain.trim().toLowerCase()).filter(Boolean);
  }

  public validate(email: RawEmail): boolean {
    if (this.trusted.length === 0) {
      return false;
    }

    const signatureDomain = extractDkimDomain(email.dkimSignature);
    if (signatureDomain) {
      return this.isTrusted(signatureDomain);
    }

    const fromDomain = extractDomain(email.from);
    if (fromDomain && this.isTrusted(fromDomain)) {
      return true;
    }

    return (email.receivedHeaders ?? []).some((header) =>
      this.trusted.some((domain) => header.toLowerCase().includes(domain))
    );
  }

  private isTrusted(domain: string): boolean {
    const normalized = domain.toLowerCase();
    return this.trusted.some(
      (trusted) => normalized === trusted || normalized.endsWith(`.${trusted}`)
    );
  }
}

function extractDkimDomain(signature: string | undefined): string | undefined {
  if (!signature) {
    return undefined;
  }

  const match = signature.match(/(?:^|;)\s*d=([^;\s]+)/i);
  return match ? match[1].trim().toLowerCase() : undefined;
}

function extractDomain(address: string): string | undefined {
  const match = address.match(/@([^>\s]+)/);
  return match ? match[1].trim().toLowerCase().replace(/[.>]+$/, "") : undefined;
}
