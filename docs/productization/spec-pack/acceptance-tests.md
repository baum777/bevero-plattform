# acceptance-tests.md

## Legende

- **Format:** Gegeben / Wenn / Dann. Kein Code; jedes Szenario ist manuell oder automatisiert prüfbar.
- **Markierungen:**
  - `[ENTSCHEIDUNG NÖTIG]` — Test ist formuliert, aber das erwartete Verhalten braucht vor Implementierung eine Produktentscheidung.
  - `[PILOTGERÄT]` — nur auf echten Pilotgeräten/vor Ort ehrlich prüfbar (Funkloch, Kamera, nasse Hände).
  - `[DSGVO/BV]` — datenschutz- oder betriebsvereinbarungsrelevant (Personenbezug, Leistungskontrolle, Fremd-PII).
- Rollen und Begriffe wie im Spec Pack. „Schichtgerät" = geteiltes Gerät mit PIN-Wechsel.

---

## Prozess 1 — Warenannahme (ohne Abweichung)

**WA-01 Happy Path**
Gegeben eine angemeldete Person mit Rolle Lager/Warenannahme und ein Lieferant A im Stamm.
Wenn sie eine Warenannahme mit 3 Positionen (Artikel, Menge, Ziellagerort) erfasst und abschließt.
Dann ist der Vorgang im Zustand *Erfasst*, es existieren genau 3 Bewegungen in die Ziellagerorte, und die Historie der Lagerorte zeigt sie mit Person und Zeit.

**WA-02 Falsche Rolle**
Gegeben eine angemeldete Person mit Rolle Bar/Service.
Wenn sie versucht, eine Warenannahme anzulegen.
Dann wird die Aktion verweigert, die Funktion ist in ihrer Sicht nicht angeboten, und es entsteht **kein** Vorgang.

**WA-03 Abbruchfall**
Gegeben eine begonnene Warenannahme mit 2 von 5 Positionen im Zustand *Entwurf*.
Wenn das Gerät 20 Minuten unbenutzt liegt (automatische Abmeldung greift) und die Person sich neu anmeldet.
Dann ist der Entwurf unverändert vorhanden und fortsetzbar; es wurden keine Bewegungen erzeugt.

**WA-04 Korrekturfall (nachträglich)**
Gegeben eine abgeschlossene Warenannahme mit einer falsch erfassten Menge.
Wenn die Schichtleitung eine Korrektur mit Bezug auf den Vorgang beantragt und die Betriebsleitung freigibt.
Dann bleibt der Originalvorgang unverändert, die Korrektur ist als verknüpfter Eintrag sichtbar, und der rechnerische Bestand stimmt.

**WA-05 Audit-Erwartung**
Gegeben WA-01 wurde durchgeführt.
Wenn die Betriebsleitung den Audit-Trail des Vorgangs öffnet.
Dann existieren Events für Anlegen, jede Position und Abschluss — jeweils mit Person, Gerätekennung, Zeitstempel; kein Event ist editierbar oder löschbar.

**WA-06 Mobiler Kontext** `[PILOTGERÄT]`
Gegeben ein Smartphone an der Rampe, Person trägt die Situation nach echter Anlieferung (Zeitdruck, ggf. feuchte Hände).
Wenn eine Annahme mit 10 Positionen erfasst wird.
Dann gelingt die Erfassung in unter 4 Minuten ohne Fehlbedienung, alle Touchziele sind ohne Präzisionsgriff treffbar.

**WA-07 Foto am Vorgang** (ab Slice 9) `[PILOTGERÄT]` `[DSGVO/BV]`
Gegeben eine Warenannahme im Entwurf und reale Lichtverhältnisse an der Rampe.
Wenn die Person den Lieferschein fotografiert.
Dann hängt das Foto lesbar am Vorgang, ist nur für berechtigte Rollen sichtbar, und ggf. abgebildete Fahrer-Namen/Unterschriften unterliegen dem definierten Lösch-/Zugriffs-Konzept.

