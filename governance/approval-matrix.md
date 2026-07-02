# Approval Matrix — Rauschenberger OS

Autorität: [`IDENTITY.md`](../IDENTITY.md)

---

## Matrix

| Stufe | Gastronomie-Beispiele | Approval-Pfad | Blockiert bis |
|---|---|---|---|
| **L0** | Menü-Entwurf, Analyse, Auswertung | — | Sofort frei |
| **L1** | Schichtnotiz, Checkliste, interne Zusammenfassung | Self-Review | Checkliste bestanden |
| **L2** | Bestellung anpassen, Sollmenge ändern, Event-Kalkulation | Reviewer + Evidence | Tests/Checks grün + Evidence-Artefakt + Reviewer-Sign-off |
| **L3** | Lieferantenbestellung, externe Kommunikation | Operator + Reviewer + Evidence | Explizite Operator-Freigabe (Name + Timestamp) |
| **L4** | Zahlungen, Verträge, Kundendaten-Export | Operator + 2× Reviewer + vollständige Evidence | Immer blockiert bis vollständige mehrstufige Freigabe |

---

## Rollen

| Rolle | Beschreibung |
|---|---|
| `operator` | Führung / Bereichsleiter — finale Entscheidungshoheit |
| `reviewer` | Zweite Partei — nicht der Autor der Aktion |
| `governance` | Das OS selbst: Regel- und Evidence-Check |
| `author` | Agent oder Person, die die Aktion erstellt hat |

---

## Eskalation

Wenn unklar welche Stufe gilt:
1. Höhere Stufe wählen
2. Frage in `logs/session-log.md` dokumentieren
3. Operator informieren — keine Annahmen treffen

---

## Benannte Rollen (Pilot — Manual Mode)

Gültig für den Pilot **Inventory-Korrektur → Freigabe (L2, Path A)** am Standort Motorworld Inn Böblingen (Stand 2026-06-29). Siehe `docs/pilot/pilot-go-live-concept.md`.

| Rolle | Person | Funktion |
|---|---|---|
| `operator` / Manager | Cheikh (bis auf weiteres) | L2-Approval (Korrektur-Freigabe); künftig L3-Einkauf |
| `reviewer` | Pilot-Placeholder — Zweitperson / Demo-User-B (`reviewer ≠ author`) | Self-Review + Sign-off |
| `author` | ausführende Person pro Durchlauf | Draft (Korrektur-Request) |

**Hinweis:** Der Pilot läuft im Manual Mode (App + Supabase + Seed-Daten, keine externen Anbindungen, Execution simuliert). Für einen Rollout auf weitere Standorte müssen `operator` und `reviewer` real benannt werden.
