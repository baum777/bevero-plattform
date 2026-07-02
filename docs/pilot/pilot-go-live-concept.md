# Pilot Go-Live Konzept — Bevero Manual Mode

**Status:** Draft (2026-06-29)
**Pilot-Vehicle (entschieden 2026-06-29):** **Path A — Inventory-Korrektur → Freigabe (L2)**. Voll verkabelt, manual-mode-ready. Einkauf (L3) folgt nach PurchaseOrder-UI-Bau (Path B).
**Owner / Operator:** Cheikh (bis auf weiteres)
**Authority:** `IDENTITY.md` · `governance/approval-matrix.md`

---

## 1. Ziel des Pilot

Beweisen, dass die **Governance-Loop** end-to-end in der Cockpit-App funktioniert — **nicht** die Daten-Integration.

> Leitfrage: *Kann ein Mensch einen geprüften, freigegebenen Einkauf im OS abbilden — nachvollziehbar, mit Evidence und Audit-Trail?*

Der Pilot läuft im **Manual Mode**: Cockpit-App + Supabase + Demo-Seed, **ohne** externe Anbindungen (FoodNotify / Gastronovi / Dynamics / DATEV) und mit **simulierter** Execution (kein echter Lieferantenversand).

---

## 2. Pilot-Scope

| Dimension | Wert |
|---|---|
| Standort | Motorworld Inn Böblingen (in Supabase angelegt) |
| Workflow | **Inventory-Korrektur → Freigabe (L2)** — Path A |
| Verkabelung | `movements-client` → `POST /correction-requests` → `freigaben` → `POST /admin/correction-requests/:id/approve\|reject` |
| Modus | Manual (Seed-Daten), keine externen Anbindungen |
| Plattform | `bevero-ui` (deployed, live verifiziert) |
| Datenquelle | `apps/api/src/modules/inventory/demo-seed.{service,data}.ts` |

---

## 3. Rollen (Pilot)

Formalisiert in `governance/approval-matrix.md` → "Benannte Rollen (Pilot)":

| Rolle | Person | Funktion |
|---|---|---|
| `operator` | Cheikh (bis auf weiteres) | L3-Freigabe (Name + Timestamp) |
| `reviewer` | Pilot-Placeholder — Zweitperson / Demo-User-B (`reviewer ≠ author`) | Self-Review + Sign-off |
| `author` | ausführende Person pro Durchlauf | Draft-Erstellung |

**Hinweis:** Für einen echten Rollout auf weitere Standorte müssen `operator` und `reviewer` real benannt werden. Der Pilot ersetzt diese organisatorische Klärung nicht.

---

## 4. Readiness-Checkliste (vor Go-Live zu verifizieren)

**Verifiziert 2026-06-29 (Code/Config/Live-Check):**

- [x] **`bevero-ui` deployed & live** — `Observed`: webfetch liefert die Anmelden-Seite ("Operational precision for hospitality inventory teams"). Prod-Alias aktiv; SOT-`target:null`-Sorge obsolet.
- [x] **Evidence/Audit-Pfade vorhanden** — `logs/audit-log.md`, `logs/evidence/`, `logs/session-log.md` existieren.
- [ ] **Demo-User-Login auf `bevero-ui`** — *Runtime-Gate* (braucht Credentials/Browser; von hier nicht prüfbar).
- [ ] **Motorworld-Inn-Standort + Seed-Daten sichtbar** — *Runtime-Gate* (braucht Login).
- [ ] **Operator- + Reviewer-Rollen im RBAC** — *Runtime-Gate* (`settings/roles`, `settings/team` Pages vorhanden; Provisioning nicht von hier prüfbar).

### 4.1 Befund: kritischer Gap + Alternative

**`procurement → freigaben` für Einkaufsbestellung ist NICHT verkabelt wie angenommen:**

- `procurement`-Page = **"Wareneingang"** — zeigt **FoodNotify-importierte** Bestellbestätigungen (`listFoodNotifyPendingReceiptsForCurrentUser`). Im Manual Mode **leer** (FoodNotify-Connector fehlt). Nav-Label: "Einkauf (FoodNotify)".
- `freigaben`-Page = **CorrectionRequest**-Freigaben (Inventory-Korrekturen, L2), nicht Einkaufsbestell-Freigaben.
- **Backend PurchaseOrder-API existiert** (`POST /admin/purchase-orders` → `purchaseOrderService.create` + mark-ordered/cancel/list) — **aber Cockpit ruft sie 0× auf** (`rg` 0 Treffer).

