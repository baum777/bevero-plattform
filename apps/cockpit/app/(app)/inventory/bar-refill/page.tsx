import { PageScaffold } from "../../../components/page-scaffold";
import { BarRefillClient } from "./refill-client";
import { RefillSuggestionsBannerLoader } from "./refill-suggestions-banner";

export default function BarRefillPage() {
  return (
    <PageScaffold
      title="Auffüllliste Bar"
      description="Tagesliste für Entnahme-Vormerkung und bestätigte Bestandsentnahmen."
    >
      <RefillSuggestionsBannerLoader />
      <BarRefillClient />
    </PageScaffold>
  );
}
