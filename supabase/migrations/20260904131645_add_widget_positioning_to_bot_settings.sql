/*
# Widget positioning and engagement fields on bot_settings

Adds four optional fields controlling how the chat widget renders and behaves on
tenant sites. Existing rows keep working: defaults are set so any pre-existing
bot_settings row instantly gets sensible values.

1. Modified Tables
- `bot_settings`
- `position` (text, default 'bottom-right') — which corner the launcher appears in
- `bottom_offset` (integer, default 20) — pixels above the viewport bottom
- `enable_pulse` (boolean, default true) — whether the pulse/glow animation plays
- `open_on_hover` (boolean, default false) — whether the widget auto-opens on hover

2. Security
- No RLS changes. Existing owner-scoped policies on `bot_settings` continue to apply.

3. Notes
1. All columns are added conditionally using an idempotent DO block so the migration is safe to re-run.
2. `position` is a plain text column with a CHECK constraint restricting it to 'bottom-right' or 'bottom-left'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bot_settings' AND column_name = 'position'
  ) THEN
    ALTER TABLE bot_settings ADD COLUMN position text NOT NULL DEFAULT 'bottom-right';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bot_settings' AND column_name = 'bottom_offset'
  ) THEN
    ALTER TABLE bot_settings ADD COLUMN bottom_offset integer NOT NULL DEFAULT 20;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bot_settings' AND column_name = 'enable_pulse'
  ) THEN
    ALTER TABLE bot_settings ADD COLUMN enable_pulse boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bot_settings' AND column_name = 'open_on_hover'
  ) THEN
    ALTER TABLE bot_settings ADD COLUMN open_on_hover boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'bot_settings' AND constraint_name = 'bot_settings_position_check'
  ) THEN
    ALTER TABLE bot_settings
      ADD CONSTRAINT bot_settings_position_check
      CHECK (position IN ('bottom-right', 'bottom-left'));
  END IF;
END $$;
