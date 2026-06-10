import { GoogleGenAI } from "@google/genai";

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
    const { messages = [], transactions = [], budgets = [], savingsGoals = [], currency = "Ksh" } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getAIClient();

    // System advice guidelines grounding response in real accounts
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

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Advisor API Error:", error);
    const errMsg = error?.message || String(error || "");
    const isKeyMissing = !process.env.GEMINI_API_KEY;
    let status = 500;
    if (errMsg.includes("GEMINI_API_KEY")) {
      status = 403;
    } else if (error?.status === 429 || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      status = 429;
    }
    return res.status(status).json({
      error: errMsg || "An issue occurred while calling Gemini AI advisor",
      isKeyMissing
    });
  }
}
