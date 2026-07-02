-- Fix: live smoke exposed an ambiguous authUserId reference in the public profile RPC.
-- Keep the null-preserving behavior from 20260609130000 and make PL/pgSQL resolve
-- ambiguous column/parameter names as table columns unless explicitly declared variables.
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
#variable_conflict use_column
DECLARE
  v_current_user_id uuid;
  v_current_email text;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  v_current_email := NULLIF(auth.jwt() ->> 'email', '');
  IF v_current_email IS NULL THEN
    v_current_email := CONCAT(v_current_user_id::text, '@unknown.local');
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
    CONCAT('profile_', REPLACE(v_current_user_id::text, '-', '')),
    v_current_user_id,
    v_current_email,
    display_name,
    preferred_storage_location_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT ("authUserId") DO UPDATE
  SET
    "email"                      = EXCLUDED."email",
    "displayName"                = COALESCE(EXCLUDED."displayName",                "UserProfile"."displayName"),
    "preferredStorageLocationId" = COALESCE(EXCLUDED."preferredStorageLocationId", "UserProfile"."preferredStorageLocationId"),
    "updatedAt"                  = NOW();

  RETURN QUERY
  SELECT
    p."authUserId",
    p."email",
    p."displayName",
    p."preferredStorageLocationId",
    p."createdAt"::timestamptz,
    p."updatedAt"::timestamptz
  FROM "UserProfile" AS p
  WHERE p."authUserId" = v_current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_current_user_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_current_user_profile(text, text) TO authenticated;
