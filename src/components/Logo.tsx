import React from 'react';

interface LogoProps {
  className?: string; // class for the container
  iconSize?: string; // e.g. "w-10 h-10" or custom style
  showText?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'horizontal' | 'vertical';
}

export default function LedgerSmartLogo({
  className = "",
  iconSize = "w-10 h-10",
  showText = true,
  theme = "auto",
  layout = "horizontal"
}: LogoProps) {
  // Use tailwind transitions and colors that adapt to system theme or forced states
  const textPrimaryColor = 
    theme === 'light' 
      ? "text-slate-900" 
      : theme === 'dark' 
        ? "text-white" 
        : "text-slate-900 dark:text-white";

  const textSecondaryColor = 
    theme === 'light' 
      ? "text-slate-500" 
      : theme === 'dark' 
        ? "text-slate-400" 
        : "text-slate-500 dark:text-slate-400";

  return (
    <div className={`flex items-center ${layout === 'vertical' ? 'flex-col text-center' : 'flex-row text-left'} gap-3.5 ${className}`}>
      {/* Precision Engineered Vector Icon based on the attached Ledger Smart logo */}
      <svg 
        viewBox="0 0 120 100" 
        className={`${iconSize} shrink-0`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Book cover / pages frame */}
        <g className="transition-all duration-200">
          {/* Left page outline path */}
          <path 
            d="M 54,77 L 17,76 C 17,76 17,40 17,40 L 54,42 Z" 
            className="stroke-slate-900 dark:stroke-slate-200"
            strokeWidth="5" 
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          
          {/* Right page outline path */}
          <path 
            d="M 66,42 L 103,40 C 103,40 103,76 103,76 L 66,77 Z" 
            className="stroke-slate-900 dark:stroke-slate-200"
            strokeWidth="5" 
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          
          {/* Spine link connector at bottom */}
          <path 
            d="M 17,76 C 35,82 50,82 60,77 C 70,82 85,82 103,76" 
            className="stroke-slate-900 dark:stroke-slate-200"
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Top page curves */}
          <path 
            d="M 17,40 C 35,33 50,33 60,38 C 70,33 85,33 103,40" 
            className="stroke-slate-900 dark:stroke-slate-200"
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />

          {/* Spine center cleft crease */}
          <path 
            d="M 60,38 L 60,77" 
            className="stroke-slate-900 dark:stroke-slate-200"
            strokeWidth="4" 
            strokeLinecap="round"
          />
        </g>
        
        {/* Left Page Text Lines - Gray/Slate */}
        <g className="opacity-80">
          <line x1="26" y1="48" x2="48" y2="48" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
          <line x1="26" y1="54" x2="48" y2="54" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
          <line x1="26" y1="60" x2="45" y2="60" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
          <line x1="26" y1="66" x2="40" y2="66" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
        </g>
        
        {/* Right Page Bar Chart Columns - Deep Teal */}
        <g>
          {/* Bar 1 */}
          <rect x="71" y="61" width="6" height="10" rx="1.5" className="fill-cyan-500 dark:fill-cyan-400" />
          {/* Bar 2 */}
          <rect x="81" y="52" width="6" height="19" rx="1.5" className="fill-cyan-500 dark:fill-cyan-400" />
          {/* Bar 3 */}
          <rect x="91" y="44" width="6" height="27" rx="1.5" className="fill-cyan-500 dark:fill-cyan-400" />
        </g>
        
        {/* Teal growth arrow surging upwards out of the book */}
        <g>
          <path 
            d="M 50,60 C 65,55 82,45 101,23" 
            className="stroke-cyan-500 dark:stroke-cyan-400"
            strokeWidth="4.5" 
            strokeLinecap="round" 
            fill="none" 
          />
          <path 
            d="M 91,22 L 102,22 L 102,33" 
            className="stroke-cyan-500 dark:stroke-cyan-400"
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none" 
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-sans tracking-tight ${textPrimaryColor} font-extrabold text-xl py-0.5`}>
              Ledger
            </span>
            <span className="font-sans tracking-tight text-cyan-500 dark:text-cyan-400 font-extrabold text-xl py-0.5">
              Smart
            </span>
          </div>
          <p className={`text-[9.5px] uppercase font-bold tracking-wider mt-1 font-sans ${textSecondaryColor}`}>
            Your Path to Financial Clarity
          </p>
        </div>
      )}
    </div>
  );
}
