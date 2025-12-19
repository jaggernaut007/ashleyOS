'use client';

import React, { useState } from 'react';
import { MoodAsset } from '@/types/board';
import { v4 as uuidv4 } from 'uuid';

interface SaveMoodboardProps {
  componentCode: string;
  intentId: string;
  intentDescription: string;
  domain: string;
  onSave?: (moodAsset: MoodAsset) => void;
  disabled?: boolean;
}

export default function SaveMoodboard({
  componentCode,
  intentId,
  intentDescription,
  domain,
  onSave,
  disabled,
}: SaveMoodboardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!componentCode || !componentCode.trim()) {
      setMessage('No component to save');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      // Create mood asset artifact
      const moodAsset: MoodAsset = {
        id: uuidv4(),
        type: 'moodAsset',
        title: `Mood Asset: ${intentDescription.split('\n')[0].substring(0, 50)}`,
        content: componentCode,
        componentCode,
        createdAt: new Date(),
        updatedAt: new Date(),
        generatedAt: new Date(),
        intentId,
        metadata: {
          domain,
          intentDescription,
        },
      };

      // Save to board via API
      const response = await fetch('/api/board/artifact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createArtifact',
          data: {
            type: 'moodAsset',
            title: moodAsset.title,
            content: componentCode,
            intentId,
            metadata: {
              domain,
              intentDescription,
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save mood asset');

      const { artifact } = await response.json();
      if (onSave) {
        onSave(artifact as MoodAsset);
      }

      setMessage('Mood asset saved to board!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error saving mood asset:', error);
      setMessage(
        error instanceof Error ? error.message : 'Failed to save'
      );
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSave}
        disabled={disabled || isSaving || !componentCode?.trim()}
        className="relative button-steel px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save Mood'}
      </button>
      {message && (
        <span
          className={`text-sm font-medium ${
            message.includes('saved')
              ? 'text-emerald-300'
              : 'text-amber-300'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
