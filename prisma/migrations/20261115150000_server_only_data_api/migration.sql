-- Auth.js sessions are validated by the application, not by Supabase Auth.
-- Application tables are server-only: Data API JWTs must never gain direct
-- access. Prisma connects as the trusted server database owner. Do not add
-- auth.uid() policies until the separately approved Auth migration exists.
DO $$
DECLARE
  table_name text;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User', 'Account', 'Session', 'VerificationToken', 'Workspace',
    'WorkspaceMember', 'Wedding', 'Event', 'Guest', 'RsvpSubmission',
    'FamilyMember', 'RsvpEventResponse', 'CustomQuestion', 'Answer',
    'AuditLog', 'RateLimit', 'Plan', 'Subscription', 'Payment', 'UsageRecord',
    'GroupInvitation', 'PlatformSettings', 'PlatformSettingsAudit',
    'PolicyAcceptance', 'PlatformAdminAudit', 'PasswordResetToken',
    'GuestImport', 'WeddingDeletionJob', 'WeddingReminder',
    'AdminMfaCredential', 'WeddingSetupDraft'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
