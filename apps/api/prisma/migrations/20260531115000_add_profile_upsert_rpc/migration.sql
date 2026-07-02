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
SECURITY DEFINER
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

  SELECT u.email
  INTO current_email
  FROM auth.users AS u
  WHERE u.id = current_user_id;

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
    COALESCE(current_email, CONCAT(current_user_id::text, '@unknown.local')),
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

GRANT EXECUTE ON FUNCTION public.upsert_current_user_profile(text, text) TO authenticated;
