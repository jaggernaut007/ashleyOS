'use client';
import React, { useState } from 'react';
import StatsBar from '@/components/sovereign/StatsBar';
import JobReviewPipeline, { type PipelineJob } from '@/components/JobReviewPipeline';
import CompaniesPanel from '@/components/sovereign/CompaniesPanel';
import ScoutPanel from '@/components/sovereign/ScoutPanel';
import CareerAIPanel from '@/components/sovereign/CareerAIPanel';
import RunwayHealth from '@/components/RunwayHealth';

const TABS = ['Intel', 'Companies', 'Scout', 'Career AI', 'Financials'] as const;
type Tab = typeof TABS[number];

type Stats = { applied_today: number; applied_week: number; applied_total: number };

export default function MissionControl({
  initialStats,
  initialJobs,
  initialQueueTotal,
}: {
  initialStats: Stats | null;
  initialJobs: PipelineJob[];
  initialQueueTotal: number;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('Intel');

  const stats = {
    applied_today: initialStats?.applied_today ?? 0,
    applied_week: initialStats?.applied_week ?? 0,
    applied_total: initialStats?.applied_total ?? 0,
    queue_size: initialQueueTotal,
  };

  return (
    <main className="min-h-screen w-full bg-[#0a0f18] text-slate-50 font-sans selection:bg-cyan-500/30">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col h-screen max-h-screen overflow-hidden p-4 md:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Sovereign OS</h1>
              <p className="text-xs font-medium text-cyan-400 tracking-widest uppercase">Mission Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs font-medium text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Online
          </div>
        </header>

        {/* Stats Bar */}
        <StatsBar stats={stats} />

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 flex-shrink-0 bg-slate-900/60 rounded-2xl p-1 border border-slate-700/50 backdrop-blur-xl">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-violet-600/80 to-cyan-600/80 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'Intel' && (
            <div className="h-full">
              <JobReviewPipeline initialJobs={initialJobs} />
            </div>
          )}
          {activeTab === 'Companies' && (
            <div className="h-full rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-2xl p-5 shadow-lg overflow-hidden flex flex-col">
              <CompaniesPanel />
            </div>
          )}
          {activeTab === 'Scout' && (
            <div className="h-full rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-2xl p-5 shadow-lg overflow-y-auto custom-scrollbar">
              <ScoutPanel />
            </div>
          )}
          {activeTab === 'Career AI' && (
            <div className="h-full rounded-3xl border border-violet-500/20 bg-slate-900/60 backdrop-blur-2xl p-5 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.2)] overflow-hidden flex flex-col">
              <CareerAIPanel />
            </div>
          )}
          {activeTab === 'Financials' && (
            <div className="h-full rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-2xl p-5 shadow-lg overflow-y-auto custom-scrollbar">
              <RunwayHealth />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
