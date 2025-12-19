"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Artifact } from "@/types/board";

interface SavedMoodboardListProps {
  onLoad: (artifact: Artifact) => void;
}

export default function SavedMoodboardList({ onLoad }: SavedMoodboardListProps) {
  const [moodAssets, setMoodAssets] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/board");
      if (!res.ok) throw new Error("Failed to fetch board");
      const board = await res.json();
      const assets = (board?.artifacts || []).filter((a: Artifact) => a.type === "moodAsset");
      setMoodAssets(assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mood boards");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return (
    <div className="relative w-full panel-steel-soft p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Saved Mood Boards</p>
          <p className="text-xs text-slate-400">Load a previously saved asset</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="button-steel px-3 py-1.5 text-xs"
          >
            {isCollapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            onClick={loadAssets}
            disabled={isLoading}
            className="button-steel px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {error && (
            <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/20 backdrop-blur-sm px-3 py-2 text-amber-200 text-xs">
              {error}
            </div>
          )}

          {moodAssets.length === 0 && !isLoading ? (
            <p className="text-sm text-slate-400">No saved mood boards yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {moodAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="relative flex items-center justify-between rounded-lg border border-slate-700/40 bg-gradient-to-r from-slate-800/60 to-slate-800/50 px-3 py-2.5 backdrop-blur-sm hover:border-slate-600/50 transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg pointer-events-none" />
                  <div className="relative flex flex-col">
                    <span className="text-sm font-medium text-slate-100">{asset.title || "Untitled"}</span>
                    <span className="text-xs text-slate-400">
                      {asset.updatedAt ? new Date(asset.updatedAt).toLocaleString() : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoad(asset)}
                    className="relative button-steel px-3 py-1.5 text-xs"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
