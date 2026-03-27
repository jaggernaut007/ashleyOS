import React from 'react';
import { cookies } from 'next/headers';
import PinGate from '@/components/PinGate';
import MissionControl from '@/components/sovereign/MissionControl';

export default async function SovereignOS() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('sovereign_auth')?.value === 'true';

  if (!isAuthenticated) return <PinGate />;

  // Parallel-fetch initial data on the server
  const [statsRes, queueRes] = await Promise.allSettled([
    fetch(`${process.env.JOBSCOUT_API_URL}/api/v1/stats/applied`, {
      headers: { 'X-API-Key': process.env.JOBSCOUT_API_KEY || '' }, next: { revalidate: 30 },
    }),
    fetch(`${process.env.JOBSCOUT_API_URL}/api/v1/jobs/apply?per_page=20&sort=score`, {
      headers: { 'X-API-Key': process.env.JOBSCOUT_API_KEY || '' }, next: { revalidate: 30 },
    }),
  ]);

  const stats = statsRes.status === 'fulfilled' && statsRes.value.ok ? await statsRes.value.json() : null;
  const queueData = queueRes.status === 'fulfilled' && queueRes.value.ok ? await queueRes.value.json() : null;

  return (
    <MissionControl
      initialStats={stats}
      initialJobs={queueData?.items ?? []}
      initialQueueTotal={queueData?.total ?? 0}
    />
  );
}
