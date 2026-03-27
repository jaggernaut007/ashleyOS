'use server'

const JS_BASE = process.env.JOBSCOUT_API_URL!;
const JS_KEY = process.env.JOBSCOUT_API_KEY!;

const SOURCES = ['jooble', 'linkedin', 'adzuna', 'reed'];
const DEFAULT_QUERY = 'AI Engineer OR AI Agent OR Founding Engineer OR Applied AI OR Head of AI';

// Helper: get a fresh browser session cookie for shreyasjag via /login
let _sessionCookie: string | null = null;

async function getSessionCookie(): Promise<string> {
  if (_sessionCookie) return _sessionCookie;
  // Re-auth — POST to /login with credentials
  const res = await fetch(`${JS_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: 'shreyasjag',
      password: process.env.JOBSCOUT_WEB_PASSWORD || '',
    }),
    redirect: 'manual', // capture the Set-Cookie before redirect
  });
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('Login failed — check JOBSCOUT_WEB_PASSWORD');
  // Extract session_id value from Set-Cookie header
  const match = setCookie.match(/session_id=([^;]+)/);
  if (!match) throw new Error('No session_id in Set-Cookie');
  _sessionCookie = `session_id=${match[1]}`;
  return _sessionCookie;
}

export async function triggerVibeSearch(query: string, sponsorOnly: boolean) {
  // First try with API key — if it fails (404) fall back to cookie session
  const sessionCookie = await getSessionCookie().catch(() => null);
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (sessionCookie) headers['Cookie'] = sessionCookie;

  const body = new URLSearchParams({
    query: query || DEFAULT_QUERY,
    sponsor_only: sponsorOnly ? '1' : '',
  });
  SOURCES.forEach(s => body.append('sources', s));

  const res = await fetch(`${JS_BASE}/web/api/vibe/search`, {
    method: 'POST',
    headers,
    body: body.toString(),
    redirect: 'manual',
  });

  return res.status < 500;
}

export async function getVibeStatus() {
  const sessionCookie = await getSessionCookie().catch(() => null);
  const headers: Record<string, string> = {};
  if (sessionCookie) headers['Cookie'] = sessionCookie;

  const res = await fetch(`${JS_BASE}/web/api/vibe/status`, {
    headers, next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  // Returns HTML partial — parse for done/running state
  const text = await res.text();
  const isRunning = !text.includes('class="job-') && !text.includes('No search');
  return { html: text, isRunning };
}

export async function getVibeResults(sponsorOnly = false) {
  const sessionCookie = await getSessionCookie().catch(() => null);
  const headers: Record<string, string> = {};
  if (sessionCookie) headers['Cookie'] = sessionCookie;

  const qs = sponsorOnly ? '?sponsor_only=true' : '';
  const res = await fetch(`${JS_BASE}/web/api/vibe/results${qs}`, {
    headers, next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  return res.text();
}
