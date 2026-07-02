import { PageScaffold } from "../../../components/page-scaffold";
import { AccessDenied } from "../../../components/access-denied";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { ErrorState } from "../../../components/ui/error-state";
import { getCurrentProfile } from "../../../../lib/supabase/queries/profile";
import { updateProfileAction } from "./actions";

type SettingsProfilePageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(parsed));
}

function mapErrorMessage(code: string | undefined) {
  if (code === "unauthenticated") return "Session ungültig. Bitte neu anmelden.";
  if (code === "profile_missing") return "Kein UserProfile für den aktuellen Nutzer gefunden.";
  if (code === "update_failed") return "Profil konnte nicht gespeichert werden.";
  return null;
}

export default async function SettingsProfilePage({ searchParams }: SettingsProfilePageProps) {
  const params = (await searchParams) ?? {};
  const result = await getCurrentProfile();
  const requestError = mapErrorMessage(params.error);
  const success = params.success === "updated";

  if (result.access !== "allowed") {
    return (
      <PageScaffold title="Profil" description="Persönliche Daten des angemeldeten Nutzers.">
        <AccessDenied description="Profilansicht ist aktuell nicht verfügbar." />
      </PageScaffold>
    );
  }

  if (!result.data) {
    return (
      <PageScaffold title="Profil" description="Persönliche Daten des angemeldeten Nutzers.">
        <ErrorState
          description={result.error ?? "Profildaten sind aktuell nicht verfügbar."}
          title="Profil konnte nicht geladen werden"
        />
      </PageScaffold>
    );
  }

  const profile = result.data;

  return (
    <PageScaffold title="Profil" description="Persönliche Daten des angemeldeten Nutzers.">
      {result.error ? (
        <ErrorState description={result.error} title="Profil konnte nicht geladen werden" />
      ) : null}

      {requestError ? (
        <ErrorState description={requestError} title="Speichern fehlgeschlagen" />
      ) : null}

      {success ? <p className="field-help field-help-ok">Profil wurde gespeichert.</p> : null}

      <div className="card-ui stack-gap-after">
        <div className="stack-sm">
          <Badge variant="neutral">{`User: ${profile.userId}`}</Badge>
          <Badge variant="info">{`Rolle: ${profile.organizationRole ?? "unbekannt"}`}</Badge>
          <Badge variant="neutral">{`Erstellt: ${formatDate(profile.createdAt)}`}</Badge>
          <Badge variant="neutral">{`Aktualisiert: ${formatDate(profile.updatedAt)}`}</Badge>
        </div>
      </div>

      <form action={updateProfileAction} className="stack-sm">
        <div className="field-stack">
          <label htmlFor="profile-email">E-Mail</label>
          <input className="toolbar-input" defaultValue={profile.email ?? ""} id="profile-email" readOnly />
        </div>
        <div className="field-stack">
          <label htmlFor="profile-display-name">Anzeigename</label>
          <input
            className="toolbar-input"
            defaultValue={profile.displayName ?? ""}
            id="profile-display-name"
            maxLength={80}
            name="displayName"
            placeholder="z. B. Max Mustermann"
          />
        </div>
        <div className="field-stack">
          <label htmlFor="profile-storage-location">Bevorzugter Lagerort</label>
          <select
            className="toolbar-input"
            defaultValue={profile.preferredStorageLocationId ?? ""}
            id="profile-storage-location"
            name="preferredStorageLocationId"
          >
            <option value="">Kein bevorzugter Lagerort</option>
            {profile.storageLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Button type="submit" variant="primary">
            Profil speichern
          </Button>
        </div>
      </form>
    </PageScaffold>
  );
}
