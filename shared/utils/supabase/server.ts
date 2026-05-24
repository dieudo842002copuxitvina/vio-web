// FSD entry point — re-exports the canonical server client from lib/.
// New feature code imports from '@/shared/utils/supabase/server';
// existing pages that import from '@/lib/supabase/server' are unaffected.
export { createClient, createAdminClient } from '@/lib/supabase/server'
