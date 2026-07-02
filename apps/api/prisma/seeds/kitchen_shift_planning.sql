-- Phase 1 Schichtplanung: Seed der operativen Bereiche, Checklisten-Aufgaben
-- und der Aufgabenmatrix (helle Kästchen = aktiv, dunkle = inaktiv) aus der
-- Papier-Checkliste.
--
-- DEMO_MODE-gated, id-guarded (ON CONFLICT DO NOTHING). Hängt an der
-- WorkspaceGroup 'wg-mwbb-kitchen' (siehe kitchen_workspace.sql) und deren Org.
-- Reihenfolge: motorworld_inn_standorte.sql → kitchen_workspace.sql → DIESE.

DO $$
DECLARE
  v_org   TEXT;
  v_wg    TEXT := 'wg-mwbb-kitchen';
BEGIN
  IF current_setting('app.demo_mode', true) <> 'true' THEN
    RAISE NOTICE 'DEMO_MODE not set — skipping kitchen_shift_planning seed';
    RETURN;
  END IF;

  SELECT "organization_id" INTO v_org
  FROM "public"."WorkspaceGroup" WHERE "id" = v_wg;

  IF v_org IS NULL THEN
    RAISE NOTICE 'wg-mwbb-kitchen not found — skipping (run kitchen_workspace.sql first)';
    RETURN;
  END IF;

  -- ── kitchen_areas (operative Tagesrollen) ─────────────────────────────────

  INSERT INTO "public"."kitchen_areas"
    ("id", "organizationId", "workspaceGroupId", "slug", "name", "description", "active", "createdAt", "updatedAt")
  VALUES
    ('ka-mwbb-gardemanger', v_org, v_wg, 'gardemanger', 'Gardemanger', 'Kalte Küche', true, NOW(), NOW()),
    ('ka-mwbb-entremetier', v_org, v_wg, 'entremetier', 'Entremetier', 'Beilagen / Gemüse', true, NOW(), NOW()),
    ('ka-mwbb-saucier',     v_org, v_wg, 'saucier',     'Saucier',     'Warme Küche / Fleisch', true, NOW(), NOW())
  ON CONFLICT ("organizationId", "slug") DO NOTHING;

  -- ── checklist_tasks ───────────────────────────────────────────────────────
  -- id-guarded via PK; areaId verweist auf die obigen Bereiche.

  INSERT INTO "public"."checklist_tasks"
    ("id", "organizationId", "workspaceGroupId", "department", "areaId", "title",
     "frequency", "sortOrder", "active", "createdAt", "updatedAt")
  VALUES
    -- Gardemanger
    ('ct-gm-arbeitsflaechen', v_org, v_wg, 'kitchen', 'ka-mwbb-gardemanger', 'Arbeitsflächen reinigen/desinfizieren', 'daily', 1, true, NOW(), NOW()),
    ('ct-gm-saladette',       v_org, v_wg, 'kitchen', 'ka-mwbb-gardemanger', 'Saladette reinigen und Behälter wechseln', 'daily', 2, true, NOW(), NOW()),
    ('ct-gm-aufschnitt',      v_org, v_wg, 'kitchen', 'ka-mwbb-gardemanger', 'Aufschnittmaschine reinigen und ausschalten', 'daily', 3, true, NOW(), NOW()),
    ('ct-gm-lueftung',        v_org, v_wg, 'kitchen', 'ka-mwbb-gardemanger', 'Lüftung reinigen', 'alternating', 4, true, NOW(), NOW()),
    ('ct-gm-kuehlhaus',       v_org, v_wg, 'kitchen', 'ka-mwbb-gardemanger', 'Kühlhaus aufräumen und Boden reinigen', 'alternating', 5, true, NOW(), NOW()),
    -- Saucier
    ('ct-sa-fritteuse',       v_org, v_wg, 'kitchen', 'ka-mwbb-saucier', 'Fritteuse reinigen, ausschalten, filtern', 'daily', 1, true, NOW(), NOW()),
    ('ct-sa-grill',           v_org, v_wg, 'kitchen', 'ka-mwbb-saucier', 'Grill reinigen und ausschalten', 'daily', 2, true, NOW(), NOW()),
    -- Entremetier
    ('ct-en-pastakocher',     v_org, v_wg, 'kitchen', 'ka-mwbb-entremetier', 'Pastakocher entleeren und reinigen', 'daily', 1, true, NOW(), NOW()),
    ('ct-en-gewuerz',         v_org, v_wg, 'kitchen', 'ka-mwbb-entremetier', 'Gewürzbehälter reinigen', 'alternating', 2, true, NOW(), NOW())
  ON CONFLICT ("id") DO NOTHING;

  -- ── task_day_matrix ───────────────────────────────────────────────────────
  -- Wochentage: Mo Di Mi Do Fr Sa So. true = aktiv (helles Kästchen).

  INSERT INTO "public"."task_day_matrix"
    ("id", "organizationId", "taskId", "areaId",
     "mondayActive", "tuesdayActive", "wednesdayActive", "thursdayActive",
     "fridayActive", "saturdayActive", "sundayActive", "createdAt", "updatedAt")
  VALUES
    -- Gardemanger
    ('tdm-gm-arbeitsflaechen', v_org, 'ct-gm-arbeitsflaechen', 'ka-mwbb-gardemanger', true,  true,  true,  true,  true,  true,  true,  NOW(), NOW()),
    ('tdm-gm-saladette',       v_org, 'ct-gm-saladette',       'ka-mwbb-gardemanger', true,  true,  true,  true,  true,  true,  true,  NOW(), NOW()),
    ('tdm-gm-aufschnitt',      v_org, 'ct-gm-aufschnitt',      'ka-mwbb-gardemanger', true,  true,  true,  true,  true,  true,  true,  NOW(), NOW()),
    ('tdm-gm-lueftung',        v_org, 'ct-gm-lueftung',        'ka-mwbb-gardemanger', true,  false, true,  false, true,  false, true,  NOW(), NOW()),
    ('tdm-gm-kuehlhaus',       v_org, 'ct-gm-kuehlhaus',       'ka-mwbb-gardemanger', false, true,  false, true,  false, true,  false, NOW(), NOW()),
    -- Saucier
    ('tdm-sa-fritteuse',       v_org, 'ct-sa-fritteuse',       'ka-mwbb-saucier',     true,  true,  true,  true,  true,  true,  true,  NOW(), NOW()),
    ('tdm-sa-grill',           v_org, 'ct-sa-grill',           'ka-mwbb-saucier',     true,  true,  true,  true,  true,  true,  true,  NOW(), NOW()),
    -- Entremetier
    ('tdm-en-pastakocher',     v_org, 'ct-en-pastakocher',     'ka-mwbb-entremetier', true,  true,  true,  true,  true,  true,  true,  NOW(), NOW()),
    ('tdm-en-gewuerz',         v_org, 'ct-en-gewuerz',         'ka-mwbb-entremetier', true,  false, true,  false, true,  false, true,  NOW(), NOW())
  ON CONFLICT ("taskId", "areaId") DO NOTHING;

  RAISE NOTICE 'kitchen_shift_planning seed complete: 3 areas, 9 tasks, 9 matrix rows';
END $$;
