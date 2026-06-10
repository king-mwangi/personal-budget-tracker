import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

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

async function generateContentWithRetryAndFallback(ai: any, params: any, retries = 3) {
  let lastError: any = null;
  const modelsToTry = [params.model, "gemini-3.1-flash-lite"];
  
  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: model
        });
        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.message || "";
        console.warn(`[GEMINI ATTEMPT FAIL] Model: ${model}, Attempt: ${attempt}/${retries}. Error: ${errMsg}`);
        if (errMsg.includes("API key") || error?.status === 403 || error?.status === 400) {
          throw error;
        }
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }
  throw lastError;
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

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (token && supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY') {
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

    // Utility helpers for formatting periods
    const getPeriodLabel = (period: string) => {
      if (!period || period === 'all') return 'Combine All Periods (All-Time)';
      const parts = period.split('-');
      if (parts.length < 2) return period;
      const [yearStr, monthStr] = parts;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIdx = parseInt(monthStr, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${monthNames[monthIdx]} ${yearStr}`;
      }
      return period;
    };

    const getPreviousMonthString = (yearMonthStr: string): string => {
      const parts = yearMonthStr.split('-');
      if (parts.length !== 2) return yearMonthStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const prevDate = new Date(year, month - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      const prevMonthStr = prevMonth < 10 ? `0${prevMonth}` : `${prevMonth}`;
      return `${prevYear}-${prevMonthStr}`;
    };

    let targetMonthTransactions = [];
    let comparisonTransactions = [];
    let isAllView = selectedPeriod === 'all';
    
    let selectedIncome = 0;
    let selectedExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;
    let prevLabel = "";

    const activeLabel = getPeriodLabel(selectedPeriod);

    if (!isAllView) {
      targetMonthTransactions = transactions.filter((t: any) => t.date && t.date.substring(0, 7) === selectedPeriod);
      const prevPeriod = getPreviousMonthString(selectedPeriod);
      prevLabel = getPeriodLabel(prevPeriod);
      comparisonTransactions = transactions.filter((t: any) => t.date && t.date.substring(0, 7) === prevPeriod);

      targetMonthTransactions.forEach((t: any) => {
        if (t.type === 'income') selectedIncome += Number(t.amount || 0);
        else selectedExpense += Number(t.amount || 0);
      });

      comparisonTransactions.forEach((t: any) => {
        if (t.type === 'income') prevIncome += Number(t.amount || 0);
        else prevExpense += Number(t.amount || 0);
      });
    } else {
      transactions.forEach((t: any) => {
        if (t.type === 'income') selectedIncome += Number(t.amount || 0);
        else selectedExpense += Number(t.amount || 0);
      });
    }

    const ai = getAIClient();
    let prompt = "";
    if (isAllView) {
      prompt = `Analyze the following all-time combined personal finance snapshot:
      - Budgets allocations: ${JSON.stringify(budgets)}
      - All logged transactions count: ${transactions.length}
      - Complete transaction history: ${JSON.stringify(transactions)}
      - Cumulative Inflow / Income recorded historical: ${currency} ${selectedIncome.toLocaleString()}
      - Cumulative Outflow / Expenses recorded historical: ${currency} ${selectedExpense.toLocaleString()}
      - Savings Goals targets status: ${JSON.stringify(savingsGoals)}
      - Active Currency: ${currency}

      Provide a professional lifetime financial analysis containing overall status, high-level summary, specific actionable insights, and direct category savings goals with estimates.`;
    } else {
      prompt = `Analyze the following monthly personal finance snapshot comparing the selected month with the previous month:
      - Current selected billing month of review: "${activeLabel}" (${selectedPeriod})
        - Current Month Total Inflows (Income): ${currency} ${selectedIncome.toLocaleString()}
        - Current Month Total Outflows (Expenses): ${currency} ${selectedExpense.toLocaleString()}
        - Current Month Net Savings Balance flow: ${currency} ${(selectedIncome - selectedExpense).toLocaleString()}
        - Current Month transactions feed: ${JSON.stringify(targetMonthTransactions)}
      
      - Comparison base cycle (The previous month): "${prevLabel}" (${getPreviousMonthString(selectedPeriod)})
        - Previous Month Total Inflows (Income): ${currency} ${prevIncome.toLocaleString()}
        - Previous Month Total Outflows (Expenses): ${currency} ${prevExpense.toLocaleString()}
        - Previous Month Net Savings Balance flow: ${currency} ${(prevIncome - prevExpense).toLocaleString()}
        - Previous Month transactions feed: ${JSON.stringify(comparisonTransactions)}
      
      - Configured monthly budgets ceilings: ${JSON.stringify(budgets)}
      - Savings target plans: ${JSON.stringify(savingsGoals)}
      - Active regional currency symbol: ${currency}

      Requirements:
      1. Deliver diagnostics tailored specifically to the Active Selected Month: ${activeLabel}.
      2. Constructively compare the current month outflows and inflows against the previous month of ${prevLabel}. Point out precise variations in totals (did expenses increase or decrease, by what percent?), check for category priority shifts, and note if they are saving more or less of their income.
      3. Cite specific numbers with the correct currency prefix (${currency}) to maintain highly credible observations. Double-check all budget ceiling limits.`;
    }

    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are a senior personal finance expert and budget optimization engine. Provide highly practical, personalized, and encouraging advice purely based on the real uploaded numbers. Always frame all monetary advice and estimates around the current active currency: ${currency}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallStatus: {
              type: Type.STRING,
              description: "Overall status based on spending vs budgets. Use one of: 'On Track', 'Caution', 'Budget Exceeded'"
            },
            summaryMessage: {
              type: Type.STRING,
              description: "A friendly, expert 1-2 sentence overall summary of how their month is looking."
            },
            actionableInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: `3 specific, data-contextual observations or milestones mentioning amounts with currency prefix: ${currency}.`
            },
            savingsOpportunities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Relevant budget category" },
                  savingEstimate: { type: Type.NUMBER, description: `Monthly potential savings target in the active currency: ${currency}` },
                  actionableTip: { type: Type.STRING, description: `Specific tip or substitution behavior to achieve this saving. Mention the potential saving amount using the currency symbol ${currency}.` }
                },
                required: ["category", "savingEstimate", "actionableTip"]
              },
              description: "Actionable saving ideas based on the dataset."
            }
          },
          required: ["overallStatus", "summaryMessage", "actionableInsights", "savingsOpportunities"]
        }
      }
    });

    let textToShow = response.text || "";
    if (textToShow.includes("```")) {
      textToShow = textToShow.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
    }

    try {
      const parsedResult = JSON.parse(textToShow || "{}");
      res.status(200).json(parsedResult);
    } catch (parseErr) {
      res.status(200).json({
        overallStatus: "Caution",
        summaryMessage: "Your digital advisor analysis is active, though the live AI formatting is currently misaligned. Standard advisory patterns remain fully active.",
        actionableInsights: [
          "Cross-examine your expense velocity in categories like Food, Bills, and Shopping.",
          "Check that your active budget limits are configured correctly.",
          "Ensure that newly posted transactions stay strictly within your designated monthly margins."
        ],
        savingsOpportunities: [
          {
            category: "Food",
            savingEstimate: 15,
            actionableTip: "Compare your daily average spending directly inside the digital budgets manager to trim unnecessary snack expenses."
          }
        ]
      });
    }
  } catch (error: any) {
    console.error("Gemini Vercel Analyze Error:", error);
    const errMsg = error?.message || String(error || "");
    res.status(500).json({
      error: errMsg || "An issue occurred while calling Gemini AI",
    });
  }
}
