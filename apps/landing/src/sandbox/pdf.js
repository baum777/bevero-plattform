export async function buildShiftHandoverPdf(snapshot, options = {}) {
  try {
    const JsPDF = options.JsPDF ?? (await import("jspdf")).jsPDF;
    const now = options.now ?? new Date();
    const doc = new JsPDF({ unit: "mm", format: "a4" });

    doc.setTextColor(20, 107, 63);
    doc.setFontSize(10);
    doc.text("BEVERO OPS", 18, 16);
    doc.setTextColor(152, 67, 49);
    doc.text("DEMO – keine produktive Buchung/Freigabe", 105, 16, { align: "center" });
    doc.setTextColor(29, 37, 33);
    doc.setFontSize(20);
    doc.text("Schichtübergabe", 18, 30);
    doc.setFontSize(10);
    doc.text(`Erstellt: ${now.toLocaleString("de-DE")}`, 18, 38);
    doc.text(`Schicht: ${snapshot.shiftType ?? "–"}`, 18, 46);
    doc.text(`Bereich: ${snapshot.areaName ?? "–"}`, 18, 52);

    doc.setFontSize(13);
    doc.text("Checkliste", 18, 66);
    doc.setFontSize(10);
    let y = 74;
    for (const item of snapshot.checklist ?? []) {
      doc.text(`${item.status === "done" ? "[x]" : "[n/a]"} ${item.label}`, 20, y);
      y += 7;
    }

    doc.setFontSize(13);
    doc.text("Notiz", 18, y + 5);
    doc.setFontSize(10);
    doc.text(snapshot.note?.trim() || "Keine offene Notiz", 18, y + 13, { maxWidth: 170 });
    y += 28;

    doc.setFontSize(13);
    doc.text("Demo-Bestätigungen", 18, y);
    doc.setFontSize(10);
    const confirmations = [
      ["Abgebende Schicht", snapshot.outgoingName, snapshot.outgoingSignature],
      ["Übernehmende Schicht", snapshot.incomingName, snapshot.incomingSignature],
    ];
    for (const [label, name, signature] of confirmations) {
      y += 10;
      doc.text(`${label}: ${name || "–"}`, 18, y);
      if (signature?.startsWith("data:image")) {
        doc.addImage(signature, "PNG", 18, y + 3, 55, 18);
        y += 21;
      } else {
        doc.text(`Bestätigt als ${String(signature ?? "").replace("typed:", "") || name || "–"}`, 18, y + 7);
        y += 10;
      }
    }

    doc.setTextColor(103, 95, 85);
    doc.text("Diese Datei dokumentiert ausschließlich eine lokale Produktdemo.", 18, 285);
    doc.save("bevero-demo-schichtuebergabe.pdf");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Das Demo-PDF konnte nicht erstellt werden." };
  }
}
