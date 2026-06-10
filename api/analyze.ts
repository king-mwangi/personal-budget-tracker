import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { generateInsightsDirect } from "./insightsEngine";

// Lazy initialized client
let aiInstance: GoogleGenAI | null = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

export default async function handler(req: any, res: any) {
  // Handle CORS options
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    let transactions = req.body?.transactions || [];
    let budgets = req.body?.budgets || [];
    let savingsGoals = req.body?.savingsGoals || [];
    const currency = req.body?.currency || "Ksh";
    const selectedPeriod = req.body?.selectedPeriod || "all";

    // Securely retrieve the authenticated user's records strictly from Supabase using their JWT token
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (token && supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' && supabaseUrl !== 'your_supabase_url_here' && supabaseAnonKey !== 'your_supabase_anon_key_here') {
      try {
        const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });
        
        const { data: dbTransactions } = await supabaseServer.from("transactions").select("*").order("date", { ascending: false });
        const { data: dbBudgets } = await supabaseServer.from("budgets").select("*");
        const { data: dbSavingsGoals } = await supabaseServer.from("savings_goals").select("*");

        if (dbTransactions) transactions = dbTransactions;
        if (dbBudgets) budgets = dbBudgets;
        if (dbSavingsGoals) savingsGoals = dbSavingsGoals;
      } catch (err) {
        console.warn("Could not securely fetch records from Supabase server inside API route:", err);
      }
    }

    // Direct, user-friendly empty state when the user has transition histories of zero records.
    // This blocks LLM hallucinations (like claiming they spent 300 out of 10,000) and saves rate-limits.
    if (transactions.length === 0) {
      return res.status(200).json({
        overallStatus: "On Track",
        summaryMessage: "Welcome to Ledger Smart! Add your monthly income and your first transaction below to unlock your real-time Gemini AI financial diagnostics.",
        actionableInsights: [],
        savingsOpportunities: []
      });
    }

    const ai = getAIClient();
    const result = await generateInsightsDirect({
      transactions,
      budgets,
      savingsGoals,
      currency,
      selectedPeriod,
      ai
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Gemini Vercel Analyze Error:", error);
    const errMsg = error?.message || String(error || "");
    res.status(500).json({
      error: errMsg || "An issue occurred while calling Gemini AI",
    });
  }
}
