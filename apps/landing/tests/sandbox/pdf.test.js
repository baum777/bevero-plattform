import { expect, test, vi } from "vitest";

import { buildShiftHandoverPdf } from "../../src/sandbox/pdf.js";

test("creates a watermarked handover PDF with both confirmations", async () => {
  const calls = [];
  class FakePdf {
    text(...args) { calls.push(["text", ...args]); }
    setFontSize(...args) { calls.push(["font", ...args]); }
    setTextColor(...args) { calls.push(["color", ...args]); }
    save(...args) { calls.push(["save", ...args]); }
    addImage(...args) { calls.push(["image", ...args]); }
  }

  const result = await buildShiftHandoverPdf({
    shiftType: "Frühschicht",
    areaName: "Bar",
    outgoingName: "Mara König",
    incomingName: "Jonas Becker",
    outgoingSignature: "typed:Mara König",
    incomingSignature: "typed:Jonas Becker",
    note: "Kühlung prüfen",
    checklist: [
      { label: "Kühltemperaturen geprüft", status: "done" },
    ],
  }, { JsPDF: FakePdf, now: new Date("2026-07-04T08:00:00Z") });

  const text = calls.filter(([type]) => type === "text").flat().join(" ");
  expect(text).toContain("DEMO – keine produktive Buchung/Freigabe");
  expect(text).toContain("Mara König");
  expect(text).toContain("Jonas Becker");
  expect(calls).toContainEqual(["save", "bevero-demo-schichtuebergabe.pdf"]);
  expect(result).toEqual({ ok: true, error: null });
});

test("reports PDF failures without throwing", async () => {
  class BrokenPdf {
    constructor() { throw new Error("broken"); }
  }
  await expect(buildShiftHandoverPdf({}, { JsPDF: BrokenPdf })).resolves.toEqual({
    ok: false,
    error: "Das Demo-PDF konnte nicht erstellt werden.",
  });
});
