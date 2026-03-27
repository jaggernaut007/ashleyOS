'use client';
import React, { useState } from 'react';

export default function RunwayHealth() {
  const [baseline] = useState(1300);
  const [currentSpend] = useState(850);
  const percentage = Math.min((currentSpend / baseline) * 100, 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 p-6 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">Runway Health</h2>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40">
            CFO Agent Active
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-400 font-medium">Monthly Spend</p>
              <p className="text-3xl font-extrabold text-white">£{currentSpend}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 font-medium">Target Baseline</p>
              <p className="text-xl font-bold text-slate-300">£{baseline}</p>
            </div>
          </div>
          
          <div className="mt-2 h-3 w-full rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {100 - percentage > 0 ? `£${baseline - currentSpend} remaining before hitting limit.` : 'Baseline exceeded.'}
          </p>
        </div>

        <div className="mt-4 border-t border-slate-700/50 pt-4">
          <button className="w-full rounded-xl bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-300 border border-slate-700/50 hover:bg-slate-700 hover:text-white transition-all">
            Connect Open Banking
          </button>
        </div>
      </div>
    </div>
  );
}
