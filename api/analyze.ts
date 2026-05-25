import { GoogleGenAI, Type } from "@google/genai";

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
    const { transactions = [], budgets = [], savingsGoals = [], currency = "Ksh" } = req.body || {};

    const ai = getAIClient();
    const prompt = `Analyze the following monthly personal finance snapshot:
    - Budgets: ${JSON.stringify(budgets)}
    - Transactions: ${JSON.stringify(transactions)}
    - Savings Goals: ${JSON.stringify(savingsGoals)}
    - Active Currency: ${currency}

    Provide a professional financial analysis containing overall status, high-level summary, specific actionable insights, and direct category savings goals with estimates.`;

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
