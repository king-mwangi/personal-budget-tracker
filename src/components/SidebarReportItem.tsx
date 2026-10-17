import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Check } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormatter';

interface SidebarReportItemProps {
  activeTab: string;
  onSelect: () => void;
  collapsed: boolean;
  isExcelExporting: boolean;
  excelExportSuccess: boolean;
  excelPreviewCount: number;
  excelPreviewLabel: string;
  excelPreviewDetails: string;
  comparisonTrends: {
    trendsA: number[];
    trendsB: number[];
    labelA: string;
    labelB: string;
    activeA: string;
    activeB: string;
  };
  availableMonths: string[];
  setComparePeriodA: (val: string) => void;
  setComparePeriodB: (val: string) => void;
  excelIncludeCategoryId: boolean;
  setExcelIncludeCategoryId: (val: boolean) => void;
  excelStyleTheme: 'professional' | 'minimal';
  setExcelStyleTheme: (val: 'professional' | 'minimal') => void;
  filterExcelByDate: boolean;
  setFilterExcelByDate: (val: boolean) => void;
  setExcelDatePreset: (val: 'active' | 'last-7' | 'last-30' | 'last-90' | 'this-year' | 'custom') => void;
  excelStartDate: string;
  setExcelStartDate: (val: string) => void;
  excelEndDate: string;
  setExcelEndDate: (val: string) => void;
  currencySymbol: string;
}