## Prozess 2 — Abweichung bei Warenannahme

**AB-01 Happy Path (Fehlmenge → Freigabe)**
Gegeben eine Warenannahme im Bereich Küche mit einer als Fehlmenge markierten Position (mit Grund).
Wenn der Küchenchef die Freigabe erteilt.
Dann wechselt der Vorgang zu *Freigegeben*, die Bewegungen entsprechen den tatsächlich angenommenen Mengen, und die Abweichung ist als solche dauerhaft gekennzeichnet.

**AB-02 Falsche Rolle / Selbstfreigabe**
Gegeben die erfassende Person hat die Abweichung selbst markiert.
Wenn sie versucht, die Freigabe selbst zu erteilen (auch nach PIN-Wechsel zurück auf sich selbst).
Dann verweigert das System die Freigabe technisch (Ersteller ≠ Freigebender), mit verständlicher Meldung.

**AB-03 Abbruchfall (liegengebliebene Freigabe)** `[ENTSCHEIDUNG NÖTIG]`
Gegeben eine Annahme wartet seit X Stunden im Zustand *Freigabe erforderlich*.
Wenn niemand entscheidet.
Dann — erwartetes Verhalten offen: bleibt sichtbar offen (Minimal-Default) oder eskaliert an Betriebsleitung nach X Stunden. Produktentscheidung vor Implementierung von Slice 4 nötig; der Test wird auf das entschiedene Verhalten präzisiert.

**AB-04 Ablehnungsfall**
Gegeben eine Annahme mit Abweichung im Zustand *Freigabe erforderlich*.
Wenn der Küchenchef ablehnt.
Dann ist ein Kommentar Pflicht (ohne Kommentar keine Ablehnung), der Vorgang wechselt zu *Abgelehnt*, und der erfassenden Person wird der Vorgang mit Kommentar zur Nacharbeit angezeigt.

**AB-05 Audit-Erwartung**
Gegeben AB-01 und AB-04 wurden durchgeführt.
Wenn der Audit-Trail geprüft wird.
Dann sind Markierung der Abweichung, Freigabe bzw. Ablehnung (inkl. Kommentar) als getrennte Events mit zwei verschiedenen Personen nachweisbar.

**AB-06 Mobiler Kontext (Stellvertretung)** `[ENTSCHEIDUNG NÖTIG]`
Gegeben der Küchenchef ist abwesend (frei/Urlaub), eine Abweichung im Bereich Küche wartet.
Wenn die Schichtleitung die Freigabesicht öffnet.
Dann — erwartetes Verhalten offen: Stellvertretungsregel (wer darf ersatzweise freigeben) muss vor Go-Live entschieden sein; Test wird entsprechend präzisiert.

## Prozess 3 — Umlagerung

**UM-01 Happy Path**
Gegeben Rolle Bar/Service, Artikel X liegt mit ausreichender Menge im Kellerlager.
Wenn sie 6 Einheiten vom Kellerlager ins Barlager umlagert.
Dann existiert genau eine Bewegung (Quelle, Ziel, Menge, Person, Zeit), und beide Lagerort-Historien zeigen sie konsistent.

**UM-02 Falsche Rolle / fremde Ausgabestelle**
Gegeben Rolle Bar/Service der Bar 1.
Wenn sie versucht, eine Umlagerung für die Ausgabestelle Küche zu erfassen.
Dann wird die Aktion gemäß Berechtigungsmatrix verweigert; es entsteht keine Bewegung.

**UM-03 Abbruchfall**
Gegeben eine halb ausgefüllte Umlagerung (Quelle und Artikel gewählt, Menge fehlt).
Wenn die Person die App verlässt oder das Gerät wechselt den Nutzer per PIN.
Dann ist keine Teilbewegung entstanden; das System hat entweder verworfen oder als persönlichen Entwurf gehalten — niemals halb gebucht.

