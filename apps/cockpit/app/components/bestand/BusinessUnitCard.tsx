"use client";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  BUSINESS_UNIT_LABELS as BU_LABELS,
  type BusinessUnitNameValue
} from "../../../lib/business-unit-constants";

type BusinessUnitCardProps = {
  name: BusinessUnitNameValue;
  inquiryCount: number;
  topConcepts?: Array<{ id: string; name: string }>;
  topLocations?: Array<{ id: string; name: string }>;
};

export function BusinessUnitCard({
  name,
  inquiryCount,
  topConcepts = [],
  topLocations = []
}: BusinessUnitCardProps) {
  return (
    <Card data-testid={`bu-card-${name}`}>
      <CardHeader
        action={
          <Badge variant={inquiryCount > 0 ? "info" : "neutral"}>
            {inquiryCount} Anfragen
          </Badge>
        }
      >
        <CardTitle>{BU_LABELS[name] ?? name}</CardTitle>
      </CardHeader>
      <CardContent>
        {topConcepts.length > 0 ? (
          <div className="field-group">
            <p className="field-help">Top-Konzepte</p>
            <ul className="list-reset">
              {topConcepts.slice(0, 3).map((c) => (
                <li key={c.id} className="list-row">
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {topLocations.length > 0 ? (
          <div className="field-group">
            <p className="field-help">Top-Standorte</p>
            <ul className="list-reset">
              {topLocations.slice(0, 3).map((l) => (
                <li key={l.id} className="list-row">
                  {l.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { BU_LABELS as BUSINESS_UNIT_LABELS };
