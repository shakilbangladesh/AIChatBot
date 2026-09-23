/*
# Add RLS policies to existing tables

## Overview
Adds owner-scoped RLS policies to bot_settings, knowledge_base, and bot_leads tables.
All tables use `client_id` as the owner column which defaults to auth.uid().

## Security Changes
- bot_settings: CRUD policies scoped to authenticated users matching client_id = auth.uid()
- knowledge_base: CRUD policies scoped to authenticated users matching client_id = auth.uid()
- bot_leads: CRUD policies scoped to authenticated users matching client_id = auth.uid()

## Notes
1. Policies use DROP IF EXISTS before CREATE to ensure idempotency.
2. All tables already have RLS enabled.
*/

-- bot_settings policies
DROP POLICY IF EXISTS "select_own_bot_settings" ON bot_settings;
CREATE POLICY "select_own_bot_settings" ON bot_settings FOR SELECT
  TO authenticated USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "insert_own_bot_settings" ON bot_settings;
CREATE POLICY "insert_own_bot_settings" ON bot_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_own_bot_settings" ON bot_settings;
CREATE POLICY "update_own_bot_settings" ON bot_settings FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "delete_own_bot_settings" ON bot_settings;
CREATE POLICY "delete_own_bot_settings" ON bot_settings FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- knowledge_base policies
DROP POLICY IF EXISTS "select_own_knowledge_base" ON knowledge_base;
CREATE POLICY "select_own_knowledge_base" ON knowledge_base FOR SELECT
  TO authenticated USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "insert_own_knowledge_base" ON knowledge_base;
CREATE POLICY "insert_own_knowledge_base" ON knowledge_base FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_own_knowledge_base" ON knowledge_base;
CREATE POLICY "update_own_knowledge_base" ON knowledge_base FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "delete_own_knowledge_base" ON knowledge_base;
CREATE POLICY "delete_own_knowledge_base" ON knowledge_base FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- bot_leads policies
DROP POLICY IF EXISTS "select_own_bot_leads" ON bot_leads;
CREATE POLICY "select_own_bot_leads" ON bot_leads FOR SELECT
  TO authenticated USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "insert_own_bot_leads" ON bot_leads;
CREATE POLICY "insert_own_bot_leads" ON bot_leads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_own_bot_leads" ON bot_leads;
CREATE POLICY "update_own_bot_leads" ON bot_leads FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "delete_own_bot_leads" ON bot_leads;
CREATE POLICY "delete_own_bot_leads" ON bot_leads FOR DELETE
  TO authenticated USING (auth.uid() = client_id);
