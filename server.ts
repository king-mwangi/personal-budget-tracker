import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for lazy loading Gemini API safely to prevent startup failure if key is missing
let aiInstance: GoogleGenAI | null = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please define it in your AI Studio secrets or local environment.");
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

async function handleInsightsRequest(req: any, res: any) {
  try {
    let transactions = req.body?.transactions || [];
    let budgets = req.body?.budgets || [];
    let savingsGoals = req.body?.savingsGoals || [];
    const currency = req.body?.currency || "Ksh";

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
        console.warn("Could not securely fetch records from Supabase server inside Express API handler:", err);
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
    const prompt = `Analyze the following monthly personal finance snapshot:
    - Budgets: ${JSON.stringify(budgets)}
    - Transactions: ${JSON.stringify(transactions)}
    - Savings Goals: ${JSON.stringify(savingsGoals)}
    - Active Currency: ${currency}

    Provide a professional financial analysis containing overall status, high-level summary, specific actionable insights (noticing specific overspends or saving patterns), and direct category savings goals with estimates.`;

    const response = await ai.models.generateContent({
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
              description: `3 specific, data-contextual observations or milestones (e.g. food is of high velocity, or savings rate looks great) mentioning amounts with currency prefix: ${currency}.`
            },
            savingsOpportunities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Relevant budget category (e.g. Food, Utilities)" },
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
    // Clean up potential markdown wrapper codeblocks (```json ... ```)
    if (textToShow.includes("```")) {
      textToShow = textToShow.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
    }

    try {
      const parsedResult = JSON.parse(textToShow || "{}");
      res.json(parsedResult);
    } catch (parseErr) {
      console.warn("Invalid JSON structure returned by Gemini model, sending structured fallback instead.", parseErr);
      res.json({
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
    console.error("Gemini Insights Error:", error);
    const errMsg = error?.message || String(error || "");
    const isKeyMissing = !process.env.GEMINI_API_KEY;
    let status = 500;
    if (errMsg.includes("GEMINI_API_KEY")) {
      status = 403;
    } else if (error?.status === 429 || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      status = 429;
    }
    res.status(status).json({
      error: errMsg || "An issue occurred while calling Gemini AI",
      isKeyMissing
    });
  }
}

// AI Insights Generator - Runs structured diagnostic on the user's budgets and logs
app.post("/api/insights", handleInsightsRequest);
app.post("/api/analyze", handleInsightsRequest);

// AI Advisor Chat Bot - Supports conversation informed by current accounts status
app.post("/api/advisor", async (req, res) => {
  try {
    const { messages = [], transactions = [], budgets = [], savingsGoals = [], currency = "Ksh" } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const ai = getAIClient();

    // Map system context instruction incorporating financial records and current currency
    const systemInstruction = `You are "Gemini Wealth Advisor", a supportive, professional, and practical personal finance chatbot assistant.
    You have direct access to the user's monthly budgets, recent transactions logs, and savings goals:
    - Budgets: ${JSON.stringify(budgets)}
    - Transactions: ${JSON.stringify(transactions)}
    - Savings Goals: ${JSON.stringify(savingsGoals)}
    - Active Currency: ${currency}

    Guidance rules:
    1. Ground advice strictly in their realistic spending if applicable. All mentions of money must match the active currency (${currency}).
    2. Suggest concrete savings tips, budgeting principles (e.g., 50/30/20 rule), or retirement views.
    3. Keep answers concise, highly structured (use double newlines and clean bold markers), and encouraging.
    4. Provide numbered lists for action points.
    5. Be fully honest. If their current spending rate will blow their goal, point it out productively.
    6. Maintain a professional, empathetic, and objective style. Do not invent fake account numbers or fake transactions outside of their real logs.
    `;

    // Map past chat history for model context
    // The @google/genai SDK chats requires history or user inputs passed logically.
    // Rather than complex multi-turn structure, we can pass formatted contents representing user and model.
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Advisor Error:", error);
    const errMsg = error?.message || String(error || "");
    const isKeyMissing = !process.env.GEMINI_API_KEY;
    let status = 500;
    if (errMsg.includes("GEMINI_API_KEY")) {
      status = 403;
    } else if (error?.status === 429 || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      status = 429;
    }
    res.status(status).json({
      error: errMsg || "An issue occurred while calling Gemini AI",
      isKeyMissing
    });
  }
});

// Supabase OAuth Callback Endpoint - exchanges code for token and messages opener
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const code = req.query.code as string;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY') {
    try {
      const serverSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      const { data, error } = await serverSupabase.auth.exchangeCodeForSession(code);
      if (error) {
        throw error;
      }
      const session = data?.session;

      // Beautiful responsive layout with auto-closing popup messaging the opener window
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Ledger Smart Secure Authentication State</title>
          </head>
          <body style="background:#0f172a;color:#ffffff;font-family:ui-sans-serif,system-ui,sans-serif;margin:0;padding:20px;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
            <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;max-width:360px;width:100%;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);">
              <div style="width:40px;height:40px;border:3px solid #334155;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
              <p style="font-size:15px;font-weight:700;margin:0 0 6px;">Synchronizing vault access...</p>
              <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5;">Your secure portfolio session is being established. This window will close automatically.</p>
            </div>
            <style>
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
            <script>
              const originStr = window.location.origin;
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  session: ${JSON.stringify(session)}
                }, '*');
                setTimeout(() => window.close(), 100);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Auth callback exchange error:", err);
      const errMsg = err?.message || String(err || "");
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Authentication Failed</title>
          </head>
          <body style="background:#0f172a;color:#ffffff;font-family:ui-sans-serif,system-ui,sans-serif;margin:0;padding:20px;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
            <div style="background:#1e293b;border:1px solid #ef444430;border-radius:16px;padding:32px;max-width:360px;width:100%;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);">
              <div style="width:44px;height:44px;line-height:44px;background:#ef444420;color:#ef4444;border-radius:50%;font-size:20px;font-weight:bold;margin:0 auto 20px;">!</div>
              <p style="font-size:15px;font-weight:700;margin:0 0 6px;color:#f87171;">Authentication Failed</p>
              <p style="font-size:12px;color:#94a3b8;margin:0 0 20px;line-height:1.5;">${errMsg}</p>
              <button onclick="window.close()" style="background:#ef4444;color:#ffffff;border:none;padding:10px 18px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.2s;">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_ERROR', 
                  error: ${JSON.stringify(errMsg)}
                }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }
  } else {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <body style="background:#0f172a;color:#ffffff;font-family:sans-serif;padding:40px;text-align:center;">
          <p style="color:#ef4444;font-weight:bold;">Security Warning</p>
          <p style="font-size:13px;color:#94a3b8;">Auth exchange coordinates not fulfilled or Supabase keys undefined.</p>
          <button onclick="window.close()" style="background:#ef4444;color:#ffffff;border:none;padding:10px 18px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.2s;">Close Window</button>
        </body>
      </html>
    `);
  }
});

// Setup Vite Dev Server / Static Hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static files server configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
