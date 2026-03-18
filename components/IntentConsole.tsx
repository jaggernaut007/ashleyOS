'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { MessageBus } from '@/lib/messageBus';
import { loadConnectorSummaries } from '@/lib/connectors';
import { MoodAssetContext } from '@/lib/agents';
import { Board, Intent } from '@/types/board';
import { useCode } from '@/context/CodeContext';

interface IntentConsoleProps {
  messageBus: MessageBus;
  onMoodAssetGenerated?: (code: string) => void;
  onIntentCreated?: (intent: Intent) => void;
}

export default function IntentConsole({
  messageBus,
  onMoodAssetGenerated,
  onIntentCreated,
}: IntentConsoleProps) {
  const { activeSegment, setActiveSegment } = useCode();
  const selectedDomain = `segment-${activeSegment}`;
  const [intentInput, setIntentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [boardData, setBoardData] = useState<Board | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastMoodContext, setLastMoodContext] = useState<MoodAssetContext | null>(null);
  const [refineText, setRefineText] = useState('');

  // Load board data on mount
  useEffect(() => {
    const loadBoard = async () => {
      try {
        const response = await fetch('/api/board');
        const board = await response.json();
        setBoardData(board);
      } catch (error) {
        console.error('Error loading board:', error);
        setErrorMessage('Failed to load board data');
      }
    };
    loadBoard();
  }, []);

  // Listen for code generation completion
  useEffect(() => {
    console.log('[IntentConsole] Registering codegen:complete listener');
    const unsubscribe = messageBus.subscribeTo('codegen:complete', (event) => {
      console.log('[IntentConsole] Received codegen:complete event:', event);
      if (onMoodAssetGenerated) {
        console.log('[IntentConsole] Calling onMoodAssetGenerated with code length:', event.data.code?.length);
        onMoodAssetGenerated(event.data.code);
      }
      setIsLoading(false);
      setSuccessMessage('Mood asset generated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    });

    return unsubscribe;
  }, [messageBus, onMoodAssetGenerated]);

  // Listen for code generation errors
  useEffect(() => {
    const unsubscribe = messageBus.subscribeTo('codegen:error', (event) => {
      setIsLoading(false);
      setErrorMessage(`Error: ${event.data.error}`);
      setTimeout(() => setErrorMessage(''), 3000);
    });

    return unsubscribe;
  }, [messageBus]);

  const generateAndPublishMoodAsset = useCallback(
    async (context: MoodAssetContext, refinementOverride?: string) => {
      const moodAssetResponse = await fetch('/api/mood-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, refinement: refinementOverride ?? '' }),
      });

      if (!moodAssetResponse.ok) {
        throw new Error(`Mood asset generation failed: ${moodAssetResponse.statusText}`);
      }

      const moodAssetResult = await moodAssetResponse.json();
      console.log('Mood asset generated, publishing event...');

      if (moodAssetResult.approved) {
        messageBus.publishToTopic('codegen:complete', {
          code: moodAssetResult.code,
          approved: true,
          evaluations: moodAssetResult.evaluations,
          mood: moodAssetResult.mood,
        });
      } else {
        messageBus.publishToTopic('codegen:error', {
          error: 'Code review failed. Please revise the intent and try again.',
          evaluations: moodAssetResult.evaluations,
        });
      }

      return moodAssetResult;
    },
    [messageBus]
  );

  const handleSubmitIntent = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!intentInput.trim()) {
        setErrorMessage('Please enter an intent');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      try {
        // Create intent on board
        const createIntentResponse = await fetch('/api/board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createIntent',
            data: {
              title: intentInput.split('\n')[0],
              description: intentInput,
              domain: selectedDomain,
            },
          }),
        });

        const { intent } = await createIntentResponse.json();
        console.log('Intent created:', intent);
        if (onIntentCreated) {
          onIntentCreated(intent);
        }

        // Get enabled connectors and load summaries
        const enabledConnectorTypes = boardData?.connectors
          .filter((c) => c.enabled)
          .map((c) => c.type) || [];

        const connectorSummaries = await loadConnectorSummaries(
          enabledConnectorTypes
        );

        // Search board for relevant context
        const searchResponse = await fetch('/api/board/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: intentInput,
            limit: 5,
          }),
        });

        const { results: contextArtifacts } = await searchResponse.json();
        console.log('Context artifacts found:', contextArtifacts.length);

        // Assess intent via API
        const assessmentResponse = await fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intentDescription: intentInput,
            domain: selectedDomain,
            boardContext: contextArtifacts
              .map((a: any) => `${a.title}: ${a.content}`)
              .join('\n'),
            connectorSummaries,
          }),
        });

        const assessment = await assessmentResponse.json();
        console.log('Assessment result:', assessment);

        // Always generate mood asset when an intent is submitted
        // (simplified for Stage-1: we'll make requiresUI conditional in later stages)
        const moodContext: MoodAssetContext = {
          intentDescription: intentInput,
          domain: selectedDomain,
          guidance: assessment.guidance || `Here's your ${selectedDomain} mood asset`,
          uiType: assessment.uiType || 'explorer',
          boardContext: contextArtifacts
            .map((a: any) => `${a.title}: ${a.content}`)
            .join('\n'),
        };

        console.log('Generating mood asset with context:', moodContext);
        setLastMoodContext(moodContext);

        await generateAndPublishMoodAsset(moodContext);

        // Clear input
        setIntentInput('');
      } catch (error) {
        console.error('Error submitting intent:', error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to process intent'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [intentInput, boardData, onIntentCreated, generateAndPublishMoodAsset, selectedDomain]
  );

  const handleRefine = useCallback(async () => {
    if (!lastMoodContext) {
      setErrorMessage('Generate an asset first, then refine.');
      return;
    }
    if (!refineText.trim()) {
      setErrorMessage('Add a refinement prompt.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const refinement = refineText.trim();
      const refinedContext: MoodAssetContext = {
        ...lastMoodContext,
        guidance: `${lastMoodContext.guidance}\nRefinement request: ${refinement}`,
      };
      setLastMoodContext(refinedContext);
      await generateAndPublishMoodAsset(refinedContext, refinement);
      setRefineText('');
    } catch (error) {
      console.error('Error refining asset:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to refine asset'
      );
    } finally {
      setIsLoading(false);
    }
  }, [generateAndPublishMoodAsset, lastMoodContext, refineText]);

  

  return (
    <div className="relative panel-frosted-glass flex flex-col gap-5 p-6 h-full text-slate-50">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-white/10">
          <div className="flex flex-col items-center gap-3 text-slate-100">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-white/15 border-t-white animate-spin" aria-hidden />
              <div className="absolute w-6 h-6 rounded-full bg-white/70 blur-md" aria-hidden />
            </div>
            <div className="text-sm font-semibold tracking-tight">Assessing intent and generating mood asset…</div>
            <div className="text-xs text-slate-300">Connecting connectors, searching context, and running agents.</div>
          </div>
        </div>
      )}
      <div className="relative flex flex-col gap-3 z-10">
        <h2 className="text-lg font-semibold tracking-tight text-slate-100">Create Moodboard</h2>
        
        {/* Segment Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Target Segment</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(seg => (
              <button
                key={seg}
                type="button"
                onClick={() => setActiveSegment(seg as 1 | 2 | 3 | 4)}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeSegment === seg
                    ? 'bg-cyan-400 text-slate-900 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitIntent} className="relative flex flex-col gap-3 flex-1 z-10">
        {/* Intent input */}
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
            Describe Your Intent
          </label>
          <textarea
            value={intentInput}
            onChange={(e) => setIntentInput(e.target.value)}
            placeholder="What do you want to achieve or visualize?"
            disabled={isLoading}
            className="input-steel flex-1 min-h-[120px] resize-none"
          />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="relative panel-steel-soft p-3 text-sm text-rose-200 border border-rose-400/50 bg-rose-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent rounded-xl pointer-events-none" />
            <span className="relative">{errorMessage}</span>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="relative panel-steel-soft p-3 text-sm text-emerald-200 border border-emerald-400/50 bg-emerald-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-xl pointer-events-none" />
            <span className="relative">{successMessage}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || !intentInput.trim()}
          className="button-steel w-full justify-center py-3"
        >
          {isLoading ? 'Creating...' : 'Create Moodboard'}
        </button>
      </form>

      {lastMoodContext && (
        <div className="relative flex flex-col gap-2 pt-3 border-t border-white/20 z-10">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Refine Component</label>
          <textarea
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            placeholder="Describe changes: e.g., darker colors, add animation"
            disabled={isLoading}
            className="input-steel min-h-[70px] resize-none text-sm"
          />
          <button
            type="button"
            onClick={handleRefine}
            disabled={isLoading || !refineText.trim()}
            className="button-steel w-full justify-center py-2 text-sm"
          >
            {isLoading ? 'Refining...' : '✨ Apply Refinement'}
          </button>
        </div>
      )}
    </div>
  );
}
