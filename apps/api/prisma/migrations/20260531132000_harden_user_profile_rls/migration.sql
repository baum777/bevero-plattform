CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.can_read_user_profile(target_auth_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF current_user_id = target_auth_user_id THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS self_membership
    JOIN "OrganizationMember" AS target_membership
      ON target_membership."organizationId" = self_membership."organizationId"
    WHERE self_membership."userId" = current_user_id::text
      AND target_membership."userId" = target_auth_user_id::text
  );
END;
$$;

REVOKE ALL ON FUNCTION private.can_read_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_read_user_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_current_user_profile(
  display_name text DEFAULT NULL,
  preferred_storage_location_id text DEFAULT NULL
)
RETURNS TABLE (
  "authUserId" uuid,
  "email" text,
  "displayName" text,
  "preferredStorageLocationId" text,
  "createdAt" timestamptz,
  "updatedAt" timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
  current_email text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  current_email := NULLIF(auth.jwt() ->> 'email', '');
  IF current_email IS NULL THEN
    current_email := CONCAT(current_user_id::text, '@unknown.local');
  END IF;

  INSERT INTO "UserProfile" (
    "id",
    "authUserId",
    "email",
    "displayName",
    "preferredStorageLocationId",
    "isActive",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    CONCAT('profile_', REPLACE(current_user_id::text, '-', '')),
    current_user_id,
    current_email,
    display_name,
    preferred_storage_location_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT ("authUserId") DO UPDATE
  SET
    "displayName" = EXCLUDED."displayName",
    "preferredStorageLocationId" = EXCLUDED."preferredStorageLocationId",
    "updatedAt" = NOW()
  RETURNING
    "UserProfile"."authUserId",
    "UserProfile"."email",
    "UserProfile"."displayName",
    "UserProfile"."preferredStorageLocationId",
    "UserProfile"."createdAt",
    "UserProfile"."updatedAt"
  INTO
    "authUserId",
    "email",
    "displayName",
    "preferredStorageLocationId",
    "createdAt",
    "updatedAt";

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_current_user_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_current_user_profile(text, text) TO authenticated;

ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profile_self_or_org_select" ON "UserProfile";
DROP POLICY IF EXISTS "user_profile_self_insert" ON "UserProfile";
DROP POLICY IF EXISTS "user_profile_self_update" ON "UserProfile";

CREATE POLICY "user_profile_self_or_org_select"
ON "UserProfile"
FOR SELECT
TO authenticated
USING (private.can_read_user_profile("authUserId"));

CREATE POLICY "user_profile_self_insert"
ON "UserProfile"
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = "authUserId");

CREATE POLICY "user_profile_self_update"
ON "UserProfile"
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = "authUserId")
WITH CHECK ((SELECT auth.uid()) = "authUserId");
