import { EmptyState } from "./ui/empty-state";

type AccessDeniedProps = {
  description?: string;
  title?: string;
};

export function AccessDenied({
  description = "Du hast keine Berechtigung für diese Ansicht.",
  title = "Kein Zugriff"
}: AccessDeniedProps) {
  return <EmptyState description={description} title={title} />;
}
