"use client";

import { Drawer } from "./drawer";

type MovementSnippet = {
  id: string;
  type: string;
  quantity: number;
  unit: string;
  createdAt: string;
  actorUserId: string;
};

type EvidenceDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  expected: number;
  counted: number;
  unit: string;
  reason: string;
  submittedBy: string;
  submittedAt: string;
  sourceLabel: string;
  movements?: MovementSnippet[];
};

export function EvidenceDrawer({
  open,
  onClose,
  title,
  expected,
  counted,
  unit,
  reason,
  submittedBy,
  submittedAt,
  sourceLabel,
  movements = []
}: EvidenceDrawerProps) {
  const delta = counted - expected;

  return (
    <Drawer onClose={onClose} open={open} title={title}>
      <dl className="evidence-drawer__meta">
        <div>
          <dt>Quelle</dt>
          <dd><span className="badge badge-info">{sourceLabel}</span></dd>
        </div>
        <div>
          <dt>Vorher (erwartet)</dt>
          <dd>{expected} {unit}</dd>
        </div>
        <div>
          <dt>Gezählt</dt>
          <dd>{counted} {unit}</dd>
        </div>
        <div>
          <dt>Differenz</dt>
          <dd className={delta < 0 ? "text-critical" : delta > 0 ? "text-warning" : "text-ok"}>
            {delta > 0 ? "+" : ""}{delta} {unit}
          </dd>
        </div>
        <div>
          <dt>Grund</dt>
          <dd>{reason}</dd>
        </div>
        <div>
          <dt>Eingereicht von</dt>
          <dd>{submittedBy}</dd>
        </div>
        <div>
          <dt>Zeitpunkt</dt>
          <dd>{new Date(submittedAt).toLocaleString("de-DE")}</dd>
        </div>
      </dl>

      {movements.length > 0 ? (
        <section className="evidence-drawer__movements">
          <h3>Letzte Bewegungen</h3>
          <ul>
            {movements.map((m) => (
              <li key={m.id} className="evidence-drawer__movement-row">
                <span className="badge badge-neutral">{m.type}</span>
                <span>{m.quantity > 0 ? "+" : ""}{m.quantity} {m.unit}</span>
                <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString("de-DE")}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Drawer>
  );
}
