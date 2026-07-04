import { expect, test } from "@playwright/test";

async function openWorkflow(page, name) {
  await page.getByRole("button", { name: `${name} Demo starten` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("DEMO", { exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
});

test("Warenannahme completes with deterministic local data", async ({ page }) => {
  await openWorkflow(page, "Warenannahme");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lieferant").selectOption("frischewerk");
  await dialog.getByRole("button", { name: "Weiter" }).click();
  for (const checkbox of await dialog.getByRole("checkbox").all()) await checkbox.check();
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await dialog.getByRole("button", { name: "Demo-Beleg bestätigen" }).click();
  await expect(dialog.getByText("1 von 5 abgeschlossen")).toBeVisible();
});

test("Umlagerung validates and completes", async ({ page }) => {
  await openWorkflow(page, "Umlagerung");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Zielbereich").selectOption("hauptlager");
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await expect(dialog.getByRole("alert")).toContainText("unterscheiden");
  await dialog.getByLabel("Zielbereich").selectOption("bar");
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await dialog.getByRole("button", { name: "Umlagerung simulieren" }).click();
  await expect(dialog.getByText("1 von 5 abgeschlossen")).toBeVisible();
});

test("Auffüllung completes without API or Supabase requests", async ({ page }) => {
  const forbiddenRequests = [];
  page.on("request", (request) => {
    if (/supabase|\/api\//i.test(request.url())) forbiddenRequests.push(request.url());
  });
  await openWorkflow(page, "Auffüllung / Entnahme");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await expect(dialog.getByText("Lager 48 → 42")).toBeVisible();
  await dialog.getByRole("button", { name: "Auffüllung simulieren" }).click();
  expect(forbiddenRequests).toEqual([]);
});

test("Schichtübergabe supports dual name confirmation and PDF download", async ({ page }) => {
  await openWorkflow(page, "Schichtübergabe");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Schichttyp").selectOption("Frühschicht");
  await dialog.getByLabel("Abgebende Schicht").fill("Mara König");
  await dialog.getByLabel("Übernehmende Schicht").fill("Jonas Becker");
  await dialog.getByRole("button", { name: "Weiter" }).click();
  for (const radio of await dialog.getByRole("radio", { name: "erledigt" }).all()) await radio.check();
  await dialog.getByRole("button", { name: "Weiter" }).click();
  for (const button of await dialog.getByRole("button", { name: "Name als Demo-Bestätigung verwenden" }).all()) await button.click();
  await dialog.getByRole("button", { name: "Weiter" }).click();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Demo-PDF herunterladen" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("bevero-demo-schichtuebergabe.pdf");
  await dialog.getByRole("button", { name: "Übergabe abschließen" }).click();
  await expect(dialog.getByText("1 von 5 abgeschlossen")).toBeVisible();
});

test("Korrektur requires manager role and records approval", async ({ page }) => {
  await openWorkflow(page, "Korrektur / Freigabe");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await dialog.getByLabel("Korrekturdelta").fill("-2");
  await dialog.getByLabel("Pflichtgrund").fill("Bruch dokumentiert");
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await expect(dialog.getByRole("button", { name: "Genehmigen" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Zur Demo-Manager-Rolle wechseln" }).click();
  await dialog.getByRole("button", { name: "Genehmigen" }).click();
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await dialog.getByRole("button", { name: "Entscheidung abschließen" }).click();
  await expect(dialog.getByText("approved")).toBeVisible();
});

test("session draft survives reload and reset restores the seed", async ({ page }) => {
  await openWorkflow(page, "Umlagerung");
  await page.getByRole("dialog").getByLabel("Menge").fill("4");
  await page.reload();
  await openWorkflow(page, "Umlagerung");
  await expect(page.getByRole("dialog").getByLabel("Menge")).toHaveValue("4");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Demo zurücksetzen" }).click();
  await expect(page.getByRole("dialog").getByLabel("Menge")).toHaveValue("6");
});

test("mobile dialog keeps primary content inside a 320px viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-320", "mobile-only layout assertion");
  await openWorkflow(page, "Schichtübergabe");
  const metrics = await page.getByRole("dialog").evaluate((element) => ({
    viewport: document.documentElement.clientWidth,
    bodyWidth: document.documentElement.scrollWidth,
    dialogWidth: element.scrollWidth,
  }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.dialogWidth).toBeLessThanOrEqual(metrics.viewport);
});
