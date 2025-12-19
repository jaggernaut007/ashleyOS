'use client';

import React, { useState } from 'react';
import { useCode } from '@/context/CodeContext';
import { useSavedComponentContext } from '@/context/SavedComponentContext';
import DynamicCanvasRenderer from '@/components/DynamicCanvasRenderer';
import SavedComponentsPanel from '@/components/SavedComponentsPanel';
import { useSavedComponents, SavedComponent } from '@/lib/useSavedComponents';

export default function CanvasWithSavePanel() {
  const { code, setCode } = useCode();
  const { saveComponent } = useSavedComponents();
  const { loadComponent } = useSavedComponentContext();
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    if (code.trim()) {
      saveComponent(code);
      alert('Added to your mood board! ✨');
    } else {
      alert('Nothing to save yet. Tell Ashley your mood first!');
    }
  };

  const handleLoadComponent = (component: SavedComponent) => {
    setCode(component.code);
    loadComponent(component.name);
    setShowSaved(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white/40">
      <div className="flex-1 overflow-hidden">
        <DynamicCanvasRenderer />
      </div>

      <div className="border-t border-white/40 bg-white/30 backdrop-blur-sm p-4 flex gap-3 items-center">
        <button
          onClick={handleSave}
          disabled={!code.trim()}
          className="glass-button-primary disabled:opacity-40 disabled:cursor-not-allowed"
          title="Add to your mood board"
        >
          💾 Add to Board
        </button>

        <button
          onClick={() => setShowSaved(!showSaved)}
          className="glass-button-secondary"
          title="View your saved mood creations"
        >
          📋 {showSaved ? 'Hide' : 'Show'} Board
        </button>
      </div>

      {showSaved && (
        <div className="border-t border-white/40 bg-white/20 backdrop-blur-sm p-4 max-h-[200px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">My Mood Board</h3>
          <SavedComponentsPanel onLoadComponent={handleLoadComponent} />
        </div>
      )}
    </div>
  );
}
