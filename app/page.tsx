'use client';

import React, { useState, useCallback } from 'react';
import { CodeProvider } from '@/context/CodeContext';
import { SavedComponentProvider } from '@/context/SavedComponentContext';
import { useCode } from '@/context/CodeContext';
import Canvas from '@/components/Canvas';
import IntentConsole from '@/components/IntentConsole';
import SaveMoodboard from '@/components/SaveMoodboard';
import SavedMoodboardList from '@/components/SavedMoodboardList';
import { MessageBus } from '@/lib/messageBus';
import { Intent } from '@/types/board';
import { Artifact } from '@/types/board';

// Create message bus instance
const messageBus = new MessageBus();

function HomeContent() {
  const { code, setCode, activeSegment, setActiveSegment } = useCode();
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);
  const [theme, setTheme] = useState<'day' | 'night'>('night');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isResettingBoard, setIsResettingBoard] = useState(false);
  const isNight = theme === 'night';

  const handleMoodAssetGenerated = useCallback((generatedCode: string) => {
    console.log('[page.tsx] handleMoodAssetGenerated called with code length:', generatedCode?.length);
    setCode(generatedCode);
  }, [setCode]);

  const handleIntentCreated = useCallback((intent: Intent) => {
    setCurrentIntent(intent);
  }, []);

  const handleLoadSavedMoodboard = useCallback(async (artifact: Artifact) => {
    setCode(artifact.content || '');

    if (artifact.intentId) {
      try {
        const res = await fetch('/api/board');
        if (res.ok) {
          const board = await res.json();
          const intent = board?.intents?.find((i: Intent) => i.id === artifact.intentId);
          if (intent) {
            setCurrentIntent(intent);
          }
        }
      } catch (err) {
        console.error('Failed to load intent for moodboard:', err);
      }
    }
  }, [setCode]);

  const handleNewBoard = useCallback(async () => {
    if (isResettingBoard) return;
    const confirmed = window.confirm('Start a new board? This will clear current intents and artifacts.');
    if (!confirmed) return;

    try {
      setIsResettingBoard(true);
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetBoard', data: {} }),
      });
      if (!res.ok) throw new Error('Failed to create new board');
      // Clear canvas content and current intent
      setCode('');
      setCurrentIntent(null);
      // Optionally close library if open
      setIsLibraryOpen(false);
    } catch (err) {
      console.error('Error resetting board:', err);
      alert('Could not create a new board. Please try again.');
    } finally {
      setIsResettingBoard(false);
    }
  }, [isResettingBoard, setCode]);

  return (
    <main className={`grid h-screen w-full grid-cols-1 lg:grid-cols-[320px,1fr] bg-transparent overflow-hidden transition-colors duration-500 ${isNight ? 'text-slate-50' : 'text-slate-900'}`} data-theme={theme}>
      {/* Intent Console - Left Panel */}
      <aside className={`order-2 lg:order-1 h-full p-6 flex flex-col border-t lg:border-t-0 lg:border-r backdrop-blur-sm overflow-y-auto transition-all duration-500 ${
        isNight 
          ? 'border-violet-500/20 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950/40' 
          : 'border-orange-400/20 bg-gradient-to-b from-slate-50/60 via-white/50 to-slate-50/60'
      }`}>
        <IntentConsole
          messageBus={messageBus}
          onMoodAssetGenerated={handleMoodAssetGenerated}
          onIntentCreated={handleIntentCreated}
        />
      </aside>

      {/* Canvas - Center */}
      <section className="order-1 lg:order-2 h-full p-6 flex flex-col gap-4 overflow-hidden">
        <div className={`flex items-center justify-between transition-colors duration-500 ${isNight ? 'text-slate-100' : 'text-slate-800'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold tracking-tight transition-colors duration-500 ${isNight ? 'text-slate-100' : 'text-slate-800'}`}>Mood Board Canvas</span>
            <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              isNight 
                ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                : 'bg-orange-500/20 text-orange-600 border border-orange-500/40'
            }`}>
              Active: Segment {activeSegment}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {code && currentIntent && (
              <SaveMoodboard
                componentCode={code}
                intentId={currentIntent.id}
                intentDescription={currentIntent.description}
                domain={currentIntent.domain}
                disabled={!code?.trim()}
              />
            )}
            <button
              type="button"
              onClick={handleNewBoard}
              disabled={isResettingBoard}
              className={`px-4 py-2 rounded-full font-semibold shadow-steel-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 ${
                isNight
                  ? 'bg-cyan-400 text-slate-900 hover:bg-cyan-300 ring-0 focus-visible:ring-cyan-300 focus-visible:ring-offset-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_10px_30px_rgba(14,165,233,0.45)]'
                  : 'bg-orange-500 text-white hover:bg-orange-400 ring-0 focus-visible:ring-orange-300 focus-visible:ring-offset-white shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_10px_30px_rgba(251,146,60,0.45)]'
              }`}
              aria-label="Start a new mood board"
            >
              {isResettingBoard ? 'Creating…' : '✨ New Board'}
            </button>
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="button-steel px-4 py-2"
            >
              📋 Library
            </button>
            <button
              type="button"
              onClick={() => setTheme(prev => (prev === 'day' ? 'night' : 'day'))}
              className="button-steel px-4 py-2"
            >
              <span className="font-semibold">{theme === 'day' ? 'Day' : 'Night'}</span>
              <span aria-hidden className="ml-1">{theme === 'day' ? '🌞' : '🌙'}</span>
            </button>
          </div>
        </div>

        <div className={`relative flex-1 w-full rounded-3xl overflow-hidden shadow-steel-premium border backdrop-blur-2xl transition-all duration-500 ${
          isNight 
            ? 'border-violet-500/40 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/70' 
            : 'border-orange-400/40 bg-gradient-to-br from-white/90 via-slate-50/80 to-white/90'
        }`}>
          <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none transition-opacity duration-500 ${
            isNight 
              ? 'from-violet-500/10 via-blue-500/5 to-transparent' 
              : 'from-orange-400/10 via-yellow-400/5 to-transparent'
          }`} />
          <Canvas theme={theme} />
        </div>

        {/* Mobile / Tablet save strip */}
        <div className={`relative flex items-center justify-between gap-3 rounded-xl border p-4 shadow-steel-soft backdrop-blur-xl xl:hidden transition-all duration-500 ${
          isNight 
            ? 'border-violet-500/30 bg-gradient-to-r from-slate-900/75 to-slate-900/70' 
            : 'border-orange-400/30 bg-gradient-to-r from-white/80 to-slate-50/75'
        }`}>
          <div className={`absolute inset-0 bg-gradient-to-br rounded-xl pointer-events-none transition-opacity duration-500 ${
            isNight 
              ? 'from-violet-500/8 via-blue-500/4 to-transparent' 
              : 'from-orange-400/8 via-yellow-400/4 to-transparent'
          }`} />
          <div className={`relative text-sm truncate transition-colors duration-500 ${isNight ? 'text-slate-200' : 'text-slate-700'}`}>
            {currentIntent ? (
              <span>
                Current Intent: <span className={`font-semibold transition-colors duration-500 ${isNight ? 'text-white' : 'text-slate-900'}`}>{currentIntent.title}</span>
              </span>
            ) : (
              <span>Submit an intent to get started</span>
            )}
          </div>

          {code && currentIntent && (
            <div className="relative">
              <SaveMoodboard
                componentCode={code}
                intentId={currentIntent.id}
                intentDescription={currentIntent.description}
                disabled={!code?.trim()}
              />
            </div>
          )}
        </div>

        {/* Saved boards on smaller screens */}
        <div className="xl:hidden">
          <SavedMoodboardList onLoad={handleLoadSavedMoodboard} />
        </div>
      </section>

      {/* Slide-out library */}
      <div
        className={`fixed inset-y-0 right-0 z-40 hidden xl:flex w-[320px] transform panel-steel transition-transform duration-300 ease-out ${isLibraryOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className={`flex h-full w-full flex-col gap-4 p-6 overflow-y-auto transition-colors duration-500 ${isNight ? 'text-slate-50' : 'text-slate-900'}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold tracking-tight">Board Library</p>
            <button
              type="button"
              onClick={() => setIsLibraryOpen(false)}
              className="button-steel px-3 py-1.5"
            >
              Close
            </button>
          </div>

          {code && currentIntent && (
            <div className="panel-steel-soft p-4">
              <p className="text-sm font-semibold text-slate-50 mb-2">Save to board</p>
              <SaveMoodboard
                componentCode={code}
                intentId={currentIntent.id}
                intentDescription={currentIntent.description}
                domain={currentIntent.domain}
                disabled={!code?.trim()}
              />
            </div>
          )}

          <SavedMoodboardList onLoad={handleLoadSavedMoodboard} />
        </div>
      </div>

      {/* Minimal current intent pill */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
        <div className={`pointer-events-auto relative flex items-center gap-2 rounded-full px-5 py-2.5 shadow-steel-premium backdrop-blur-xl border text-xs transition-all duration-500 ${
          isNight 
            ? 'bg-gradient-to-r from-slate-900/95 to-slate-800/95 text-white border-violet-500/40' 
            : 'bg-gradient-to-r from-white/95 to-slate-50/95 text-slate-900 border-orange-400/40'
        }`}>
          <div className={`absolute inset-0 bg-gradient-to-br rounded-full pointer-events-none transition-opacity duration-500 ${
            isNight 
              ? 'from-violet-500/15 via-blue-500/8 to-transparent' 
              : 'from-orange-400/15 via-yellow-400/8 to-transparent'
          }`} />
          <span className="relative opacity-80">Current</span>
          <span className="relative font-semibold">
            {currentIntent ? currentIntent.title : 'No intent yet'}
          </span>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <CodeProvider>
      <SavedComponentProvider>
        <HomeContent />
      </SavedComponentProvider>
    </CodeProvider>
  );
}
