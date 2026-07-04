import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const registrySource = await readFile(
  new URL("../src/screenshotRegistry.js", import.meta.url),
  "utf8",
);

test("landing presents the approved hub, value and pilot story in order", () => {
  assert.match(appSource, /Der Hub zwischen Systemen und Standortrealität\./);
  assert.match(appSource, /id="nutzen"/);
  assert.match(appSource, /Wo Bevero wirtschaftlich wirkt/);
  assert.match(appSource, /Welche Lücken Bevero schließt/);
  assert.match(appSource, /id="pilot"/);
  assert.match(appSource, /Woran man den Nutzen im Pilot prüfen kann/);
  assert.match(appSource, /Dashboard mit standortgekoppelter Datenbank/);
  assert.match(appSource, /integrierte Adapterlogik für externe Planungs- und POS-Systeme/);
  assert.match(appSource, /Systemdaten operativ nutzbar machen/);
  assert.match(appSource, /Systemdaten liegen getrennt/);

  assert.ok(appSource.indexOf('id="nutzen"') < appSource.indexOf('id="screens"'));
  assert.ok(appSource.indexOf('id="screens"') < appSource.indexOf('id="pilot"'));
  assert.ok(appSource.indexOf('id="pilot"') < appSource.indexOf('id="vertrauen"'));
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
  assert.match(appSource, /Einschätzung geben/);
  assert.match(appSource, /Bevero Ops - kurze Einschätzung zum operativen Hub/);
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

test("interactive React sandbox island is integrated between process proof and pilot", () => {
  assert.match(indexSource, /id="sandbox-root"/);
  assert.match(indexSource, /src="\/src\/sandbox-entry\.jsx"/);
  assert.ok(indexSource.indexOf('id="prozesse"') < indexSource.indexOf('id="sandbox-root"'));
  assert.ok(indexSource.indexOf('id="sandbox-root"') < indexSource.indexOf('id="pilot"'));
});