→ **Einkaufsbestellung-Workflow hat keine Manual-Mode-Cockpit-UI.** Backend ✓, Frontend ✗. Der L3-Einkaufs-Pilot kann **nicht wie konzipiert** laufen.

**Voll verkabelte Governance-Loop (Alternative Pilot-Vehicle): Inventory-Korrektur → Freigabe (L2):**
- **Create**: `movements-client.tsx` → `POST /correction-requests` (Korrektur aus Buch/Entnahme); `kitchen/walk-route` ebenfalls.
- **List + Approve/Reject**: `freigaben`-Page + `freigaben-client.tsx` → `POST /admin/correction-requests/:id/approve|reject` (manager+).
- **Loop komplett**: Draft (Korrektur) → Freigaben-Queue → Manager-Approval → done. Funktioniert im Manual Mode (Inventory-Seed, kein FoodNotify nötig).
- Beweist dieselbe Governance-Mechanik (Draft → Approval-Gate → Evidence), nur auf L2 statt L3.

### 4.2 Zwei Pfade

- **Path A (Empfehlung — schnell):** Pilot-Vehicle auf **Inventory-Korrektur → Freigabe (L2)** umstellen. Manual-mode-ready jetzt. Beweist OS-Approval-Mechanik. Einkaufsbestellung (L3) folgt nach PO-UI-Bau.
- **Path B (Build — orig. Vision):** Manuelles PurchaseOrder-Draft-UI im Cockpit bauen (anbinden an bestehende `POST /admin/purchase-orders` + eigene Approval-Surface), dann L3-Einkaufs-Pilot.

---

## 5. Run-Plan (Pilot-Durchlauf — Path A: Korrektur → Freigabe)

```
1. SETUP (Runtime-Gate)        Auf bevero-ui als Manager einloggen; Motorworld-Inn-Daten sichtbar
2. TRIGGER                     Unter movements/withdrawal eine Bestandsabweichung simulieren (Seed-Kontext)
3. KORREKTUR-REQUEST (Draft)   movements-client → POST /correction-requests (Artikel + Menge + Begründung)
4. SELF-REVIEW                 Plausibilität: Menge + Begründung korrekt? (reviewer ≠ author)
5. FREIGABEN-QUEUE             Korrektur erscheint unter /freigaben als "open"
6. APPROVAL                    Manager (Cheikh) → POST /admin/correction-requests/:id/approve
                              (oder reject im Negativ-Durchlauf)
7. WIRKUNG                     Bei approve: InventoryMovement (correction_*) + Snapshot-Refresh (append-only, ADR-0007)
8. EVIDENCE                    logs/evidence/YYYY-MM-DD-korrektur-motorworld-inn-<slug>.md
9. AUDIT-LOG-EINTRAG           L2 | Inventory-Korrektur [Artikel] | approved | [evidence-link]
```

**2 Durchläufe:** (a) **happy path** → approve (beweist positive Loop + Stock-Wirkung); (b) **Negativ** → reject (beweist Abbruch ohne Mutation). Beide benötigen Evidence + Audit-Eintrag.

---

## 6. Go / No-Go-Kriterien

Der Pilot ist erfolgreich, wenn:

- Governance-Loop komplett + nachvollziehbar abgebildet
- Freigabe-Capture (Name + Timestamp) funktioniert
- Evidence-Artefakt + Audit-Log-Eintrag vorhanden
- Lernschleife dokumentiert (`logs/session-log.md`)

Er ist **nicht** erfolgreich, wenn er schnell aber ohne nachvollziehbaren Freigabe-Pfad ist.

---

## 7. Abgrenzung / Path-to-v1

| | Pilot (v0) | v1 |
|---|---|---|
| Daten | Manual / Seed | Live (Bevero + FoodNotify + Gastronovi) |
| Execution | Simuliert | Echter Lieferantenversand (L3+) |
| Standorte | Motorworld Inn | Weitere Brands/Standorte |
| Fokus | **Governance-Prozess** | Daten-Integration + Scale |

Der Manual-Pilot beweist den **Prozess**, nicht die **Integration**. Beides muss getrennt validiert werden.

---

## 8. Offen / Folgeslices

- **Track A — Produkt-/Positionierungs-Konzept:** Konsolidierung aus `IDENTITY.md`, `docs/VISION.md`, Landing-KAM-Onepager → Refresh `docs/RAUSCHENBERGER-OS-SUMMARY.md`.
- **Reviewer-Person** benennen (über Pilot-Placeholder hinaus).
- **Readiness-Verifikation** (Checkliste §4) ausführen — insbes. `bevero-ui` live-Status + `procurement→freigaben` Verkabelung.
- **`npm test`** (apps/api) grün/rot zur Evidence-Untermauerung.
