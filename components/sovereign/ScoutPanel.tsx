'use client';
import React, { useState, useEffect } from 'react';
import { triggerScout } from '@/app/sovereign-os/actions';
import { triggerVibeSearch } from '@/app/sovereign-os/vibe-actions';

type RunResult = {
  new_jobs_found?: number;
  strong_matches?: number;
  good_matches?: number;
  [key: string]: unknown;
};

type VibeState = 'idle' | 'running' | 'done' | 'error';

const SOURCES = [
  { id: 'jooble', label: 'Jooble' },
  { id: 'adzuna', label: 'Adzuna' },
  { id: 'reed', label: 'Reed' },
  { id: 'linkedin', label: 'LinkedIn' },
];

export default function ScoutPanel() {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [health, setHealth] = useState<'ok' | 'error' | 'checking'>('checking');
  const [log, setLog] = useState<string[]>([]);

  // Vibe state
  const [vibeState, setVibeState] = useState<VibeState>('idle');
  const [vibeQuery, setVibeQuery] = useState('');
  const [vibeSponsorOnly, setVibeSponsorOnly] = useState(true);
  const [vibeLog, setVibeLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  const addVibeLog = (msg: string) => setVibeLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  useEffect(() => {
    fetch('/api/sovereign/health')
      .then(r => r.ok ? setHealth('ok') : setHealth('error'))
      .catch(() => setHealth('error'));
  }, []);

  const handleRun = async () => {
    setRunning(true);
    addLog('Triggering scout pipeline...');
    try {
      const result = await triggerScout();
      setLastResult(result);
      if (result) {
        addLog(`Run complete — ${result.new_jobs_found ?? '?'} new jobs, ${result.strong_matches ?? '?'} strong matches.`);
      } else {
        addLog('Run triggered (async — check back in ~60s).');
      }
    } catch {
      addLog('Error triggering pipeline.');
    }
    setRunning(false);
  };

  const handleVibeSearch = async () => {
    setVibeState('running');
    addVibeLog(`Starting vibe search: "${vibeQuery || 'AI Engineer OR AI Agent OR Applied AI'}"...`);
    try {
      const ok = await triggerVibeSearch(vibeQuery, vibeSponsorOnly);
      if (ok) {
        addVibeLog('Search triggered — results will appear in Intel tab once scored.');
        setVibeState('done');
      } else {
        addVibeLog('Trigger failed — check JobScout web password in .env.local.');
        setVibeState('error');
      }
    } catch (e) {
      addVibeLog(`Error: ${e instanceof Error ? e.message : 'unknown'}`);
      setVibeState('error');
    }
  };

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto custom-scrollbar pr-1">
      
      {/* ── Scout / Pipeline Section ──────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">ATS Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Health */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Service Health</div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${health === 'ok' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : health === 'error' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className={`font-bold ${health === 'ok' ? 'text-emerald-400' : health === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
                {health === 'ok' ? 'Operational' : health === 'error' ? 'Unreachable' : 'Checking...'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">jobscout-web.a.run.app</p>
          </div>

          {/* Trigger */}
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-800/40 p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Pipeline Control</div>
            <button onClick={handleRun} disabled={running}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>Running...
                </span>
              ) : '⚡ Run Scout Now'}
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">Runs daily at 8AM UK automatically</p>
          </div>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: 'New Jobs', value: lastResult.new_jobs_found ?? '--', color: 'text-cyan-400' },
              { label: 'Strong', value: lastResult.strong_matches ?? '--', color: 'text-violet-400' },
              { label: 'Good', value: lastResult.good_matches ?? '--', color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-3 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{String(s.value)}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pipeline Log */}
        {log.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-700/50 bg-slate-950/60 p-3 font-mono text-xs text-slate-400 max-h-20 overflow-y-auto custom-scrollbar">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>

      {/* ── Vibe Search Section ───────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Vibe Search (Internet-Wide)</h3>
        <div className="rounded-2xl border border-violet-500/20 bg-slate-800/40 p-5 flex flex-col gap-4">
          <p className="text-sm text-slate-400">Search across Jooble, Adzuna, Reed, and LinkedIn — not just tracked companies.</p>

          <div className="flex flex-col gap-3">
            <input
              value={vibeQuery}
              onChange={e => setVibeQuery(e.target.value)}
              placeholder="AI Engineer OR AI Agent OR Applied AI OR Head of AI..."
              className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(s => (
                <span key={s.id} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/60 text-slate-300 border border-slate-600">
                  {s.label}
                </span>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setVibeSponsorOnly(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors ${vibeSponsorOnly ? 'bg-cyan-500' : 'bg-slate-600'} relative`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${vibeSponsorOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300">Visa sponsors only</span>
            </label>
          </div>

          <button
            onClick={handleVibeSearch}
            disabled={vibeState === 'running'}
            className="py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-black text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all disabled:opacity-60"
          >
            {vibeState === 'running' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>Searching...
              </span>
            ) : vibeState === 'done' ? '✓ Search Triggered — Check Intel Tab' : '🔍 Start Vibe Search'}
          </button>

          {vibeLog.length > 0 && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-3 font-mono text-xs text-slate-400 max-h-24 overflow-y-auto custom-scrollbar">
              {vibeLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
