-- OrganizationInvite: token-based invite system for team onboarding.
-- Admin/Owner creates an invite with a token; the invited user opens
-- /invite/<token>, authenticates, and calls accept_organization_invite().

CREATE TYPE public."InviteStatus" AS ENUM ('pending', 'accepted', 'revoked');

CREATE TABLE public."OrganizationInvite" (
  "id"              TEXT        NOT NULL,
  "organizationId"  TEXT        NOT NULL,
  "email"           TEXT        NOT NULL,
  "role"            public."OrganizationRole" NOT NULL DEFAULT 'staff',
  "token"           TEXT        NOT NULL,
  "status"          public."InviteStatus" NOT NULL DEFAULT 'pending',
  "invitedByUserId" TEXT        NOT NULL,
  "expiresAt"       TIMESTAMPTZ NOT NULL,
  "acceptedAt"      TIMESTAMPTZ,
  "revokedAt"       TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationInvite_token_key"
  ON public."OrganizationInvite" ("token");

CREATE INDEX "OrganizationInvite_organizationId_idx"
  ON public."OrganizationInvite" ("organizationId");

CREATE INDEX "OrganizationInvite_organizationId_status_idx"
  ON public."OrganizationInvite" ("organizationId", "status");

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public."OrganizationInvite" ENABLE ROW LEVEL SECURITY;

-- Org members (any role) can see their org's invites (for the team-settings page)
CREATE POLICY "org_invite_member_select" ON public."OrganizationInvite"
  FOR SELECT TO authenticated
  USING (
    "organizationId" IN (
      SELECT "organizationId" FROM public."OrganizationMember"
      WHERE "userId" = auth.uid()::text
    )
  );

-- Any authenticated user can read a *pending, non-expired* invite by token.
-- The token itself is the authorization; it is shown only to org admins.
CREATE POLICY "org_invite_token_select" ON public."OrganizationInvite"
  FOR SELECT TO authenticated
  USING (
    status = 'pending'
    AND "expiresAt" > NOW()
  );

-- ── accept_organization_invite RPC ───────────────────────────────────────────
-- Runs as SECURITY DEFINER to bypass RLS when creating the OrganizationMember
-- row and updating the invite status.

CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id        text;
  v_invite_id      text;
  v_org_id         text;
  v_role           public."OrganizationRole";
  v_expires_at     timestamptz;
  v_status         public."InviteStatus";
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required'
      USING ERRCODE = '28000';
  END IF;

  SELECT id, "organizationId", role, "expiresAt", status
    INTO v_invite_id, v_org_id, v_role, v_expires_at, v_status
    FROM "OrganizationInvite"
   WHERE token = p_token
   LIMIT 1;

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'invite not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'invite is no longer valid (status: %)', v_status
      USING ERRCODE = '23514';
  END IF;

  IF v_expires_at < NOW() THEN
    RAISE EXCEPTION 'invite has expired'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "OrganizationMember"
    WHERE "organizationId" = v_org_id AND "userId" = v_user_id
  ) THEN
    RAISE EXCEPTION 'already a member of this organization'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role")
  VALUES (gen_random_uuid()::text, v_org_id, v_user_id, v_role);

  UPDATE "OrganizationInvite"
     SET status      = 'accepted',
         "acceptedAt" = NOW(),
         "updatedAt"  = NOW()
   WHERE id = v_invite_id;

  RETURN jsonb_build_object('organizationId', v_org_id, 'role', v_role::text);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(text) TO authenticated;
