import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.JOBSCOUT_API_URL!;
const KEY = process.env.JOBSCOUT_API_KEY!;

type RouteContext = { params: Promise<{ path: string[] }> };

// Special top-level paths that live outside /api/v1
const TOP_LEVEL = new Set(['health', 'run']);

function buildUpstreamUrl(pathParts: string[], search: string) {
  const first = pathParts[0];
  if (TOP_LEVEL.has(first)) {
    // e.g. /api/sovereign/health → BASE/health
    return `${BASE}/${pathParts.join('/')}${search}`;
  }
  // Everything else → BASE/api/v1/...
  return `${BASE}/api/v1/${pathParts.join('/')}${search}`;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const url = buildUpstreamUrl(path, req.nextUrl.search);
  const res = await fetch(url, { headers: { 'X-API-Key': KEY }, next: { revalidate: 0 } });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const url = buildUpstreamUrl(path, '');
  const body = await req.text();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const url = buildUpstreamUrl(path, '');
  const res = await fetch(url, { method: 'DELETE', headers: { 'X-API-Key': KEY } });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