**UM-04 Freigabefall (Minus-Erkennung)**
Gegeben Artikel X hat im Kellerlager rechnerisch Bestand 4.
Wenn jemand 6 Einheiten von dort umlagern will.
Dann wird nicht still ins Minus gebucht: Es entsteht automatisch ein Korrekturantrag (Differenz), der den Zwei-Personen-Prozess durchläuft; die Umlagerung der real vorhandenen Ware bleibt möglich.

**UM-05 Audit-Erwartung**
Gegeben UM-01 und UM-04 wurden durchgeführt.
Wenn der Audit-Trail geprüft wird.
Dann hat jede Bewegung genau ein Event; der Minus-Fall zeigt die Kette Umlagerungsversuch → Korrekturantrag nachvollziehbar verknüpft.

**UM-06 Mobiler Kontext** `[PILOTGERÄT]`
Gegeben ein Smartphone im Keller (real, nicht simuliert).
Wenn eine Standard-Umlagerung erfasst wird.
Dann dauert der Vorgang unter 30 Sekunden; bei fehlendem Netz greift ab Slice 10 die Offline-Warteschlange (bis dahin: verständliche Fehlermeldung ohne Datenverlust der Eingabe).

## Prozess 4 — Auffüllliste

**AL-01 Happy Path**
Gegeben die Standardvorlage der Bar mit 20 Positionen; Schichtleitung erzeugt daraus die Liste, streicht 1 Position, ergänzt 1, weist sie einer Barkraft zu.
Wenn die Barkraft alle Positionen abhakt.
Dann existiert je Position genau eine Umlagerung (Quell-Lagerort → Barlager), und die Liste ist durch die Schichtleitung abschließbar.

**AL-02 Falsche Rolle**
Gegeben Rolle Bar/Service.
Wenn sie versucht, die Standardvorlage der Bar zu ändern oder eine Liste abzuschließen.
Dann werden beide Aktionen verweigert (Vorlagenpflege: Küchenchef/Schichtleitung; Abschluss: Schichtleitung); das Abarbeiten selbst bleibt möglich.

**AL-03 Abbruchfall (Schichtende mit offener Liste)**
Gegeben eine Liste *In Bearbeitung* mit 3 offenen Positionen bei Schichtende.
Wenn die Schichtübergabe erstellt wird (ab Slice 7).
Dann erscheinen die offenen Positionen im Übergabeentwurf; die Liste bleibt offen und wird nicht still geschlossen.

