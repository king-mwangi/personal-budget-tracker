import { createClient } from '@supabase/supabase-js';

// Read variables from import.meta.env with fallback placeholders that users can replace or configure in .env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://fplazoesowrayfixlxzk.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwbGF6b2Vzb3dyYXlmaXhseHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Nzg1MTMsImV4cCI6MjA5NTE1NDUxM30.eG5zsrwUQsntINcfvH9KdkXwLJUC25HZyvL7LMxXXpM';

export const isSupabaseConfigured = 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  supabaseUrl.trim() !== '' &&
  supabaseKey.trim() !== '';

export const getSupabaseClient = (): any => {
  if (isSupabaseConfigured) {
    try {
      return createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
    }
  }
  
  // Return functional fallback mocks when Supabase is not configured or before CDN loaded
  return {
    auth: {
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // Trigger default initial signed out status
        setTimeout(() => callback('INITIAL_SESSION', null), 100);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ 
        data: { session: null, user: null }, 
        error: new Error("Credentials cannot be verified because Supabase is not fully configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.") 
      }),
      signUp: async () => ({ 
        data: { session: null, user: null }, 
        error: new Error("Signup is unavailable because Supabase is not fully configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.") 
      }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => {
      console.warn(`Attempted a read/write to table "${table}" but Supabase is not initialized yet.`);
      return {
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        }),
        insert: () => Promise.resolve({ data: [], error: null }),
        update: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        }),
        upsert: () => Promise.resolve({ data: [], error: null })
      };
    }
  };
};

export const supabase = getSupabaseClient();
