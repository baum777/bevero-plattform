import { fetchMatrix } from "../../../../lib/backend/shift-planning";
import { MatrixClient } from "./matrix-client";

export default async function SchichtplanMatrixPage() {
  const result = await fetchMatrix();
  return <MatrixClient initialData={result.data} initialError={result.error} />;
}
