import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
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

// AI Insights Generator - Runs structured diagnostic on the user's budgets and logs
app.post("/api/insights", async (req, res) => {
  try {
    const { transactions = [], budgets = [], savingsGoals = [], currency = "Ksh" } = req.body;

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

    const parsedResult = JSON.parse(response.text || "{}");
    res.json(parsedResult);
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
});

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
