# use-cases.md

## Use Case 1 — Warenannahme mit Fehlmenge

**Ausgangsproblem (heute):** 7:30 Uhr, der Lieferant hat es eilig. Der Azubi nimmt an, zählt grob, unterschreibt. Dass zwei Kisten fehlen, fällt mittags der Küche auf. Der Lieferschein liegt in der Hülle im Büro, der Fahrer ist weg, der Küchenchef erfährt es beim Abendservice. Die Reklamation verläuft im Sand, die Fehlmenge wird zur Inventurdifferenz.

**Workflow mit Bevero:**
1. **Lager / Warenannahme** öffnet „Neue Warenannahme", wählt Lieferant A.
2. Beim Zählen: zwei Kisten fehlen → Position als **Fehlmenge** markiert, Foto vom Lieferschein direkt in den Vorgang.
3. Vorgang geht automatisch zur Freigabe an den **Küchenchef** — der sieht es auf dem Handy, noch bevor der Fahrer vom Hof ist.
4. Küchenchef gibt frei; Reklamationsgrundlage (Foto, Zeit, Person, Position) ist vollständig dokumentiert.

**Nutzen:** Reklamationen werden am selben Tag mit Beleg gestellt statt nie; Fehlmengen tauchen nicht mehr als rätselhafte Differenz auf; der Azubi ist abgesichert, weil sein Vorgang sauber dokumentiert ist.

**Messbares Ergebnis (Zielhypothese):** ≥ 90 % der Lieferabweichungen am Annahmetag dokumentiert und gemeldet (heute: geschätzt < 30 %, oft nie). → Messkriterien: `pilot-kpi-plan.md` KPI 3.

## Use Case 2 — Schichtübergabe ohne Informationsverlust

**Ausgangsproblem (heute):** Übergabe um 16:00 Uhr dauert 90 Sekunden im Flur: drei Infos mündlich, eine davon geht unter. Die Spätschicht ruft um 19:00 Uhr die Frühschicht privat an, weil unklar ist, ob das Kühlhaus-Problem gemeldet wurde. Wer frei hatte, startet am nächsten Tag mit Informationsstand von vorgestern.

**Workflow mit Bevero:**
1. 15:45 Uhr: Bevero erstellt den **Übergabeentwurf** automatisch — heutige Warenannahme (inkl. der freigegebenen Fehlmenge), Stand der Auffüllliste, offene Freigaben.
2. Die **gehende Schichtleitung** ergänzt zwei Freitext-Punkte, je mit Verantwortlichem („Kühlhaus 2: Hausmeister informiert").
3. Die **kommende Schichtleitung** liest das Protokoll auf dem Handy und **bestätigt aktiv** die Übernahme.
4. Das Protokoll ist eingefroren und für alle Berechtigten nachlesbar — auch für die, die heute frei haben.

**Nutzen:** Kein Wissen mehr, das an der Anwesenheit einer Person hängt; Konflikte („das hat mir keiner gesagt") verlieren ihre Grundlage; Betriebsleitung kann jede Übergabe nachlesen statt nachfragen.

**Messbares Ergebnis (Zielhypothese):** Rückfragen an die Vorschicht −50 %; Schichtübergabe an 20+ aufeinanderfolgenden Tagen vollständig ohne Papier/Zuruf-Fallback. → `pilot-kpi-plan.md` KPI 2 und 4.

## Use Case 3 — Auffüllliste Bar mit AI-Vorbefüllung (AI-Komponente; gilt ab Pilot v1.5)

> Hinweis (Scope-Lock): Für die ersten Pilotwochen gilt die Vorlagen-Variante (Standardliste aus der Setup-Datenaufnahme). Die Vorbefüllung aus Historie aktiviert sich erst nach den Datenschwellen aus `cold-start-ai-plan.md`.

**Ausgangsproblem (heute):** Freitag, 15:00 Uhr. Die Barkraft schreibt die Auffüllliste aus dem Kopf auf einen Block — und vergisst, dass freitags doppelt so viel Longdrink-Umsatz läuft wie dienstags. Um 21:30 Uhr ist ein gängiger Artikel leer, jemand rennt in den Keller, findet ihn nicht (steht im Kühlhaus), der Service stockt.

**Workflow mit Bevero:**
1. 15:00 Uhr: Bevero erzeugt die **vorbefüllte Auffüllliste** für die Bar — aus den Auffüll- und Verbrauchsmustern der letzten Freitage (Heuristik auf eigener Historie, keine Kassendaten). Die Positionen zeigen den Lagerort, an dem der Artikel tatsächlich liegt.
2. **Schichtleitung** prüft die Liste (30 Sekunden), streicht eine Position, ergänzt eine, weist sie der **Barkraft** zu.
3. Barkraft arbeitet ab; jeder Haken bucht automatisch die **Umlagerung** (Keller → Barlager). Ein nicht auffindbarer Artikel wird mit Grund markiert — das ist zugleich ein Datensignal für eine mögliche Bestandsdifferenz.
4. Zusätzlich AI-Hinweis, wo relevant: „Artikel X wurde an den letzten 3 Freitagen nachgefüllt, steht aber nicht auf der Liste."

**Nutzen:** Die Liste denkt an das, woran unter Zeitdruck niemand denkt; Suchzeiten entfallen, weil der Lagerort dransteht; nebenbei entsteht eine saubere Bewegungshistorie ohne extra Erfassungsaufwand.

**Messbares Ergebnis (Zielhypothese):** „Artikel leer während des Service"-Vorfälle −50 %; Rüstzeit vor der Abendschicht −15 Minuten. → `pilot-kpi-plan.md` KPI 5 und 6 (dort konservativer kalibriert als die ursprüngliche Hypothese).

## Use Case 4 — Korrektur einer Bestandsdifferenz mit Freigabe und Audit-Trail

**Ausgangsproblem (heute):** Beim Auffüllen fällt auf: Im Kellerlager stehen sechs Flaschen weniger als gedacht. Heute wird das entweder ignoriert (bis zur Inventur), oder es beginnt ein vages „wer hat da was genommen?" in der WhatsApp-Gruppe — ohne Ergebnis, mit schlechter Stimmung.

**Workflow mit Bevero:**
1. Die **Schichtleitung** erstellt einen **Korrekturantrag**: Artikel, Lagerort, Differenz, Grund („Zähldifferenz beim Auffüllen festgestellt").
2. Die **Betriebsleitung** (Zwei-Personen-Prinzip: Ersteller ≠ Freigebender) sieht den Antrag samt der letzten Bewegungen dieses Artikels an diesem Lagerort — die Historie zeigt: Die letzte Umlagerung wurde doppelt erfasst.
3. Betriebsleitung gibt die Korrektur mit Kommentar frei. Der Originalvorgang bleibt bestehen; die Korrektur ist ein verknüpfter neuer Eintrag im **Audit-Trail**.
4. Bei echter unerklärter Differenz: Der Fall ist dokumentiert und bei der Inventur zuordenbar — statt Teil eines anonymen Sammelpostens.

**Nutzen:** Differenzen werden am Entstehungstag geklärt statt Monate später summiert; das Team wird durch Daten entlastet statt durch Verdacht belastet; Controlling/Steuerberater können jede Korrektur nachvollziehen.

**Messbares Ergebnis (Zielhypothese):** Anteil aufgeklärter Differenzen bei Inventur von geschätzt < 30 % auf > 70 %; unaufgeklärte Inventurdifferenz −30 % nach 3 Monaten. → `pilot-kpi-plan.md` KPI 7.
