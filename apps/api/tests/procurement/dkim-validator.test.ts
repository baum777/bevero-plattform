import { describe, expect, it } from "vitest";

import { DkimValidator } from "../../src/modules/procurement/dkim-validator.js";
import type { RawEmail } from "../../src/modules/procurement/mail.types.js";

const validator = new DkimValidator({ trustedSenderDomains: ["foodnotify.com"] });

function email(overrides: Partial<RawEmail>): RawEmail {
  return {
    messageId: "<m@foodnotify.com>",
    from: "noreply@foodnotify.com",
    subject: "Bestellung",
    receivedAt: new Date(),
    text: "",
    ...overrides
  };
}

describe("DkimValidator (MVP domain check)", () => {
  it("passes when the DKIM-Signature d= tag is a trusted domain", () => {
    expect(
      validator.validate(
        email({
          from: "spoofed@evil.example",
          dkimSignature: "v=1; a=rsa-sha256; d=foodnotify.com; s=sel; b=abc"
        })
      )
    ).toBe(true);
  });

  it("rejects when the signature domain is untrusted even if From looks fine", () => {
    expect(
      validator.validate(
        email({
          from: "noreply@foodnotify.com",
          dkimSignature: "v=1; d=evil.example; s=sel; b=abc"
        })
      )
    ).toBe(false);
  });

  it("falls back to the From domain when no signature is present", () => {
    expect(validator.validate(email({ from: "orders@foodnotify.com" }))).toBe(true);
    expect(validator.validate(email({ from: "orders@evil.example" }))).toBe(false);
  });

  it("accepts a trusted subdomain", () => {
    expect(
      validator.validate(email({ dkimSignature: "d=mail.foodnotify.com; s=sel; b=x" }))
    ).toBe(true);
  });

  it("uses Received headers as a last resort", () => {
    expect(
      validator.validate(
        email({
          from: "relay@unknown.example",
          receivedHeaders: ["from mx1.foodnotify.com (mx1.foodnotify.com [1.2.3.4])"]
        })
      )
    ).toBe(true);
  });

  it("denies everything when no trusted domains are configured", () => {
    const open = new DkimValidator({ trustedSenderDomains: [] });
    expect(open.validate(email({ from: "noreply@foodnotify.com" }))).toBe(false);
  });
});
