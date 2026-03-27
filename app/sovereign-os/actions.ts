'use server'

import { cookies } from 'next/headers';

const JS_BASE = process.env.JOBSCOUT_API_URL!;
const JS_KEY = process.env.JOBSCOUT_API_KEY!;
const CIA_BASE = process.env.CAREER_ASSISTANT_API_URL!;
const CIA_PASS = process.env.CAREER_ASSISTANT_API_KEY!;

// ── helpers ──────────────────────────────────────────────────────────────────
async function jsGet(path: string, qs?: Record<string, string>) {
  const url = new URL(`${JS_BASE}/api/v1/${path}`);
  if (qs) Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { 'X-API-Key': JS_KEY }, next: { revalidate: 0 } });
  return res.ok ? res.json() : null;
}

async function jsPost(path: string, body: unknown) {
  const res = await fetch(`${JS_BASE}/api/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': JS_KEY },
    body: JSON.stringify(body),
  });
  return res.ok ? res.json() : null;
}

async function ciaPost(path: string, body: unknown, sessionId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) headers['X-Session-ID'] = sessionId;
  const res = await fetch(`${CIA_BASE}/api/v1/${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Career API error: ${err}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function verifyPin(pin: string) {
  const validPin = process.env.SOVEREIGN_OS_PIN || '1234';
  if (pin === validPin) {
    const cookieStore = await cookies();
    cookieStore.set('sovereign_auth', 'true', {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true, path: '/', maxAge: 60 * 60 * 24,
    });
    return { success: true };
  }
  return { success: false, error: 'Access Denied: Invalid PIN' };
}

// ── JobScout: Jobs ────────────────────────────────────────────────────────────
export async function actOnJob(jobId: string, action: 'applied' | 'dismissed' | 'bookmarked') {
  return jsPost(`jobs/${jobId}/action`, { action });
}

export async function getApplyQueue(page = 1, perPage = 15, minScore?: number) {
  return jsGet('jobs/apply', {
    page: String(page), per_page: String(perPage), sort: 'score',
    ...(minScore ? { min_score: String(minScore) } : {}),
  });
}

export async function getStats() {
  return jsGet('stats/applied');
}

export async function getQueueSize() {
  const data = await jsGet('jobs/apply', { page: '1', per_page: '1' });
  return (data?.total as number) ?? 0;
}

// ── JobScout: Companies ───────────────────────────────────────────────────────
export async function getCompanies(page = 1, q = '') {
  return jsGet('companies', { page: String(page), per_page: '20', ...(q ? { q } : {}) });
}

export async function checkSponsor(companyName: string) {
  return jsPost('companies/check-sponsor', { company_name: companyName, careers_url: '' });
}

// ── JobScout: Pipeline ────────────────────────────────────────────────────────
export async function triggerScout() {
  const res = await fetch(`${JS_BASE}/api/run`, {
    method: 'POST',
    headers: { 'X-API-Key': JS_KEY },
  });
  return res.ok ? res.json() : null;
}

// ── Career Intelligence ───────────────────────────────────────────────────────
export async function createCareerSession(): Promise<string> {
  const data = await ciaPost('session', {});
  return data.session_id as string;
}

export async function loginCareerSession(sessionId: string): Promise<void> {
  await ciaPost('session/password-login', { password: CIA_PASS }, sessionId);
}

export async function uploadJobDescription(sessionId: string, text: string) {
  return ciaPost('upload/job-description', { text }, sessionId);
}

export async function startAnalysis(sessionId: string, jobId: string) {
  const started = await ciaPost('analyze', { session_id: sessionId, job_ids: [jobId] }, sessionId);
  if (!started?.analysis_id) return null;

  // Poll up to 60s
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`${CIA_BASE}/api/v1/analysis/${started.analysis_id}`, {
      headers: { 'X-Session-ID': sessionId },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'completed') return (data.result ?? data) as Record<string, unknown>;
      if (data.status === 'failed') return null;
    }
  }
  return null;
}

export async function pollAnalysis(sessionId: string, analysisId: string) {
  const res = await fetch(`${CIA_BASE}/api/v1/analysis/${analysisId}`, {
    headers: { 'X-Session-ID': sessionId },
  });
  return res.ok ? res.json() : null;
}
