import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Handle CORS options
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const rawAuthHeader = req.headers?.authorization || req.headers?.Authorization;
    const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseUrl === 'your_supabase_url_here' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY' || supabaseAnonKey === 'your_supabase_anon_key_here') {
      return res.status(500).json({ error: "Configuration Error: Supabase coordinates are not configured on the server." });
    }

    // 1. Create client with user's token to securely identify the user ID
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired session: " + (userError?.message || "") });
    }

    const userId = user.id;
    console.log(`[ACCOUNT DELETION INITIATED] User ID: ${userId}, Email: ${user.email}`);

    // 2. Select appropriate client for deletions (Service role client is preferred to clean up cleanly and bypass RLS constraints if needed)
    const deleteClient = supabaseServiceRoleKey && supabaseServiceRoleKey.trim() !== "" && supabaseServiceRoleKey !== 'your_supabase_service_role_key_here'
      ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : userSupabase;

    // Database tables holding user-specific statistics and entries
    const tables = [
      'transactions',
      'budgets',
      'savings_goals',
      'budget_templates',
      'recurring_transactions',
      'chat_messages',
      'snapshots'
    ];

    const deletionErrors: string[] = [];
    for (const table of tables) {
      try {
        const { error } = await deleteClient.from(table).delete().eq('user_id', userId);
        if (error) {
          console.error(`Error deleting from table ${table}:`, error);
          deletionErrors.push(`${table}: ${error.message}`);
        } else {
          console.log(`[DELETE] Successfully purged database table: "${table}" for user ID: ${userId}`);
        }
      } catch (tableErr: any) {
        console.error(`Exception deleting from table ${table}:`, tableErr);
        deletionErrors.push(`${table}: ${tableErr?.message || String(tableErr)}`);
      }
    }

    // 3. Delete from Supabase auth.users using the service role admin API if available
    let authAccountDeleted = false;
    if (supabaseServiceRoleKey && supabaseServiceRoleKey.trim() !== "" && supabaseServiceRoleKey !== 'your_supabase_service_role_key_here') {
      try {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        const { error: adminDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);
        if (adminDeleteError) {
          console.error("[ADMIN DELETION] Auth user deletion error:", adminDeleteError);
          deletionErrors.push(`Supabase Auth Account: ${adminDeleteError.message}`);
        } else {
          console.log(`[ADMIN DELETION] Successfully deleted Auth User: ${userId} from auth.users`);
          authAccountDeleted = true;
        }
      } catch (authErr: any) {
        console.error("[ADMIN DELETION] Auth deletion exception:", authErr);
        deletionErrors.push(`Supabase Auth Account exception: ${authErr?.message || String(authErr)}`);
      }
    }

    if (deletionErrors.length > 0) {
      console.warn(`[ACCOUNT DELETION COMPLETED WITH WARNS] User: ${userId}, Issues: ${deletionErrors.join(', ')}`);
    } else {
      console.log(`[ACCOUNT DELETION SUCCESSFUL] Full purge completed for User ID: ${userId}`);
    }

    return res.status(200).json({
      success: true,
      message: "Your financial logs and account credentials have been permanently deleted.",
      authDeleted: authAccountDeleted,
      errors: deletionErrors.length > 0 ? deletionErrors : undefined
    });

  } catch (err: any) {
    console.error("[DELETE ACCOUNT UNHANDLED ERROR]:", err);
    return res.status(500).json({ error: err?.message || "An unexpected error occurred during account deletion." });
  }
}
