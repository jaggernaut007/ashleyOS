'use client';
import React from 'react';

type Stats = {
  applied_today: number;
  applied_week: number;
  applied_total: number;
  queue_size: number;
};

export default function StatsBar({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Applied Today', value: stats.applied_today, color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    { label: 'This Week', value: stats.applied_week, color: 'text-violet-400', glow: 'shadow-violet-500/20' },
    { label: 'All Time', value: stats.applied_total, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    { label: 'In Queue', value: stats.queue_size, color: 'text-amber-400', glow: 'shadow-amber-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 flex-shrink-0">
      {items.map((item) => (
        <div
          key={item.label}
          className={`relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-4 shadow-lg ${item.glow}`}
        >
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{item.label}</div>
          <div className={`text-3xl font-black ${item.color} tabular-nums`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
