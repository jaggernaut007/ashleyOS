'use client';
import React, { useState } from 'react';
import { actOnJob } from '@/app/sovereign-os/actions';

export type PipelineJob = {
  id: string;
  title: string;
  location?: string | null;
  employment_type?: string | null;
  company?: { name: string; is_visa_sponsor?: boolean };
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  match?: { relevance_score: number; match_reasons?: string[]; keyword_matches?: string[] };
  action?: { action: string } | null;
  apply_url: string;
  is_visa_sponsor?: boolean | null;
};

function formatSalary(job: PipelineJob) {
  if (!job.salary_min) return null;
  const curr = job.salary_currency === 'GBP' ? '£' : job.salary_currency === 'USD' ? '$' : '€';
  if (job.salary_max && job.salary_max !== job.salary_min)
    return `${curr}${Math.round(job.salary_min / 1000)}k–${curr}${Math.round(job.salary_max / 1000)}k`;
  return `${curr}${Math.round(job.salary_min / 1000)}k`;
}

export default function JobReviewPipeline({ initialJobs = [] }: { initialJobs: PipelineJob[] }) {
  const [jobs, setJobs] = useState<PipelineJob[]>(initialJobs);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);

  const visibleJobs = jobs.filter(j => (j.match?.relevance_score ?? 0) >= minScore / 100);

  const handleAction = async (job: PipelineJob, action: 'applied' | 'dismissed' | 'bookmarked') => {
    setProcessingId(job.id);
    const ok = await actOnJob(job.id, action);
    if (ok) {
      if (action !== 'bookmarked') {
        setJobs(jobs.filter(j => j.id !== job.id));
        if (action === 'applied' && job.apply_url) window.open(job.apply_url, '_blank');
      } else {
        // Bookmarked — keep in list, just update visually
        setJobs(jobs.map(j => j.id === job.id ? { ...j, action: { action: 'bookmarked' } } : j));
      }
    }
    setProcessingId(null);
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 p-5 shadow-[0_10px_40px_-10px_rgba(6,182,212,0.3)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Visa Hunter Queue</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-300">{visibleJobs.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">min score</span>
          <input
            type="range" min="0" max="90" step="10" value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="w-20 accent-cyan-500"
          />
          <span className="text-xs text-cyan-400 w-8">{minScore}%</span>
        </div>
      </div>

      {/* List */}
      <div className="relative z-10 flex flex-col gap-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {visibleJobs.length === 0 ? (
          <div className="text-center p-12 text-slate-500 flex flex-col items-center gap-3">
            <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
            </svg>
            <p>Queue is clear — nice work.</p>
          </div>
        ) : visibleJobs.map(job => {
          const score = job.match?.relevance_score ?? 0;
          const scoreColor = score >= 0.7 ? 'text-emerald-400' : score >= 0.5 ? 'text-amber-400' : 'text-slate-400';
          const isExpanded = expandedId === job.id;
          const salary = formatSalary(job);
          const isBookmarked = job.action?.action === 'bookmarked';

          return (
            <div key={job.id} className={`group rounded-2xl border transition-all ${isBookmarked ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/70 hover:border-cyan-500/40'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="font-bold text-slate-100 group-hover:text-cyan-400 transition-colors cursor-pointer truncate"
                        onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      >{job.title}</h3>
                      {(job.is_visa_sponsor || job.company?.is_visa_sponsor) && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex-shrink-0">Visa ✓</span>
                      )}
                      {isBookmarked && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">★</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {job.company?.name || 'Unknown'}{job.location ? ` · ${job.location}` : ''}{salary ? ` · ${salary}` : ''}
                      {job.employment_type ? ` · ${job.employment_type}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Score */}
                    <div className={`text-xl font-black ${scoreColor} w-12 text-right`}>
                      {score ? `${Math.round(score * 100)}%` : '--'}
                    </div>
                    {/* Actions */}
                    <button onClick={() => handleAction(job, 'applied')} disabled={processingId === job.id}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-900 text-sm font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50">
                      {processingId === job.id ? '...' : 'Apply'}
                    </button>
                    <button onClick={() => handleAction(job, 'bookmarked')} disabled={processingId === job.id}
                      className={`px-2 py-1.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${isBookmarked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400 hover:text-amber-400'}`}
                      title="Bookmark">★</button>
                    <button onClick={() => handleAction(job, 'dismissed')} disabled={processingId === job.id}
                      className="px-2 py-1.5 rounded-xl bg-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50">✕</button>
                  </div>
                </div>

                {/* Expanded: match details */}
                {isExpanded && job.match && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    {job.match.match_reasons?.length ? (
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Why it matched</div>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {job.match.match_reasons.map((r, i) => <li key={i} className="flex gap-2"><span className="text-cyan-500">›</span>{r}</li>)}
                        </ul>
                      </div>
                    ) : null}
                    {job.match.keyword_matches?.length ? (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keywords</div>
                        <div className="flex flex-wrap gap-1.5">
                          {job.match.keyword_matches.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">{kw}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
