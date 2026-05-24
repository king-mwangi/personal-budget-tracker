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
    
    // reset Deposit state
    setActiveDepositId(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Description header */}
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Savings Goals & Milestones</h2>
        <p className="text-sm text-gray-500 mt-1">
          Lock target sums for emergency reserves, future splurges, or travel budgets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form to establish savings targets */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs lg:col-span-1 h-fit">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-gray-500" />
            Establish Goal Target
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Goal Identifier</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Europe trip, Tesla purchase..."
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 block"
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
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-gray-500" />
            Active Savings Reserve Goals
          </h3>

          {goals.length === 0 ? (
            <div className="bg-white border border-gray-100 p-12 rounded-2xl text-center shadow-xs">
              <PiggyBank className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-400 mt-3">No savings goals created. Feed parameters on the left to activate metrics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map(goal => {
                const percent = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                const roundedPercent = Math.min(100, Math.round(percent));
                const isComplete = goal.current >= goal.target;

                return (
                  <div key={goal.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-3xs flex flex-col justify-between hover:border-gray-200 transition-colors">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border ${
                            isComplete ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            <PiggyBank className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-800 break-words max-w-[130px]" title={goal.name}>
                              {goal.name}
                            </h4>
                            {goal.deadline && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                <Calendar className="w-3 h-3 text-gray-450" />
                                {goal.deadline}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => onDeleteGoal(goal.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Goal parameters"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      {/* Cash balances */}
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress balance</span>
                        <p className="text-sm font-mono font-bold text-gray-800">
                          {currencySymbol}{goal.current.toLocaleString()} / {currencySymbol}{goal.target.toLocaleString()}
                        </p>
                      </div>

                      {/* Goal progression gauge */}
                      <div className="space-y-1">
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isComplete ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${roundedPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                          <span>{roundedPercent}% Saved</span>
                          {isComplete && (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> Target Complete
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Deposit transaction actions */}
                    <div className="mt-5 pt-3 border-t border-gray-50">
                      {activeDepositId === goal.id ? (
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-450">{currencySymbol}</span>
                            <input
                              type="number"
                              required
                              placeholder="0"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden font-mono"
                            />
                          </div>
                          
                          <button
                            onClick={() => handleDeposit(goal.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-pointer"
                          >
                            Deposit
                          </button>
                          
                          <button
                            onClick={() => setActiveDepositId(null)}
                            className="text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setActiveDepositId(goal.id)}
                            className="w-full text-center border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 text-blue-600 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                          >
                            Add Goal Savings Outflow
                          </button>
                        </div>
                      )}
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
