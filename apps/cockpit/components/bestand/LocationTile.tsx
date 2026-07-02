"use client";

import type { TileId } from "../../lib/location-tiles";

type LocationTileProps = {
  id: TileId;
  label: string;
  value?: number | string | null;
  alert?: boolean;
};

export function LocationTile({ id, label, value, alert }: LocationTileProps) {
  return (
    <div className="card-ui" data-tile-id={id}>
      <header className="card-ui-header">
        <h3 className="card-ui-title">{label}</h3>
        {alert && <span className="badge badge-alert" aria-label="Hinweis">!</span>}
      </header>
      {value !== undefined && value !== null && (
        <p className="card-ui-content">{value}</p>
      )}
    </div>
  );
}
