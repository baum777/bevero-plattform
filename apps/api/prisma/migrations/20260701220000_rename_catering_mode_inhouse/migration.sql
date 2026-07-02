-- Phase 4b-1: neutralize customer identity in CateringMode enum value.
ALTER TYPE "public"."CateringMode" RENAME VALUE 'INHOUSE_RAUSCHENBERGER' TO 'INHOUSE';
