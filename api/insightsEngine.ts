import { GoogleGenAI, Type } from "@google/genai";

export interface Transaction {
  id?: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  description?: string;
}

export interface Budget {
  id?: string;
  category: string;
  limit: number;
}

export interface SavingsGoal {
  id?: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

// Compress transactions into category averages, sums, and unusual large spend items.
// This reduces the input JSON size by up to 90%, preventing token bloat while keeping insights accurate.
export function summarizeFinancialData(transactions: Transaction[], budgets: Budget[]) {
  if (!transactions || transactions.length === 0) {
    return {
      totals: { income: 0, expense: 0, net: 0 },
      categorySummary: {},
      outliers: []
    };
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const categorySums: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  transactions.forEach(t => {
    const amount = Number(t.amount || 0);
    if (t.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      const cat = t.category || 'Other';
      categorySums[cat] = (categorySums[cat] || 0) + amount;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });

  const categoryAverages: Record<string, number> = {};
  Object.keys(categorySums).forEach(cat => {
    categoryAverages[cat] = categorySums[cat] / (categoryCounts[cat] || 1);
  });

  // Outliers are transactions that are more than 3x the average of their category and are > 100 in amount.
  const outliers: any[] = [];
  transactions.forEach(t => {
    if (t.type === 'expense') {
      const amount = Number(t.amount || 0);
      const cat = t.category || 'Other';
      const avg = categoryAverages[cat] || 0;
      if (avg > 0 && amount > 3 * avg && amount > 100) {
        outliers.push({
          date: t.date,
          category: cat,
          amount: amount,
          description: t.description || "No description",
          timesAverage: Number((amount / avg).toFixed(1))
        });
      }
    }
  });

  const categorySummary: Record<string, any> = {};
  Object.keys(categorySums).forEach(cat => {
    const matchingBudget = budgets.find(
      b => b.category && b.category.toLowerCase() === cat.toLowerCase()
    );
    categorySummary[cat] = {
      totalSpent: categorySums[cat],
      count: categoryCounts[cat],
      averageTransaction: Number(categoryAverages[cat].toFixed(2)),
      limit: matchingBudget ? matchingBudget.limit : null
    };
  });

  return {
    totals: {
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense
    },
    categorySummary,
    outliers: outliers.slice(0, 10) // Limit to top outliers to save tokens
  };
}

export async function generateInsightsDirect({
  transactions,
  budgets,
  savingsGoals,
  currency,
  selectedPeriod,
  ai
}: {
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  currency: string;
  selectedPeriod: string;
  ai: GoogleGenAI;
}) {
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

  const activeLabel = getPeriodLabel(selectedPeriod);
  const isAllView = selectedPeriod === 'all';

  let currentSummaryObj: any = null;
  let previousSummaryObj: any = null;
  let prevLabel = "";

  if (!isAllView) {
    const targetMonthTransactions = transactions.filter(t => t.date && t.date.substring(0, 7) === selectedPeriod);
    const prevPeriod = getPreviousMonthString(selectedPeriod);
    prevLabel = getPeriodLabel(prevPeriod);
    const comparisonTransactions = transactions.filter(t => t.date && t.date.substring(0, 7) === prevPeriod);

    currentSummaryObj = summarizeFinancialData(targetMonthTransactions, budgets);
    previousSummaryObj = summarizeFinancialData(comparisonTransactions, budgets);
  } else {
    currentSummaryObj = summarizeFinancialData(transactions, budgets);
  }

  let prompt = "";
  if (isAllView) {
    prompt = `Analyze the following all-time combined personal finance snapshot:
    - Budgets allocations: ${JSON.stringify(budgets)}
    - Cumulative Inflow / Income recorded historical: ${currency} ${currentSummaryObj.totals.income.toLocaleString()}
    - Cumulative Outflow / Expenses recorded historical: ${currency} ${currentSummaryObj.totals.expense.toLocaleString()}
    - Category spent aggregates and averages: ${JSON.stringify(currentSummaryObj.categorySummary)}
    - Large anomalous outliers: ${JSON.stringify(currentSummaryObj.outliers)}
    - Savings Goals targets status: ${JSON.stringify(savingsGoals)}
    - Active Currency: ${currency}

    Provide a professional lifetime financial analysis containing overall status, high-level summary, specific actionable insights, and direct category savings goals with estimates.`;
  } else {
    prompt = `Analyze the following monthly personal finance snapshot comparing the selected month with the previous month:
    - Current selected billing month of review: "${activeLabel}" (${selectedPeriod})
      - Current Month Total Inflows (Income): ${currency} ${currentSummaryObj.totals.income.toLocaleString()}
      - Current Month Total Outflows (Expenses): ${currency} ${currentSummaryObj.totals.expense.toLocaleString()}
      - Current Month Net Savings Balance flow: ${currency} ${currentSummaryObj.totals.net.toLocaleString()}
      - Current Month compressed category summary: ${JSON.stringify(currentSummaryObj.categorySummary)}
      - Current Month large outliers: ${JSON.stringify(currentSummaryObj.outliers)}
    
    - Comparison base cycle (The previous month): "${prevLabel}" (${getPreviousMonthString(selectedPeriod)})
      - Previous Month Total Inflows (Income): ${currency} ${previousSummaryObj.totals.income.toLocaleString()}
      - Previous Month Total Outflows (Expenses): ${currency} ${previousSummaryObj.totals.expense.toLocaleString()}
      - Previous Month Net Savings Balance flow: ${currency} ${previousSummaryObj.totals.net.toLocaleString()}
      - Previous Month compressed category summary: ${JSON.stringify(previousSummaryObj.categorySummary)}
    
    - Configured monthly budgets ceilings: ${JSON.stringify(budgets)}
    - Savings target plans: ${JSON.stringify(savingsGoals)}
    - Active regional currency symbol: ${currency}

    Requirements:
    1. Deliver diagnostics tailored specifically to the Active Selected Month: ${activeLabel}.
    2. Constructively compare the current month outflows and inflows against the previous month of ${prevLabel}. Point out precise variations in totals (did expenses increase or decrease, by what percent?), check for category priority shifts, and note if they are saving more or less of their income.
    3. Cite specific numbers with the correct currency prefix (${currency}) to maintain highly credible observations. Double-check all budget ceiling limits.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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
            description: "Actionable saving ideas targeting waste reduction."
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
    return JSON.parse(textToShow || "{}");
  } catch (parseErr) {
    return {
      overallStatus: "Caution",
      summaryMessage: "Your digital advisor analysis is active, though the live AI formatting is currently misaligned. Standard advisory patterns remain fully active.",
      actionableInsights: [
        `Cross-examine your expense velocity in categories across your transactions.`,
        "Check that your active budget limits are configured correctly.",
        "Ensure that newly posted transactions stay strictly within your designated monthly margins."
      ],
      savingsOpportunities: [
        {
          category: "Food",
          savingEstimate: 15,
          actionableTip: `Trim unnecessary dining outings to conserve your active budget.`
        }
      ]
    };
  }
}
