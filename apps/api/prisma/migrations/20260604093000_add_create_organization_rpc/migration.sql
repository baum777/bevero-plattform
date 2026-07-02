CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(organization_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id text := (SELECT auth.uid())::text;
  new_organization_id text := gen_random_uuid()::text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF organization_name IS NULL OR btrim(organization_name) = '' THEN
    RAISE EXCEPTION 'organization name required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public."OrganizationMember" ("id", "organizationId", "userId", "role")
  VALUES (gen_random_uuid()::text, new_organization_id, current_user_id, 'owner'::public."OrganizationRole");

  RETURN new_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_for_current_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_for_current_user(text) TO authenticated;
