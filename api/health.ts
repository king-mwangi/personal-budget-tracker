import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ 
        status: "error", 
        message: "Configuration Error: Supabase coordinates are missing on the server." 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Perform a lightweight query to register activity on Supabase.
    // Pinging any table in the schema (even if it's empty or restricted) will trigger a Postgres query,
    // which effectively acts as database activity to prevent Supabase from pausing.
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .limit(1);

    if (error) {
      // If there's an RLS permission error or other database-level issue,
      // the query STILL successfully hit the database, registering activity.
      return res.status(200).json({
        status: "warning",
        message: "Database was successfully pinged, but returned a warning. This still counts as database activity.",
        details: error.message,
        time: new Date().toISOString()
      });
    }

    return res.status(200).json({
      status: "ok",
      message: "Database is active and successfully pinged.",
      time: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "error",
      message: err?.message || "An unexpected error occurred.",
      time: new Date().toISOString()
    });
  }
}
