import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const registrySource = await readFile(
  new URL("../src/screenshotRegistry.js", import.meta.url),
  "utf8",
);

test("Pilot tab presents the approved hub, ROI and measurement story in order", () => {
  assert.match(appSource, /Der Hub zwischen Systemen und Standortrealität\./);
  assert.match(appSource, /id="roi"/);
  assert.match(appSource, /Wo Bevero wirtschaftlich wirkt/);
  assert.match(appSource, /Welche Gaps Bevero schließt/);
  assert.match(appSource, /id="messpunkte"/);
  assert.match(appSource, /Woran man den Nutzen im Pilot prüfen kann/);
  assert.match(appSource, /Dashboard arbeitet mit einer standortgekoppelten Datenbank/);
  assert.match(appSource, /FoodNotify und Gastronovi sind bereits als Adapterlogik integriert/);
  assert.match(appSource, /Systemdaten operativ nutzbar machen/);
  assert.match(appSource, /Standortdaten-Gap/);

  assert.ok(appSource.indexOf("<RoiSection />") < appSource.indexOf('id="kam-screens"'));
  assert.ok(
    appSource.indexOf('id="kam-screens"') < appSource.indexOf("<MeasurementSection />"),
  );
  assert.ok(appSource.indexOf("<MeasurementSection />") < appSource.indexOf('id="workflow"'));
});

test("copy preserves system, rollout and ROI claim boundaries", () => {
  assert.match(appSource, /Bestehende Systeme bleiben führend/);
  assert.match(appSource, /keine Ersetzung von Planungs- oder POS-System/);
  assert.match(appSource, /kein offizielles Projekt eines bestimmten Kunden/);
  assert.match(appSource, /kein ungeprüfter produktiver Writeback/);
  assert.match(appSource, /keine automatische Bestellung ohne Freigabe/);
  assert.match(appSource, /keine garantierte ROI-Zahl ohne Pilotmessung/);
  assert.doesNotMatch(appSource, /garantiert ROI-positiv/i);
  assert.doesNotMatch(appSource, /produktiv ausgerollt|konzernweit aktiv|offiziell freigegeben/i);
});

test("CTA asks for an operational-hub assessment with four questions", () => {
  assert.match(appSource, /Den wirtschaftlichen Hebel prüfen/);
  assert.match(appSource, /Bevero — kurze Einschätzung zum operativen Hub/);
  assert.match(
    appSource,
    /Ist der Hub-Gedanke zwischen Planungs-\/POS-System \(z\. B\. FoodNotify, Gastronovi\) und Standortrealität grundsätzlich relevant\?/,
  );
  assert.match(
    appSource,
    /Wo wäre aus Key-Account- oder Standort-Sicht der stärkste wirtschaftliche Hebel\?/,
  );
  assert.match(
    appSource,
    /Welche Daten oder Adapter wären für einen kleinen Pilotrahmen am wichtigsten\?/,
  );
  assert.match(
    appSource,
    /Wer wäre intern die richtige Person, um diesen Ansatz einzuordnen\?/,
  );
});

test("six KAM screenshots use ROI and decision-oriented questions", () => {
  for (const question of [
    "Welche Risiken sieht die Leitung sofort?",
    "Welche Auffüllung kostet sonst Suchzeit und Zuruf?",
    "Was ist angekommen und wann operativ sichtbar?",
    "Welche Entnahme, Korrektur oder Umbuchung ist nachvollziehbar?",
    "Welche offenen Punkte gehen nicht verloren?",
    "Welche Abweichung braucht Prüfung statt Bauchentscheidung?",
  ]) {
    assert.match(registrySource, new RegExp(question.replace(/[?]/g, "\\?")));
  }
});
