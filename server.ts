import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { rateLimit } from "express-rate-limit";
import { generateInsightsDirect } from "./api/insightsEngine";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Global limiter: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Advisor limiter: 5 requests per 1 minute
const advisorLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: "Too many advisor queries. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Analyze / Insights limiter: 3 requests per 1 minute
const analyzeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  message: { error: "Too many analysis queries. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Send-report limiter: 2 requests per 5 minutes
const sendReportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 2,
  message: { error: "Too many statement delivery requests. Please wait 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

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
app.post("/api/insights", analyzeLimiter, (req, res, next) => {
  const { transactions = [], budgets = [], savingsGoals = [] } = req.body || {};
  if (!Array.isArray(transactions) || !Array.isArray(budgets) || !Array.isArray(savingsGoals)) {
    return res.status(400).json({ error: "Invalid payload: transactions, budgets, and savingsGoals must be valid arrays." });
  }
  next();
}, handleInsightsRequest);

app.post("/api/analyze", analyzeLimiter, (req, res, next) => {
  const { transactions = [], budgets = [], savingsGoals = [] } = req.body || {};
  if (!Array.isArray(transactions) || !Array.isArray(budgets) || !Array.isArray(savingsGoals)) {
    return res.status(400).json({ error: "Invalid payload: transactions, budgets, and savingsGoals must be valid arrays." });
  }
  next();
}, handleInsightsRequest);

// AI Advisor Chat Bot - Supports conversation informed by current accounts status
app.post("/api/advisor", advisorLimiter, async (req, res) => {
  try {
    const { messages = [], transactions = [], budgets = [], savingsGoals = [], currency = "Ksh" } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required and cannot be empty." });
    }
    if (!Array.isArray(transactions) || !Array.isArray(budgets) || !Array.isArray(savingsGoals)) {
      return res.status(400).json({ error: "Invalid payload: transactions, budgets, and savingsGoals must be valid arrays." });
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
      model: "gemini-2.5-flash",
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
app.post("/api/send-report", sendReportLimiter, async (req: any, res: any) => {
  try {
    const { toEmail, pdfBase64, monthLabel, reportId } = req.body || {};
    if (!toEmail || typeof toEmail !== "string" || !toEmail.includes("@")) {
      return res.status(400).json({ error: "A valid recipient email address is required" });
    }
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ error: "PDF document data is required as a string" });
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
          minVersion: "TLSv1.2"
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

// Supabase OAuth Callback Endpoint - exchanges code for token and messages opener
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const code = req.query.code as string;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' && supabaseUrl !== 'your_supabase_url_here' && supabaseAnonKey !== 'your_supabase_anon_key_here') {
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