export default function SidebarReportItem({
  activeTab,
  onSelect,
  collapsed,
  isExcelExporting,
  excelExportSuccess,
  excelPreviewCount,
  excelPreviewLabel,
  excelPreviewDetails,
  comparisonTrends,
  availableMonths,
  setComparePeriodA,
  setComparePeriodB,
  excelIncludeCategoryId,
  setExcelIncludeCategoryId,
  excelStyleTheme,
  setExcelStyleTheme,
  filterExcelByDate,
  setFilterExcelByDate,
  setExcelDatePreset,
  excelStartDate,
  setExcelStartDate,
  excelEndDate,
  setExcelEndDate,
  currencySymbol,
}: SidebarReportItemProps) {
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  return (
    <div className="relative group/reports w-full">
      <motion.button
        id="sidebar-nav-reports"
        disabled={isExcelExporting}
        onClick={onSelect}
        title={collapsed ? 'Monthly Reports' : undefined}
        whileTap={{ scale: 0.98 }}
        className={`w-full flex items-center ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-3.5'
        } py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
          isExcelExporting
            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 opacity-80 cursor-not-allowed'
            : excelExportSuccess
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
            : activeTab === 'reports'
            ? 'bg-blue-600 text-white shadow-xs font-bold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
        }`}
      >
        <AnimatePresence mode="wait">
          {isExcelExporting ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 w-full justify-center"
            >
              <div className="w-4 h-4 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
              {!collapsed && <span className="truncate">Generating...</span>}
            </motion.div>
          ) : excelExportSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 w-full"
            >
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {!collapsed && (
                <>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Exported!</span>
                  <span className="ml-auto text-[10px] font-mono tabular-nums font-bold">Saved</span>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} w-full`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span>Monthly Reports</span>
                  <span
                    className={`ml-auto text-[10px] font-mono tabular-nums ${
                      activeTab === 'reports'
                        ? 'text-blue-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {excelPreviewCount}
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Popover Hover Info Overlay */}
      <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-xl shadow-xl border border-slate-800 opacity-0 pointer-events-none group-hover/reports:opacity-100 group-hover/reports:pointer-events-auto transition-all duration-150 z-50">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              Excel Export Scope
            </span>
            <span className="text-emerald-400 text-[10px] font-bold font-mono tabular-nums">
              {excelPreviewCount} rows
            </span>
          </div>

          <div className="border-t border-slate-800 pt-2">
            <p className="text-[11px] text-slate-300">
              Active Period: <strong className="text-blue-400 font-bold">{excelPreviewLabel}</strong>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{excelPreviewDetails}</p>
          </div>

          {/* Sparkline Visual Spending Trend Chart */}
          <div className="border-t border-slate-800 pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold text-slate-300">Cumulative Outflow</span>
              <div className="flex items-center gap-2 text-[9px] font-mono">
                <span className="text-blue-400">{comparisonTrends.labelA}</span>
                <span className="text-amber-400">{comparisonTrends.labelB}</span>
              </div>
            </div>

            <div className="w-full bg-slate-950 rounded-lg p-1.5 border border-slate-800 h-[76px] flex items-center justify-center">
              {comparisonTrends.trendsA && comparisonTrends.trendsA.length > 0 ? (
                (() => {
                  const trendsA = comparisonTrends.trendsA;
                  const trendsB = comparisonTrends.trendsB;
                  const maxVal = Math.max(...trendsA, ...trendsB, 100);
                  const points = trendsA
                    .map((val, i) => {
                      const x = (i / 29) * 220 + 10;
                      const y = 50 - (val / maxVal) * 40 + 10;
                      return `${x},${y}`;
                    })
                    .join(' ');

                  const prevPointsStr = trendsB
                    .map((val, i) => {
                      const x = (i / 29) * 220 + 10;
                      const y = 50 - (val / maxVal) * 40 + 10;
                      return `${x},${y}`;
                    })
                    .join(' ');

                  return (
                    <svg
                      viewBox="0 0 240 70"
                      className="w-full h-full overflow-visible select-none cursor-crosshair"
                      onPointerMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const svgX = (mouseX / rect.width) * 240;
                        const N = trendsA.length;
                        if (N > 0) {
                          const relativeX = svgX - 10;
                          const pct = relativeX / 220;
                          const rawIdx = Math.round(pct * (N - 1));
                          setHoveredTrendIdx(Math.max(0, Math.min(N - 1, rawIdx)));
                        }
                      }}
                      onPointerLeave={() => setHoveredTrendIdx(null)}
                    >
                      <line x1="5" y1="60" x2="235" y2="60" stroke="#1e293b" strokeWidth="1" />
                      <line
                        x1="5"
                        y1="35"
                        x2="235"
                        y2="35"
                        stroke="#1e293b"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      {prevPointsStr && (
                        <polyline
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="1.75"
                          strokeDasharray="3 3"
                          points={prevPointsStr}
                        />
                      )}
                      {points && (
                        <polyline fill="none" stroke="#60a5fa" strokeWidth="2.25" points={points} />
                      )}
                      {hoveredTrendIdx !== null && hoveredTrendIdx < trendsA.length && (
                        <text
                          x={6}
                          y={11}
                          fill="#e2e8f0"
                          fontSize="7"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          D{hoveredTrendIdx + 1}:{' '}
                          {formatCurrency(trendsA[hoveredTrendIdx] || 0, currencySymbol, {
                            maximumFractionDigits: 0,
                          })}
                        </text>
                      )}
                    </svg>
                  );
                })()
              ) : (
                <span className="text-[10px] text-slate-500">No trend data</span>
              )}
            </div>
          </div>

          {/* Compare Period Selectors */}
          <div
            className="border-t border-slate-800 pt-2.5 grid grid-cols-2 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1">Period A</label>
              <select
                value={comparisonTrends.activeA}
                onChange={(e) => setComparePeriodA(e.target.value)}
                className="w-full text-[10px] font-semibold text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={`comp-a-${m}`} value={m}>
                    {m}
                  </option>
                ))}
                {availableMonths.length === 0 && (
                  <option value={comparisonTrends.activeA}>{comparisonTrends.activeA}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1">Period B</label>
              <select
                value={comparisonTrends.activeB}
                onChange={(e) => setComparePeriodB(e.target.value)}
                className="w-full text-[10px] font-semibold text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={`comp-b-${m}`} value={m}>
                    {m}
                  </option>
                ))}
                {availableMonths.length === 0 && (
                  <option value={comparisonTrends.activeB}>{comparisonTrends.activeB}</option>
                )}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div
            className="border-t border-slate-800 pt-2.5 space-y-2 text-[10px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">Include Category ID</span>
              <input
                type="checkbox"
                checked={excelIncludeCategoryId}
                onChange={(e) => setExcelIncludeCategoryId(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">Minimalist Excel Layout</span>
              <input
                type="checkbox"
                checked={excelStyleTheme === 'minimal'}
                onChange={(e) =>
                  setExcelStyleTheme(e.target.checked ? 'minimal' : 'professional')
                }
                className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">Filter Excel By Date</span>
              <input
                type="checkbox"
                checked={filterExcelByDate}
                onChange={(e) => {
                  const next = e.target.checked;
                  setFilterExcelByDate(next);
                  setExcelDatePreset(next ? 'custom' : 'active');
                }}
                className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
              />
            </div>

            {filterExcelByDate && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="date"
                  value={excelStartDate}
                  onChange={(e) => setExcelStartDate(e.target.value)}
                  className="w-full text-[10px] text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono"
                />
                <input
                  type="date"
                  value={excelEndDate}
                  onChange={(e) => setExcelEndDate(e.target.value)}
                  className="w-full text-[10px] text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
