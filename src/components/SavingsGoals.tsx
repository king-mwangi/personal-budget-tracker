import React, { useState } from 'react';
import { SavingsGoal } from '../types';
import { 
  Plus, 
  Trash2, 
  PiggyBank, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Coins,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

const triggerSavingsConfetti = () => {
  // Main energetic burst
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
  });

  // continuous side shooters waterfall stream for 2 seconds
  const end = Date.now() + 2000;
  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.85 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.85 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  onAddGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  onUpdateGoalProgress: (id: string, amount: number) => void;
  onDeleteGoal: (id: string) => void;
  currencySymbol?: string;
}

export default function SavingsGoals({
  goals,
  onAddGoal,
  onUpdateGoalProgress,
  onDeleteGoal,
  currencySymbol = "$"
}: SavingsGoalsProps) {
  // New Goal Form Parameters
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  
  // Quick Deposit Options
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(target);
    if (!name.trim() || isNaN(targetNum) || targetNum <= 0) return;

    onAddGoal({
      name: name.trim(),
      target: targetNum,
      current: 0,
      deadline: deadline || undefined
    });

    setName('');
    setTarget('');
    setDeadline('');
  };

  const handleDeposit = (id: string) => {
    const depNum = parseFloat(depositAmount);
    if (isNaN(depNum)) return;
    onUpdateGoalProgress(id, depNum);
    
    // Save immediate balance update to localStorage for progress chart
    const currentGoal = goals.find(g => g.id === id);
    if (currentGoal) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const storageKey = `fin_tracker_savings_history_${id}`;
      let historyMap: Record<string, number> = {};
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          historyMap = JSON.parse(stored);
        }
      } catch (e) {
        console.warn(e);
      }
      
      const nextBalance = parseFloat((currentGoal.current + depNum).toFixed(2));
      
      // Trigger elegant confetti cascade if user hits 100% of their savings target
      if (nextBalance >= currentGoal.target && currentGoal.current < currentGoal.target) {
        triggerSavingsConfetti();
      }

      historyMap[todayStr] = nextBalance;
      try {
        localStorage.setItem(storageKey, JSON.stringify(historyMap));
      } catch (e) {
        console.error(e);
      }
    }

    // reset Deposit state
    setActiveDepositId(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Description header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition-colors">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Savings Goals & Milestones</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Lock target sums for emergency reserves, future splurges, or travel budgets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form to establish savings targets */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs lg:col-span-1 h-fit transition-colors">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-gray-500" />
            Establish Goal Target
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Goal Identifier</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Europe trip, Tesla purchase..."
                className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-500 block"
              />
            </div>

            {/* Target sum */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Target Lock sum ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">{currencySymbol}</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono font-medium"
                />
              </div>
            </div>

            {/* Target Deadline */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target Date (Optional)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Lock Target Goal
            </button>
          </form>
        </div>

        {/* Goals interactive cards list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-gray-500" />
            Active Savings Reserve Goals
          </h3>

          {goals.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-12 rounded-2xl text-center shadow-xs transition-colors">
              <PiggyBank className="w-10 h-10 text-gray-300 dark:text-slate-700 mx-auto animate-pulse" />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">No savings goals created. Feed parameters on the left to activate metrics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map(goal => {
                const percent = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                const roundedPercent = Math.min(100, Math.round(percent));
                const isComplete = goal.current >= goal.target;

                return (
                  <div key={goal.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs flex flex-col justify-between hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                    <div className="space-y-4">
                      {/* Top Header & Circular Progress Indicator Row */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`p-2 rounded-xl border shrink-0 ${
                            isComplete 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/10' 
                              : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/10'
                          }`}>
                            <PiggyBank className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-slate-100 truncate" title={goal.name}>
                              {goal.name}
                            </h4>
                            {goal.deadline ? (
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {goal.deadline}
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5">
                                No target date
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Circular Progress Indicator */}
                        <div className="relative flex items-center justify-center w-14 h-14 shrink-0" title={`${roundedPercent}% saved`}>
                          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                            <circle
                              className="text-slate-100 dark:text-slate-800"
                              stroke="currentColor"
                              strokeWidth={6}
                              fill="transparent"
                              r={24}
                              cx="32"
                              cy="32"
                            />
                            <circle
                              className={`${
                                isComplete ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400'
                              } transition-all duration-500 ease-in-out`}
                              stroke="currentColor"
                              strokeWidth={6}
                              strokeDasharray={150.8}
                              strokeDashoffset={150.8 - (Math.min(100, roundedPercent) / 100) * 150.8}
                              strokeLinecap="round"
                              fill="transparent"
                              r={24}
                              cx="32"
                              cy="32"
                            />
                          </svg>
                          <span className="text-[10px] font-mono font-extrabold text-gray-850 dark:text-slate-200">
                            {roundedPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Cash balances info */}
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-505 font-mono">
                          <span className="font-bold uppercase tracking-widest text-[9px]">Goal Progress</span>
                          {isComplete ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> Target Met
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-bold">Accumulating</span>
                          )}
                        </div>
                        <p className="text-xs font-mono font-bold text-gray-800 dark:text-slate-200 flex justify-between">
                          <span>Current:</span>
                          <span className={isComplete ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-800 dark:text-slate-200'}>
                            {currencySymbol}{goal.current.toLocaleString()}
                          </span>
                        </p>
                        <p className="text-xs font-mono text-gray-400 dark:text-slate-500 flex justify-between border-t border-slate-100/60 dark:border-slate-800/50 pt-1">
                          <span>Target Limit:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-350">
                            {currencySymbol}{goal.target.toLocaleString()}
                          </span>
                        </p>
                      </div>

                      {/* Integrated 30-Day daily breakdown chart of consistency */}
                      <SavingsGoalProgressChart
                        goalId={goal.id}
                        current={goal.current}
                        target={goal.target}
                        currencySymbol={currencySymbol}
                      />
                    </div>

                    {/* Deposit transaction actions / delete */}
                    <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        {activeDepositId === goal.id ? (
                          <div className="flex gap-1.5 items-center">
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1.5 text-xs font-bold text-gray-455 dark:text-slate-500">{currencySymbol}</span>
                              <input
                                type="number"
                                required
                                placeholder="0"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="w-full border border-gray-200 dark:border-slate-700/80 rounded-lg pl-5 pr-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-950 focus:outline-hidden font-mono text-gray-800 dark:text-slate-100"
                              />
                            </div>
                            
                            <button
                              onClick={() => handleDeposit(goal.id)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer"
                            >
                              Add
                            </button>
                            
                            <button
                              onClick={() => setActiveDepositId(null)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg cursor-pointer p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveDepositId(goal.id)}
                            className="w-full text-center border border-dashed border-gray-250 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/10 dark:hover:bg-blue-955/10 text-blue-600 dark:text-blue-400 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            Add Outflow
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          try {
                            localStorage.removeItem(`fin_tracker_savings_history_${goal.id}`);
                          } catch (_) {}
                          onDeleteGoal(goal.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-955/30 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Delete Goal parameters"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

interface SavingsGoalProgressChartProps {
  goalId: string;
  current: number;
  target: number;
  currencySymbol: string;
}

export function SavingsGoalProgressChart({
  goalId,
  current,
  target,
  currencySymbol
}: SavingsGoalProgressChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate 30 days history dates and values
  const history = React.useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().substring(0, 10)); // "YYYY-MM-DD"
    }

    const storageKey = `fin_tracker_savings_history_${goalId}`;
    let historyMap: Record<string, number> = {};
    let exists = false;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        historyMap = JSON.parse(raw);
        exists = true;
      }
    } catch (e) {
      console.warn(e);
    }

    // Generate stair-steps to end exactly at current
    if (!exists) {
      const step1 = Math.round(current * 0.15);
      const step2 = Math.round(current * 0.45);
      const step3 = Math.round(current * 0.75);
      const step4 = current;

      for (let i = 0; i < 30; i++) {
        const date = dates[i];
        if (current === 0) {
          historyMap[date] = 0;
        } else {
          if (i < 6) {
            historyMap[date] = step1;
          } else if (i < 13) {
            historyMap[date] = step2;
          } else if (i < 21) {
            historyMap[date] = step3;
          } else {
            historyMap[date] = step4;
          }
        }
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(historyMap));
      } catch (e) {
        console.error(e);
      }
    }

    // Synchronize today's date balance with actual current amount (handles new updates)
    const todayStr = dates[29];
    if (historyMap[todayStr] !== current) {
      historyMap[todayStr] = current;
      try {
        localStorage.setItem(storageKey, JSON.stringify(historyMap));
      } catch (_) {}
    }

    let lastKnownBalance = 0;
    return dates.map((date, index) => {
      let balance = historyMap[date];
      if (balance === undefined) {
        balance = lastKnownBalance;
      } else {
        lastKnownBalance = balance;
      }

      // Calculate deposit compared to previous day
      let previousBalance = 0;
      if (index > 0) {
        const prevDate = dates[index - 1];
        previousBalance = historyMap[prevDate] !== undefined ? historyMap[prevDate] : 0;
      }
      const depositAmt = index === 0 ? balance : Math.max(0, balance - previousBalance);

      // format month day labeled readout (e.g. "May 24")
      const dParts = date.split('-');
      const dObj = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
      const dayLabel = dObj.toLocaleDateString('default', { month: 'short', day: 'numeric' });

      return {
        date,
        dayLabel,
        balance,
        deposit: depositAmt
      };
    });
  }, [goalId, current, target]);

  // Compute boundaries for drawing
  const yMax = Math.max(target, current * 1.05, 1);
  const chartHeight = 65;
  const chartWidth = 320;

  // Map each data points to visual coordinate
  const points = history.map((item, index) => {
    const x = (index / 29) * chartWidth;
    const y = chartHeight - (item.balance / yMax) * (chartHeight - 8); // Preserve tight margin top
    return { x, y, ...item };
  });

  // Construct Area Path (from (0, height) -> points -> (last_x, height) -> close)
  let areaD = "";
  let lineD = "";
  if (points.length > 0) {
    lineD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaD = `${lineD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  }

  // Calculate coordinates of target line
  const targetY = chartHeight - (target / yMax) * (chartHeight - 8);
  const targetLabelOffsetY = targetY < 15 ? targetY + 11 : targetY - 4;

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="space-y-2 mt-4">
      {/* Chart Title & Hover Readout */}
      <div className="flex justify-between items-center text-[10px] font-mono">
        <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">30-Day Progress Stream</span>
        {hoveredPoint ? (
          <span className="text-blue-600 dark:text-blue-400 font-semibold px-1 rounded-sm">
            {hoveredPoint.dayLabel}: {currencySymbol}{hoveredPoint.balance.toLocaleString()}
            {hoveredPoint.deposit > 0 ? ` (+${currencySymbol}${hoveredPoint.deposit.toLocaleString()})` : ''}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-slate-600">Hover graph to audit</span>
        )}
      </div>

      {/* Graphical Stage */}
      <div className="relative bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-2 select-none overflow-hidden hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id={`savings-gradient-${goalId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id={`target-line-gradient`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid target line (if inside chart boundaries) */}
          {targetY >= 0 && targetY <= chartHeight && (
            <g>
              <line 
                x1="0" 
                y1={targetY} 
                x2={chartWidth} 
                y2={targetY} 
                stroke="url(#target-line-gradient)" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
              />
              <text 
                x={chartWidth - 5} 
                y={targetLabelOffsetY} 
                textAnchor="end" 
                className="fill-slate-400 font-sans text-[7px] font-medium tracking-wide uppercase"
              >
                Target Level: {currencySymbol}{target.toLocaleString()}
              </text>
            </g>
          )}

          {/* Area under the progress line */}
          {areaD && (
            <path 
              d={areaD} 
              fill={`url(#savings-gradient-${goalId})`} 
            />
          )}

          {/* Primary curve */}
          {lineD && (
            <path 
              d={lineD} 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="dark:stroke-blue-400"
            />
          )}

          {/* Active Deposit Markings */}
          {points.map((p, idx) => {
            if (p.deposit > 0 && idx > 0) {
              return (
                <circle
                  key={`dep-node-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r="2.5"
                  className="fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900"
                  strokeWidth="1"
                />
              );
            }
            return null;
          })}

          {/* Hover effects vertical guide line and circle anchor */}
          {hoveredPoint && (
            <g>
              <line 
                x1={hoveredPoint.x} 
                y1="0" 
                x2={hoveredPoint.x} 
                y2={chartHeight} 
                stroke="#60a5fa" 
                strokeWidth="1" 
                strokeDasharray="2 2" 
              />
              <circle 
                cx={hoveredPoint.x} 
                cy={hoveredPoint.y} 
                r="4.5" 
                className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900 shadow-xs" 
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Transparent interaction zones */}
          {points.map((p, index) => {
            const tapZoneWidth = chartWidth / 30;
            const tapZoneX = p.x - tapZoneWidth / 2;
            return (
              <rect
                key={`trigger-${index}`}
                x={tapZoneX}
                y="0"
                width={tapZoneWidth}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* Simple Stats consistency summary label */}
      <h5 className="text-[9px] text-gray-400 dark:text-slate-500 text-center font-semibold uppercase tracking-wider">
        Consistency Benchmark: {history.filter(h => h.deposit > 0).length} Deposits logged this period
      </h5>
    </div>
  );
}
