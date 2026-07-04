import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SandboxSection } from "../../src/sandbox/SandboxSection.jsx";
import { SANDBOX_STORAGE_KEY } from "../../src/sandbox/storage.js";

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("SandboxSection", () => {
  test("shows five workflows and opens the selected flow in a demo dialog", () => {
    render(<SandboxSection />);

    expect(screen.getAllByRole("button", { name: /Demo starten/i })).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: /Warenannahme Demo starten/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByText("DEMO")).toBeVisible();
    expect(within(dialog).getByText(/keine produktive Buchung/i)).toBeVisible();
    expect(within(dialog).getByRole("heading", { name: "Warenannahme" })).toBeVisible();
  });

  test("validates a goods receipt and records its completion", () => {
    render(<SandboxSection />);
    fireEvent.click(screen.getByRole("button", { name: /Warenannahme Demo starten/i }));
    const dialog = screen.getByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/Auswahl/);

    fireEvent.change(within(dialog).getByLabelText("Lieferant"), { target: { value: "frischewerk" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    for (const checkbox of within(dialog).getAllByRole("checkbox")) fireEvent.click(checkbox);
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Demo-Beleg bestätigen" }));

    expect(within(dialog).getByText(/1 von 5 abgeschlossen/)).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem(SANDBOX_STORAGE_KEY)).completedWorkflows).toContain("goodsReceipt");
  });

  test("blocks a transfer when source and target are identical", () => {
    render(<SandboxSection />);
    fireEvent.click(screen.getByRole("button", { name: /Umlagerung Demo starten/i }));
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Zielbereich"), { target: { value: "hauptlager" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/unterscheiden/);
  });

  test("restores a draft after remount and reset returns to the seed", () => {
    const view = render(<SandboxSection />);
    fireEvent.click(screen.getByRole("button", { name: /Umlagerung Demo starten/i }));
    fireEvent.change(screen.getByLabelText("Menge"), { target: { value: "4" } });
    view.unmount();

    render(<SandboxSection />);
    fireEvent.click(screen.getByRole("button", { name: /Umlagerung Demo starten/i }));
    expect(screen.getByLabelText("Menge")).toHaveValue(4);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Demo zurücksetzen" }));
    expect(screen.getByLabelText("Menge")).toHaveValue(6);
  });

  test("completes the refill flow without any network request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<SandboxSection />);
    fireEvent.click(screen.getByRole("button", { name: /Auffüllung \/ Entnahme Demo starten/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    expect(within(dialog).getByText(/Lager 48 → 42/)).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Auffüllung simulieren" }));
    expect(within(dialog).getByText(/1 von 5 abgeschlossen/)).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("supports keyboard-accessible dual confirmation for handover", () => {
    render(<SandboxSection />);
    fireEvent.click(screen.getByRole("button", { name: /Schichtübergabe Demo starten/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Schichttyp"), { target: { value: "Frühschicht" } });
    fireEvent.change(within(dialog).getByLabelText("Abgebende Schicht"), { target: { value: "Mara König" } });
    fireEvent.change(within(dialog).getByLabelText("Übernehmende Schicht"), { target: { value: "Jonas Becker" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    for (const radio of within(dialog).getAllByRole("radio", { name: "erledigt" })) fireEvent.click(radio);
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    for (const button of within(dialog).getAllByRole("button", { name: "Name als Demo-Bestätigung verwenden" })) fireEvent.click(button);
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    expect(within(dialog).getByRole("button", { name: "Demo-PDF herunterladen" })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Übergabe abschließen" }));
    expect(within(dialog).getByText(/1 von 5 abgeschlossen/)).toBeVisible();
  });

  test("requires a manager role before approving a correction", () => {
    render(<SandboxSection />);
    fireEvent.click(screen.getByRole("button", { name: /Korrektur \/ Freigabe Demo starten/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    fireEvent.change(within(dialog).getByLabelText("Korrekturdelta"), { target: { value: "-2" } });
    fireEvent.change(within(dialog).getByLabelText("Pflichtgrund"), { target: { value: "Bruch dokumentiert" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    expect(within(dialog).getByRole("button", { name: "Genehmigen" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Zur Demo-Manager-Rolle wechseln" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Genehmigen" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Weiter" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Entscheidung abschließen" }));
    expect(within(dialog).getByText("approved")).toBeVisible();
  });
});