**AL-04 Freigabe-/Grundfall (nicht erfüllbare Position)**
Gegeben eine Position „Artikel X, 6 Einheiten", Artikel ist im Quell-Lagerort nicht auffindbar.
Wenn die Barkraft die Position als offen markiert.
Dann ist ein Grund Pflicht („nicht im Keller gefunden"), es entsteht **keine** Bewegung, und die Position ist im Listenabschluss und in der Übergabe als offen mit Grund sichtbar.

**AL-05 Audit-Erwartung**
Gegeben AL-01 wurde durchgeführt.
Wenn der Audit-Trail geprüft wird.
Dann sind Listenerstellung (inkl. Vorlagen-Ursprung), jede Streichung/Ergänzung durch die Schichtleitung, jeder Haken (mit Person) und der Abschluss als Events nachweisbar — die Differenz „Vorlage vs. finale Liste" ist rekonstruierbar.

**AL-06 Mobiler Kontext** `[PILOTGERÄT]`
Gegeben reale Auffüllsituation vor der Abendschicht (Zeitdruck, Kiste in einer Hand).
Wenn die Barkraft die Liste abarbeitet.
Dann ist jeder Haken mit maximal 2 Tipps setzbar, auch mit Daumen einhändig; eine Mengenabweichung (4 statt 6) ist ohne Untermenü erfassbar.

## Prozess 5 — Schichtübergabe

**SU-01 Happy Path**
Gegeben ein Schichttag mit 1 Warenannahme (freigegebene Fehlmenge), 1 Auffüllliste (1 offene Position), 1 Korrektur; die gehende Schichtleitung ergänzt 2 Freitext-Punkte mit Verantwortlichem.
Wenn sie übergibt und die kommende Schichtleitung liest und bestätigt.
Dann ist das Protokoll *Bestätigt*, enthält alle genannten Vorgänge im Stand des Übergabezeitpunkts und beide Personen mit Zeitstempeln.

**SU-02 Falsche Rolle**
Gegeben Rolle Bar/Service.
Wenn sie versucht, eine Übergabe zu erstellen oder zu bestätigen.
Dann wird die Aktion verweigert; das Beisteuern einer Notiz an die eigene Schichtleitung bleibt möglich.

**SU-03 Abbruchfall (unbestätigte Übergabe)** `[ENTSCHEIDUNG NÖTIG]`
Gegeben die Frühschicht hat übergeben, die Spätschicht-Leitung hat nicht bestätigt und beginnt zu arbeiten.
Wenn sie eine erste schreibende Aktion ausführt.
Dann — erwartetes Verhalten offen: Warnbanner (Default-Empfehlung) oder Sperre bis Bestätigung. Entscheidung vor Go-Live; Test wird präzisiert.

**SU-04 Einfrier-/Korrekturfall**
Gegeben ein bestätigtes Übergabeprotokoll.
Wenn danach eine im Protokoll enthaltene Warenannahme per Korrekturprozess geändert wird.
Dann zeigt das Protokoll unverändert den Stand zum Übergabezeitpunkt; die Korrektur ist nur am Vorgang selbst sichtbar, nicht rückwirkend im Protokoll.

**SU-05 Audit-Erwartung**
Gegeben SU-01 wurde durchgeführt.
Wenn der Audit-Trail geprüft wird.
Dann existieren getrennte Events für Entwurf, Übergabe und Bestätigung mit zwei verschiedenen Personen; ein nachträglicher Änderungsversuch am Protokoll wird verweigert und als Ereignis erkennbar.

**SU-06 Mobiler Kontext / Doppelschicht** `[ENTSCHEIDUNG NÖTIG]`
Gegeben dieselbe Schichtleitung arbeitet Früh- und Spätschicht (Doppelschicht).
Wenn die Übergabe fällig ist.
Dann — erwartetes Verhalten offen: Übergabe an sich selbst mit Hinweis (Default-Empfehlung, wahrt die Tagesdokumentation) oder Entfall mit Tagesabschluss-Vermerk. Entscheidung vor Go-Live.

## Prozess 6 — Korrektur / Freigabe

**KO-01 Happy Path**
Gegeben Rolle Schichtleitung stellt eine Zähldifferenz fest (Artikel X, Kellerlager, −6).
Wenn sie einen Korrekturantrag mit Grund erstellt und die Betriebsleitung nach Sicht der letzten Bewegungen freigibt.
Dann ist die Korrektur als neuer, mit dem Kontext verknüpfter Eintrag wirksam; der rechnerische Bestand stimmt; nichts Bestehendes wurde verändert.

**KO-02 Falsche Rolle / Selbstfreigabe**
Gegeben die Betriebsleitung erstellt selbst einen Korrekturantrag.
Wenn sie versucht, ihn selbst freizugeben.
Dann verweigert das System (Ersteller ≠ Freigebender gilt für **jede** Rolle, auch die höchste).

**KO-03 Abbruchfall (Rückzug)** `[ENTSCHEIDUNG NÖTIG]`
Gegeben ein noch unentschiedener Korrekturantrag.
Wenn der Antragsteller ihn zurückziehen will.
Dann — erwartetes Verhalten offen: Rückzug erlaubt mit Audit-Event (Default-Empfehlung) oder nur Ablehnung durch Freigeber möglich. Entscheidung vor Implementierung Slice 4/5.

**KO-04 Ablehnungsfall**
Gegeben ein Korrekturantrag mit unplausiblem Grund.
Wenn die Betriebsleitung ablehnt.
Dann ist ein Kommentar Pflicht, der Antrag ist *Abgelehnt*, der Bestand unverändert, und der Antragsteller sieht Ablehnung samt Kommentar.

**KO-05 Audit-Erwartung**
Gegeben KO-01 wurde durchgeführt.
Wenn der Audit-Trail geprüft wird.
Dann ist die Kette Feststellung → Antrag → Freigabe → Wirkung lückenlos, mit zwei Personen; der Originalzustand vor Korrektur bleibt aus der Historie rekonstruierbar.

**KO-06 Mobiler Kontext**
Gegeben die Betriebsleitung ist nicht im Haus.
Wenn sie den Korrekturantrag auf dem Smartphone öffnet.
Dann sieht sie Antrag, Grund und die letzten Bewegungen des Artikels am betroffenen Lagerort auf einem Bildschirm und kann mit je einem Tipp freigeben oder (mit Kommentar) ablehnen.

## Prozess 7 — PIN-Wechsel am Schichtgerät

**PIN-01 Happy Path** `[DSGVO/BV]`
Gegeben ein Schichtgerät an der Bar, Person A ist angemeldet.
Wenn Person B ihre PIN eingibt und danach eine Position abhakt.
Dann ist der Haken Person B zugeordnet (nicht A), sichtbar im Audit-Trail; As Sitzung ist beendet.

**PIN-02 Falsche Rolle / falsche PIN** `[ENTSCHEIDUNG NÖTIG]`
Gegeben ein Schichtgerät.
Wenn dreimal (Wert festzulegen) eine falsche PIN eingegeben wird.
Dann greift das definierte Sperrverhalten — Sperrdauer/Entsperrweg sind vor Slice 1 zu entscheiden (Spec-Abschnitt 2); der Test wird präzisiert.

**PIN-03 Abbruchfall (liegen gelassenes Gerät)** `[ENTSCHEIDUNG NÖTIG]` `[DSGVO/BV]`
Gegeben Person A ist angemeldet, das Gerät liegt unbenutzt an der Theke.
Wenn die Inaktivitätsdauer X überschritten ist (Wert festzulegen).
Dann ist die Sitzung beendet; eine danach ausgeführte Aktion erfordert erneute PIN und wird keinesfalls Person A zugeordnet.

**PIN-04 Korrektur-/Freigabefall (Rollenbindung)**
Gegeben Person B (Bar/Service) übernimmt per PIN das Gerät, auf dem zuvor die Schichtleitung angemeldet war.
Wenn B eine Aktion versucht, die Schichtleitungs-Rechte erfordert (z. B. Listenabschluss).
Dann wird verweigert — Rechte hängen an der Person, nie am Gerät.

**PIN-05 Audit-Erwartung** `[DSGVO/BV]`
Gegeben ein Tag mit 15 PIN-Wechseln auf einem Gerät.
Wenn der Audit-Trail geprüft wird.
Dann ist jede Sitzung (Beginn, Ende, Person, Gerätekennung) nachweisbar — und es existiert **keine** Auswertung „Aktionen pro Person pro Stunde" o. Ä. (Zweckbindung gegen Leistungskontrolle, Risiko-Register Nr. 5).

**PIN-06 Mobiler Kontext** `[PILOTGERÄT]`
Gegeben Barbetrieb, nasse Hände, Zeitdruck.
Wenn Person B den PIN-Wechsel durchführt.
Dann gelingt er in unter 5 Sekunden auf dem realen Gerät (ggf. mit Displayschutzfolie), ohne dass Personen aus Bequemlichkeit unter fremder Sitzung weiterarbeiten — das wird in der Go-Live-Woche beobachtet, nicht nur getestet.

## Prozess 8 — Offline-Erfassung & Sync (Slice 10, im MVP-Core enthalten)

**OF-01 Happy Path** `[PILOTGERÄT]`
Gegeben ein Smartphone im Kühlhaus ohne Netz.
Wenn die Person eine Umlagerung erfasst und später in den Netzbereich zurückkehrt.
Dann zeigt das Gerät zwischenzeitlich „1 Vorgang wartet auf Übertragung", synchronisiert automatisch, und die Bewegung trägt beide Zeitstempel (erfasst offline / übertragen).

**OF-02 Falsche Rolle offline**
Gegeben eine Person, deren Rolle keine Warenannahme erlaubt, ist offline.
Wenn sie die Funktion sucht.
Dann ist sie auch offline nicht verfügbar — Berechtigungen werden lokal durchgesetzt, nicht erst beim Sync.

**OF-03 Abbruchfall (Gerät fällt aus)** `[PILOTGERÄT]`
Gegeben 3 Vorgänge in der Warteschlange, das Gerät geht aus (Akku leer).
Wenn es wieder startet und Netz hat.
Dann sind alle 3 Vorgänge vollständig und genau einmal übertragen — kein Verlust, keine Dopplung.

**OF-04 Kollisions-/Korrekturfall** `[ENTSCHEIDUNG NÖTIG]` `[PILOTGERÄT]`
Gegeben zwei Geräte buchen offline denselben Artikel vom selben Lagerort (Summen übersteigen den Bestand).
Wenn beide synchronisieren.
Dann werden beide Buchungen erhalten (append-only) und es entsteht genau ein automatischer Korrekturantrag für die Differenz — die präzisen Kollisionskriterien (Spec-Abschnitt 4) sind vor Slice 10 zu entscheiden; der Test wird dagegen abgenommen.

**OF-05 Audit-Erwartung (Gerätezeit)**
Gegeben ein Gerät mit absichtlich falsch gestellter Uhr erfasst offline.
Wenn synchronisiert wird.
Dann sind erfasste Zeit und Übertragungszeit getrennt gespeichert, die Abweichung ist erkennbar, und die Audit-Reihenfolge wird nicht durch die falsche Gerätezeit verfälscht.

**OF-06 Mobiler Kontext (Volltest)** `[PILOTGERÄT]`
Gegeben ein kompletter Auffüllvorgang im Keller im Flugmodus (Liste öffnen, 8 Positionen abhaken, 1 offen mit Grund).
Wenn die Person zurück im Netzbereich ist.
Dann sind alle 8 Umlagerungen und die offene Position korrekt synchronisiert; die Sync-Statusanzeige war während des gesamten Vorgangs verständlich („n Vorgänge warten").

---

## Sammelübersicht der Markierungen

- **`[ENTSCHEIDUNG NÖTIG]` (vor Implementierung des jeweiligen Slice):** AB-03 (Freigabe-Eskalation), AB-06 (Stellvertretung), SU-03 (unbestätigte Übergabe: Banner vs. Sperre), SU-06 (Doppelschicht), KO-03 (Antrags-Rückzug), PIN-02/PIN-03 (Sperr-/Timeout-Werte), OF-04 (Kollisionskriterien), Slice 10 gesamt (Offline-Go-Live-Kriterium). Deckungsgleich mit den offenen Punkten aus `technical-build-spec-outline.md` — formalisiert als D1–D15 in `delivery-task-queue.md`.
- **`[PILOTGERÄT]`:** WA-06, WA-07, UM-06, AL-06, PIN-06, OF-01, OF-03, OF-04, OF-06. Konsequenz: Geräte-Testmatrix (Spec-Abschnitt 6) muss vor Slice 3 aus der Phase-0-Erhebung vorliegen.
- **`[DSGVO/BV]`:** WA-07 (Fremd-PII auf Lieferschein-Fotos), PIN-01/PIN-03/PIN-05 (Personenzuordnung und Zweckbindung gegen Leistungskontrolle), Slice 8 (Aufbewahrung/Pseudonymisierung). Diese Tests gehören in die Vorbereitung der betrieblichen Vereinbarung aus Risiko-Register Nr. 5.
