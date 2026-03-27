'use client';
import React, { useState } from 'react';
import { createCareerSession, loginCareerSession, uploadJobDescription, startAnalysis, pollAnalysis } from '@/app/sovereign-os/actions';

type Step = 'idle' | 'connecting' | 'ready' | 'uploading' | 'analyzing' | 'done' | 'error';

type AnalysisResult = {
  overall_score?: number;
  recommendation?: string;
  matched_skills?: string[];
  missing_skills?: string[];
  summary?: string;
  [key: string]: unknown;
};

export default function CareerAIPanel() {
  const [step, setStep] = useState<Step>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const connect = async () => {
    setStep('connecting');
    setError('');
    try {
      const sid = await createCareerSession();
      await loginCareerSession(sid);
      setSessionId(sid);
      setStep('ready');
    } catch (e) {
      setError('Failed to connect to Career Intelligence service.');
      setStep('error');
    }
  };

  const handleAnalyze = async () => {
    if (!sessionId || !jdText.trim()) return;
    setStep('uploading');
    try {
      const jd = await uploadJobDescription(sessionId, jdText);
      setJobId(jd.job_id);
      setJobTitle(jd.title || 'Role');
      setStep('analyzing');
      
      // Start analysis (no resume in this flow — pass just JD, server has your profile)
      const analysis = await startAnalysis(sessionId, jd.job_id);
      if (analysis) {
        setResult(analysis);
        setStep('done');
      } else {
        setError('Analysis timed out. Try again.');
        setStep('error');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
      setStep('error');
    }
  };

  const reset = () => {
    setStep('ready');
    setJdText('');
    setJobId(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold text-white">Career Intelligence</h3>
          <p className="text-sm text-slate-400">Paste any JD — AI analyses your fit against your profile</p>
        </div>
        {sessionId && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-xs font-semibold text-emerald-400">Session Active</span>
          </div>
        )}
      </div>

      {/* Idle: connect */}
      {step === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm text-center max-w-xs">Connect to Career Intelligence to start analysing job descriptions against your profile.</p>
          <button onClick={connect} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all">
            Connect Career AI
          </button>
        </div>
      )}

      {/* Connecting */}
      {step === 'connecting' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Connecting to Career AI...</p>
          </div>
        </div>
      )}

      {/* Ready: paste JD */}
      {step === 'ready' && (
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste the job description here..."
            className="flex-1 min-h-[200px] bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none custom-scrollbar"
          />
          <button
            onClick={handleAnalyze}
            disabled={!jdText.trim()}
            className="py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all"
          >
            Analyse My Fit
          </button>
        </div>
      )}

      {/* Uploading/Analyzing */}
      {(step === 'uploading' || step === 'analyzing') && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white font-semibold">{step === 'uploading' ? 'Parsing job description...' : `Analysing fit for "${jobTitle}"...`}</p>
            <p className="text-slate-500 text-sm mt-1">Running AI analysis against your profile</p>
          </div>
        </div>
      )}

      {/* Done: results */}
      {step === 'done' && result && (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {/* Score */}
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Match Score</div>
                <div className="text-4xl font-black text-violet-400">{result.overall_score != null ? `${Math.round(Number(result.overall_score) * 100)}%` : '--'}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Recommendation</div>
                <div className="text-sm font-bold text-cyan-300">{result.recommendation || '—'}</div>
              </div>
            </div>
            {result.summary && <p className="text-sm text-slate-300 mt-3 leading-relaxed">{result.summary}</p>}
          </div>

          {/* Matched skills */}
          {result.matched_skills && result.matched_skills.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-2">✓ Matched Skills</div>
              <div className="flex flex-wrap gap-2">
                {result.matched_skills.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing skills */}
          {result.missing_skills && result.missing_skills.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">✗ Gap Areas</div>
              <div className="flex flex-wrap gap-2">
                {result.missing_skills.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">{s}</span>
                ))}
              </div>
            </div>
          )}

          <button onClick={reset} className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
            Analyse Another Role
          </button>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-rose-400 text-sm text-center">{error}</p>
          <button onClick={() => setStep('idle')} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Retry</button>
        </div>
      )}
    </div>
  );
}
