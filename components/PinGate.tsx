'use client';

import React, { useState } from 'react';
import { verifyPin } from '@/app/sovereign-os/actions';

export default function PinGate() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    
    setIsChecking(true);
    setError('');
    
    try {
      const res = await verifyPin(pin);
      if (res.success) {
        // Force reload the page to re-evaluate the Server Component (page.tsx) and read the new cookie
        window.location.reload();
      } else {
        setError(res.error || 'Invalid PIN');
        setPin('');
      }
    } catch (err) {
      setError('System Error. Try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#0a0f18] text-slate-50 font-sans flex items-center justify-center p-4">
      {/* Background ambient effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-8 shadow-[0_10px_50px_-10px_rgba(6,182,212,0.15)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-cyan-500/5 to-transparent pointer-events-none" />
        
        <div className="relative flex flex-col items-center mb-8">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Restricted Access</h1>
            <p className="text-sm font-medium text-slate-400 mt-2 text-center">Enter your Mission Control PIN to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
          <div className="relative">
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:tracking-normal placeholder:opacity-40"
              autoFocus
              maxLength={8}
            />
          </div>
          
          {error && (
            <p className="text-rose-400 text-sm font-medium text-center animate-pulse">{error}</p>
          )}

          <button 
            type="submit" 
            disabled={isChecking || !pin}
            className="w-full mt-2 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </main>
  );
}
