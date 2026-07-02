export type LocationProfile = "MOTORWORLD_STANDARD" | "CUBE_PREMIUM" | "EVENT_BANKETT_FUTURE";

export type TileId =
  | "refill_runs"
  | "open_deliveries"
  | "critical_stock"
  | "anomalies"
  | "active_slots"
  | "open_inquiries"
  | "service_preparation"
  | "group_rule_badge"
  | "menu_active"
  | "event_inquiry_detail"
  | "event_pipeline"
  | "event_space_utilization";

export type LocationTileConfig = {
  id: TileId;
  label: string;
  profile: LocationProfile[];
};

const ALL_PROFILES: LocationProfile[] = [
  "MOTORWORLD_STANDARD",
  "CUBE_PREMIUM",
  "EVENT_BANKETT_FUTURE"
];

const TILE_DEFINITIONS: LocationTileConfig[] = [
  { id: "refill_runs",         label: "Nachfüll-Läufe",         profile: ALL_PROFILES },
  { id: "open_deliveries",     label: "Offene Wareneingänge",   profile: ALL_PROFILES },
  { id: "critical_stock",      label: "Kritische Bestände",     profile: ALL_PROFILES },
  { id: "anomalies",           label: "Anomalien",              profile: ALL_PROFILES },
  { id: "active_slots",        label: "Aktive Service-Slots",   profile: ALL_PROFILES },
  { id: "open_inquiries",      label: "Offene Anfragen",        profile: ALL_PROFILES },
  { id: "service_preparation", label: "Service-Vorbereitung",   profile: ["CUBE_PREMIUM"] },
  { id: "group_rule_badge",    label: "Gruppenregel",           profile: ["CUBE_PREMIUM"] },
  { id: "menu_active",         label: "Aktive Menüs",           profile: ["CUBE_PREMIUM"] },
  { id: "event_inquiry_detail",label: "Anfragen-Detail",        profile: ["CUBE_PREMIUM"] },
  { id: "event_pipeline",      label: "Event-Pipeline",         profile: ["EVENT_BANKETT_FUTURE"] },
  { id: "event_space_utilization", label: "Event-Raum-Auslastung", profile: ["EVENT_BANKETT_FUTURE"] }
];

export function getTilesForProfile(profile: LocationProfile): LocationTileConfig[] {
  return TILE_DEFINITIONS.filter((tile) => tile.profile.includes(profile));
}

export function getTileIds(profile: LocationProfile): TileId[] {
  return getTilesForProfile(profile).map((t) => t.id);
}
