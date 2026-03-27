'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { checkSponsor } from '@/app/sovereign-os/actions';

type Company = {
  id: string;
  name: string;
  ats_platform: string;
  careers_url: string;
  is_visa_sponsor: boolean;
  profile_match: number | null;
  scrape_status: string | null;
  last_scraped_at: string | null;
};

const statusColor: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  error: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  pending: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

export default function CompaniesPanel() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), per_page: '20', ...(q ? { q } : {}) });
      const res = await fetch(`/api/sovereign/companies?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.items || []);
        setTotalPages(data.total_pages || 1);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleCheckSponsor = async (company: Company) => {
    setCheckingId(company.id);
    await checkSponsor(company.name);
    setCheckingId(null);
    fetchCompanies();
  };

  const atsBadgeColor: Record<string, string> = {
    greenhouse: 'bg-green-500/20 text-green-300',
    lever: 'bg-blue-500/20 text-blue-300',
    ashby: 'bg-purple-500/20 text-purple-300',
    workday: 'bg-orange-500/20 text-orange-300',
    smartrecruiters: 'bg-pink-500/20 text-pink-300',
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header + search */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Search companies..."
          className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <div className="text-sm text-slate-500 flex-shrink-0">{total} tracked</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 custom-scrollbar">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-800/40 animate-pulse" />
          ))
        ) : companies.map(company => (
          <div key={company.id} className="group rounded-2xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 hover:bg-slate-800/70 hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-100 truncate">{company.name}</span>
                  {company.is_visa_sponsor && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex-shrink-0">Visa ✓</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${atsBadgeColor[company.ats_platform] || 'bg-slate-700 text-slate-300'}`}>
                    {company.ats_platform}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {company.scrape_status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor[company.scrape_status] || statusColor.pending}`}>
                      {company.scrape_status}
                    </span>
                  )}
                  {company.last_scraped_at && (
                    <span className="text-xs text-slate-500">
                      {new Date(company.last_scraped_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {company.profile_match != null && (
                  <div className="text-center">
                    <div className="text-lg font-black text-violet-400">{company.profile_match}%</div>
                    <div className="text-xs text-slate-500">match</div>
                  </div>
                )}
                <button
                  onClick={() => handleCheckSponsor(company)}
                  disabled={checkingId === company.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-slate-300 hover:bg-violet-500/20 hover:text-violet-300 transition-colors disabled:opacity-50"
                >
                  {checkingId === company.id ? '...' : 'Check'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 flex-shrink-0 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">←</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700">→</button>
        </div>
      )}
    </div>
  );
}
