"use client";

import { EmptyState } from "../ui/empty-state";

type SignatureAssetEntry = {
  locationId: string;
  locationName: string;
  brandId: string | null;
  assets: string[];
};

type SignatureAssetMapProps = {
  entries: SignatureAssetEntry[];
};

export function SignatureAssetMap({ entries }: SignatureAssetMapProps) {
  const grouped = new Map<string, SignatureAssetEntry[]>();
  for (const entry of entries) {
    if (entry.assets.length === 0) continue;
    const key = entry.brandId ?? "no-brand";
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }
  if (grouped.size === 0) {
    return (
      <EmptyState
        title="Keine Signatur-Assets"
        description="Aktuell sind keine Signature-Assets für die Standorte der Organisation hinterlegt."
      />
    );
  }
  return (
    <div data-testid="signature-asset-map" className="field-group">
      {[...grouped.entries()].map(([brandKey, items]) => (
        <section key={brandKey} className="card-ui">
          <header className="card-ui-header">
            <h4 className="card-ui-title">Brand {brandKey}</h4>
          </header>
          <div className="card-ui-content">
            <ul className="list-reset">
              {items.map((item) => (
                <li key={item.locationId} className="list-row">
                  <strong>{item.locationName}</strong>
                  <p className="field-help">{item.assets.join(" · ")}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
