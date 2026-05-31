import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Transaction, Budget, SavingsGoal } from '../types';
import { 
  Send, 
  Sparkles, 
  BrainCircuit, 
  HelpCircle,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock
} from 'lucide-react';

interface AIAssistantProps {
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isGenerating: boolean;
  onClearHistory?: () => void;
}

export default function AIAssistant({
  transactions,
  budgets,
  savingsGoals,
  messages,
  onSendMessage,
  isGenerating,
  onClearHistory
}: AIAssistantProps) {
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts informed by the user's specific context
  const suggestionChips = [
    { text: "Suggest budget cutbacks", icon: PiggyBank },
    { text: "Analyze my outflows", icon: BrainCircuit },
    { text: "How to save for current goals?", icon: PiggyBank },
    { text: "Am I on track overall?", icon: CheckCircle2 }
  ];

  // Auto-scroll to bottom on fresh interactions
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleChipClick = (text: string) => {
    if (isGenerating) return;
    onSendMessage(text);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[580px]">
      
      {/* Header Panel */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold tracking-tight">Gemini Wealth Advisor</h3>
              <span className="text-[9px] font-bold uppercase bg-blue-500/35 text-blue-200 border border-blue-400/20 py-0.5 px-2 rounded-full">
                AI Agent
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Context-aware personal finance strategist</p>
          </div>
        </div>

        {onClearHistory && messages.length > 1 && (
          <button
            onClick={onClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message Scroller */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-full max-w-sm mx-auto space-y-4">
            <div className="p-3.5 bg-blue-50 dark:bg-slate-900 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-450">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800 dark:text-slate-200">Ask Gemini Financial Advisor</h4>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Your Gemini-counselor has real-time awareness of your transactions logs, savings milestones, and spending ratios. Ask anything.
              </p>
            </div>
            
            {/* Display suggestion chips */}
            <div className="grid grid-cols-2 gap-2 w-full pt-4">
              {suggestionChips.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleChipClick(chip.text)}
                    className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl text-center shadow-3xs cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group active:scale-95"
                  >
                    <Icon className="w-4 h-4 text-blue-500 dark:text-blue-400 group-hover:scale-115 transition-transform" />
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-slate-300 leading-tight">
                      {chip.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div 
                  key={m.id} 
                  className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-slate-800 text-blue-400 border border-slate-705'
                  }`}>
                    {isUser ? 'U' : 'G'}
                  </div>

                  {/* Bubble wrapper */}
                  <div className={`p-4 rounded-2xl shadow-3xs ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 border border-gray-100 dark:border-slate-800 rounded-tl-none'
                  }`}>
                    {/* Render message formatting lines simply */}
                    <div className="text-xs leading-relaxed space-y-2 font-medium">
                      {m.text.split('\n').map((line, lIdx) => {
                        // Support light bullets or sub-points formatting
                        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                          return (
                            <li key={lIdx} className="ml-3 list-disc">
                              {line.replace(/^[\*\-]\s+/, '')}
                            </li>
                          );
                        }
                        // Render standard text
                        return (
                          <p key={lIdx}>
                            {line}
                          </p>
                        );
                      })}
                    </div>
                    
                    {/* Time index */}
                    <div className={`flex items-center gap-1 text-[8px] mt-2.5 ${isUser ? 'text-blue-100 justify-end' : 'text-gray-400 dark:text-slate-500'}`}>
                      <Clock className="w-2.5 h-2.5" />
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pulse generation loader */}
            {isGenerating && (
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-blue-400 border border-slate-750 flex items-center justify-center">
                  G
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-3xs flex items-center gap-2">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Gemini Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts if conversation is active */}
      {messages.length > 0 && !isGenerating && (
        <div className="p-3 bg-gray-50/50 dark:bg-slate-950/20 border-t border-gray-100 dark:border-slate-800 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          {suggestionChips.slice(0, 3).map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip.text)}
              className="text-[10px] font-bold bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-350 border border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 py-1.5 px-3.5 rounded-full shadow-3xs transition-colors cursor-pointer"
            >
              {chip.text}
            </button>
          ))}
        </div>
      )}

      {/* Input submission box */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. Can you break down my entertainment budget?..."
            className="flex-1 bg-gray-50/50 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-950/80 border border-gray-200 dark:border-slate-800 text-slate-950 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 rounded-xl px-4 py-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isGenerating || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs shrink-0 cursor-pointer flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
