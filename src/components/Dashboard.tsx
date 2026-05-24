import React, { useState, useMemo } from 'react';
import { Transaction, Budget } from '../types';
import { CATEGORIES } from '../data/categories';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Percent,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  currencySymbol?: string;
}

export default function Dashboard({ transactions, budgets, currencySymbol = "$" }: DashboardProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Core Financial Compilations
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    const totalBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      totalBalance,
      savingsRate: Math.max(0, parseFloat(savingsRate.toFixed(1)))
    };
  }, [transactions]);

  // Donut Pie data compilation
  const categorySplit = useMemo(() => {
    const map: Record<string, number> = {};
    let totalExp = 0;

    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
        totalExp += tx.amount;
      }
    });

    return Object.entries(map).map(([category, amount]) => {
      const percentage = totalExp > 0 ? (amount / totalExp) * 100 : 0;
      return {
        category,
        amount,
        percentage: parseFloat(percentage.toFixed(1)),
        color: CATEGORIES[category]?.color || '#9ca3af'
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Spend over days trend compilation
  const dailyBreakdown = useMemo(() => {
    const daysInMonth = 30; // standard month simulation
    const dayTotals = Array(daysInMonth).fill(0);
    const cumulativeTotals = Array(daysInMonth).fill(0);

    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const dateObj = new Date(tx.date);
        const day = isNaN(dateObj.getDate()) ? 1 : dateObj.getDate();
        const index = Math.min(daysInMonth - 1, Math.max(0, day - 1));
        dayTotals[index] += tx.amount;
      }
    });

    let runningSum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      runningSum += dayTotals[i];
      cumulativeTotals[i] = parseFloat(runningSum.toFixed(2));
    }

    return cumulativeTotals.map((val, idx) => ({
      day: idx + 1,
      amount: val,
      dailySpend: parseFloat(dayTotals[idx].toFixed(2))
    }));
  }, [transactions]);

  // Donut Circle Math
  const donutRadius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * donutRadius;
  
  const slices = useMemo(() => {
    let accumulatedAngle = 0;
    return categorySplit.map(item => {
      const angle = (item.percentage / 100) * 360;
      const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
      const rotation = accumulatedAngle - 90; // Align to top
      accumulatedAngle += angle;

      return {
        ...item,
        strokeDashoffset,
        rotation
      };
    });
  }, [categorySplit, circumference]);

  // Trend plot math coordinates matching SVG area
  const svgWidth = 500;
  const svgHeight = 200;
  const maxCumulative = Math.max(...dailyBreakdown.map(d => d.amount), 100);
  
  const trendPoints = useMemo(() => {
    return dailyBreakdown.map((d, index) => {
      const x = (index / (dailyBreakdown.length - 1)) * (svgWidth - 40) + 20;
      const y = svgHeight - 25 - (d.amount / maxCumulative) * (svgHeight - 50);
      return { x, y, ...d };
    });
  }, [dailyBreakdown, svgWidth, svgHeight, maxCumulative]);

  const sparklinePath = useMemo(() => {
    if (trendPoints.length === 0) return '';
    return trendPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  }, [trendPoints]);

  const gradientAreaPath = useMemo(() => {
    if (trendPoints.length === 0) return '';
    const first = trendPoints[0];
    const last = trendPoints[trendPoints.length - 1];
    return `${sparklinePath} L ${last.x} ${svgHeight - 20} L ${first.x} ${svgHeight - 20} Z`;
  }, [trendPoints, sparklinePath, svgHeight]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Financial Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time balances, tracking statistics, and cash flow velocities.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-gray-50 rounded-lg py-1.5 px-3 border border-gray-200 w-fit self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-mono text-gray-600 font-medium">May 2026 Tracking Period</span>
        </div>
      </div>

      {/* Grid Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Balance</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-gray-900">
              {stats.totalBalance < 0 ? '-' : ''}{currencySymbol}{Math.abs(stats.totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Total revenue minus logged expenditure</p>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inflow Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-emerald-600">
              {currencySymbol}{stats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{transactions.filter(t => t.type === 'income').length} active income stream logs</p>
          </div>
        </div>

        {/* Monthly Outflow */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Outflow Spent</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-amber-600">
              {currencySymbol}{stats.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{transactions.filter(t => t.type === 'expense').length} active expenditure lines</p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Savings Rate</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-purple-600">
              {stats.savingsRate}%
            </h3>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
              <div 
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.savingsRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Cumulative Billing Run */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Spending Velocity Curve</h3>
                <p className="text-xs text-gray-400 mt-0.5">Cumulative monthly outflow logged day-by-day.</p>
              </div>
              {hoveredTrendIndex !== null && (
                <div className="text-right">
                  <span className="text-xs text-gray-400 font-mono">Day {trendPoints[hoveredTrendIndex]?.day}: </span>
                  <span className="text-sm font-bold font-mono text-gray-900">
                    {currencySymbol}{trendPoints[hoveredTrendIndex]?.amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* SVG Graph Canvas */}
            <div className="relative mt-6 w-full h-[220px]">
              {transactions.filter(t => t.type === 'expense').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">No expenses logged. Please log entries to display curves.</p>
                </div>
              ) : (
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="20" y1={svgHeight - 25} x2={svgWidth - 20} y2={svgHeight - 25} stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="20" y1={svgHeight / 2} x2={svgWidth - 20} y2={svgHeight / 2} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="20" y1="25" x2={svgWidth - 20} y2="25" stroke="#f3f4f6" strokeWidth="1" />

                  {/* Filled Gradient Area */}
                  {gradientAreaPath && (
                    <path d={gradientAreaPath} fill="url(#trend-gradient)" className="transition-all duration-300" />
                  )}

                  {/* Main Curve Line */}
                  {sparklinePath && (
                    <path 
                      d={sparklinePath} 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Coordinates Nodes/Dots & Hover Zones */}
                  {trendPoints.map((pt, idx) => {
                    const isHovered = hoveredTrendIndex === idx;
                    return (
                      <g key={idx}>
                        {/* Hidden ultra-wide bar for frictionless hover */}
                        <rect
                          x={pt.x - 8}
                          y="10"
                          width="16"
                          height={svgHeight - 20}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        />
                        {/* Interactive Dot */}
                        {(isHovered || idx === trendPoints.length - 1) && (
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r={isHovered ? 5 : 3.5} 
                            fill={isHovered ? "#3b82f6" : "#ffffff"} 
                            stroke="#3b82f6" 
                            strokeWidth="2.5" 
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-mono font-medium text-gray-400 mt-2">
            <span>Day 1</span>
            <span>Day 10</span>
            <span>Day 20</span>
            <span>Day 30</span>
          </div>
        </div>

        {/* Category breakdown Pie Donut */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Allocation Split</h3>
            <p className="text-xs text-gray-400 mt-0.5">Budget category ratio allocation comparison.</p>
          </div>

          <div className="flex flex-col items-center justify-center my-4 relative h-[160px]">
            {categorySplit.length === 0 ? (
              <p className="text-xs text-gray-400">Log expenses to analyze categories.</p>
            ) : (
              <div className="relative w-[150px] h-[150px]">
                <svg width="100%" height="100%" viewBox="0 0 180 180" className="transform rotate-0">
                  {slices.map((slice, i) => {
                    const isHovered = hoveredSlice === slice.category;
                    return (
                      <circle
                        key={slice.category}
                        cx="90"
                        cy="90"
                        r={donutRadius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={slice.strokeDashoffset}
                        style={{
                          transformOrigin: '90px 90px',
                          transform: `rotate(${slice.rotation}deg)`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={() => setHoveredSlice(slice.category)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className="cursor-pointer"
                      />
                    );
                  })}
                </svg>

                {/* Center Core label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {hoveredSlice ? (
                    <>
                      <span className="text-xs font-semibold text-gray-700 max-w-[80px] truncate text-center">
                        {hoveredSlice}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {categorySplit.find(c => c.category === hoveredSlice)?.percentage}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total</span>
                      <span className="text-sm font-bold text-gray-800 font-mono">
                        {currencySymbol}{stats.totalExpense.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Legend Items breakdown */}
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {categorySplit.slice(0, 4).map(item => (
              <div 
                key={item.category} 
                className={`flex items-center justify-between p-1 rounded-md transition-all ${
                  hoveredSlice === item.category ? 'bg-gray-50' : ''
                }`}
                onMouseEnter={() => setHoveredSlice(item.category)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600 font-medium">{item.category}</span>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-800 font-mono">
                    {currencySymbol}{item.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">({item.percentage}%)</span>
                </div>
              </div>
            ))}
            {categorySplit.length > 4 && (
              <div className="text-center text-[10px] text-gray-500 font-medium pt-1">
                + {categorySplit.length - 4} more spending categories
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
