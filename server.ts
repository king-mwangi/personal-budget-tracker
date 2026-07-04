import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import deleteAccountHandler from "./api/delete-account";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// Durable helper for retries and fallback
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

function summarizeFinancialData(transactions: any[], budgets: any[], goals: any[], currency: string) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  // Group expenses by category
  const byCategory: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  });

  return {
    transactionCount: transactions.length,
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0',
    topExpenseCategories: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, amt]) => ({ category: cat, amount: amt })),
    budgets,
    goals: goals.map(g => ({ name: g.name, target: g.target, current: g.current, deadline: g.deadline })),
    currency
  };
}

// AI Advisor Chat Bot - Supports conversation informed by current accounts status
app.post("/api/advisor", async (req, res) => {
  try {
    const { messages = [], transactions = [], budgets = [], savingsGoals = [], currency = "Ksh" } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const ai = getAIClient();

    const summary = summarizeFinancialData(transactions, budgets, savingsGoals, currency);
    const recentTransactions = transactions.slice(-20);

    // Map system context instruction incorporating financial records and current currency
    const systemInstruction = `You are "Gemini Wealth Advisor", a supportive, professional, and practical personal finance chatbot assistant.
    You have direct access to the user's computed financial summary and recent transactions:
    - Financial Summary: ${JSON.stringify(summary)}
    - Recent Transactions (Last 20): ${JSON.stringify(recentTransactions)}
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

    const response = await generateContentWithRetryAndFallback(ai, {
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

// Dispatch Statement Email - sends PDF statement directly to recipient
app.post("/api/send-report", async (req: any, res: any) => {
  try {
    const { toEmail, pdfBase64, monthLabel, reportId } = req.body;
    if (!toEmail) {
      return res.status(400).json({ error: "Recipient email address is required" });
    }
    if (!pdfBase64) {
      return res.status(400).json({ error: "PDF document data is required" });
    }

    // Attempt to convert the base64 string back into a Buffer for attaching
    // Standard format from PDF generation: "data:application/pdf;base64,JVBERi1..."
    const cleanBase64 = pdfBase64.includes("base64,") 
      ? pdfBase64.split("base64,")[1] 
      : pdfBase64;
    
    const buffer = Buffer.from(cleanBase64, 'base64');

    const host = (process.env.SMTP_HOST || "").trim();
    const portStr = (process.env.SMTP_PORT || "").trim();
    const port = parseInt(portStr || "587");
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();
    
    // Dynamically align the FROM address to match the authenticated user for perfect SPF/DKIM/DMARC server delivery.
    let from = (process.env.SMTP_FROM || "").trim();
    if (!from) {
      if (user && user.includes("@")) {
        from = `"Portfolio Ledger" <${user}>`;
      } else {
        from = '"Portfolio Ledger" <no-reply@portfolioledger.com>';
      }
    }

    const subject = `Ledger Financial Statement [Period: ${monthLabel || "Monthly Report"}]`;
    const htmlBody = `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #1e3a8a; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Ledger Statement Dispatch</h2>
          <p style="font-size: 11px; color: #64748b; font-weight: bold; margin: 2px 0 0 0; font-family: monospace;">FINANCIAL SUMMARY REPORT</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.5; color: #334155;">Hello,</p>
        
        <p style="font-size: 14px; line-height: 1.5; color: #1e293b; font-weight: 600;">Your requested Ledger financial statement has been successfully compiled and sent.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Report Period:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #1e293b;">${monthLabel || "Monthly Statement"}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Document ID:</td>
              <td style="padding: 4px 0; text-align: right; font-family: monospace; color: #0284c7;">${reportId || "LGR-RPT-N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Sent Timestamp:</td>
              <td style="padding: 4px 0; text-align: right; color: #475569;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 13px; line-height: 1.5; color: #475569;">The secure PDF report has been compiled and is attached directly to this email for your immediate review, offline saving, or printing.</p>
        
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; text-align: center; font-size: 10px; color: #94a3b8; font-family: monospace;">
          <p style="margin: 0; font-weight: bold;">PORTFOLIO CLIENT LEDGER</p>
          <p style="margin: 2px 0 0 0;">This transmission is intended solely for the recipient.</p>
        </div>
      </div>
    `;

    console.log(`[SMTP INFO] Host: "${host}", Port: ${port}, User: "${user}", Pass configured: ${!!pass}, From: "${from}"`);

    if (host && user && pass) {
      // Use configured SMTP credentials
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for port 465, false for 587 or other ports
        auth: { user, pass },
        tls: {
          // Prevent handshake failures on standard servers
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        html: htmlBody,
        attachments: [
          {
            filename: `Ledger_Financial_Statement_${monthLabel || "report"}.pdf`,
            content: buffer,
            contentType: 'application/pdf'
          }
        ]
      });

      console.log(`Email compiled and sent successfully via SMTP to ${toEmail}`);
      return res.json({ 
        success: true, 
        message: `Financial snapshot report for ${monthLabel} compiled and dispatched successfully via secure SMTP transport to ${toEmail}.`,
        details: "SMTP transmission successfully closed."
      });
    } else {
      // Graceful offline simulated delivery fallback (extremely useful for AI Studio sandbox testing)
      console.log(`[SIMULATED EMAIL DISPATCH] Recipient: ${toEmail}`);
      console.log(`[SIMULATED EMAIL DISPATCH] Subject: ${subject}`);
      console.log(`[SIMULATED EMAIL DISPATCH] PDF attached: (${buffer.length} bytes base64)`);
      
      // Simulating a real transport delivery latency
      await new Promise(resolve => setTimeout(resolve, 1550));

      const missingVars = [];
      if (!host) missingVars.push("SMTP_HOST");
      if (!user) missingVars.push("SMTP_USER");
      if (!pass) missingVars.push("SMTP_PASS");

      return res.json({
        success: true,
        isSimulated: true,
        message: `Financial snapshot report for ${monthLabel} compiled and dispatched successfully (simulated) to ${toEmail}.`,
        details: `Notice: Offline simulation mode fallback activated because these SMTP environment variables were not defined or empty: ${missingVars.join(", ")}. Check your app variables setup.`
      });
    }

  } catch (error: any) {
    console.error("Email dispatch error:", error);
    return res.status(500).json({ error: error?.message || "Internal issue dispatching executive statement email." });
  }
});

// Endpoint to permanently delete user account and all database records on both sides
app.post("/api/delete-account", deleteAccountHandler);

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

// Bulletproof Express JSON error handling middleware
// Catches custom server failures, bad parser request bodies, 413s, etc. and guarantees a valid JSON response.
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[EXPRESS GLOBAL ERROR HANDLER]:", err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "An unexpected server-side error occurred while processing your request."
  });
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
