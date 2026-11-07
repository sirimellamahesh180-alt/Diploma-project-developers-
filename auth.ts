import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
/** Checks both the verified Supabase session and the server-controlled admin allowlist. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) return { user: null, error: 'Authentication required.' as const };
  const admin = createAdminClient();
  const { data, error: roleError } = await admin.from('admin_users').select('email').eq('email', user.email.toLowerCase()).maybeSingle();
  if (roleError || !data) return { user: null, error: 'Administrator access is not enabled for this account.' as const };
  return { user, error: null };
}
