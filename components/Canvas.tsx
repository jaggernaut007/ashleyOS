import React from 'react';
import DynamicCanvasRenderer from './DynamicCanvasRenderer';
import { useCode, SegmentId } from '@/context/CodeContext';

interface CanvasProps {
  code?: string;
  theme?: 'day' | 'night';
}

function EmptySegment({ theme, segmentId, isActive }: { theme: 'day' | 'night'; segmentId: SegmentId; isActive: boolean }) {
  const isNight = theme === 'night';
  const emptyTextClass = isNight ? 'text-slate-400' : 'text-slate-500';
  const bgClass = isNight ? 'bg-slate-900/40' : 'bg-slate-100/40';
  const borderClass = isActive 
    ? (isNight ? 'border-cyan-400/60' : 'border-orange-500/60')
    : (isNight ? 'border-violet-500/20' : 'border-orange-400/20');
  
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-1 rounded-xl ${bgClass} ${emptyTextClass} transition-colors duration-300`}>
      <div className="text-2xl opacity-50">✨</div>
      <p className="text-xs">Segment {segmentId}</p>
    </div>
  );
}

export default function Canvas({ theme = 'day' }: CanvasProps) {
  const { segments, activeSegment, setActiveSegment } = useCode();
  const isNight = theme === 'night';

  const containerClass = isNight
    ? 'w-full h-full text-slate-100'
    : 'w-full h-full text-slate-900';

  return (
    <div className={`${containerClass} p-3`}>
      <div className="grid grid-cols-2 grid-rows-2 gap-3 w-full h-full">
        {([1, 2, 3, 4] as SegmentId[]).map(segmentId => {
          const code = segments[segmentId];
          const isActive = activeSegment === segmentId;
          const hasCode = code.trim();
          
          return (
            <div 
              key={segmentId}
              onClick={() => setActiveSegment(segmentId)}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                isActive
                  ? (isNight ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.3)]')
                  : (isNight ? 'border-violet-500/20 hover:border-violet-400/40' : 'border-orange-400/20 hover:border-orange-400/40')
              }`}
            >
              {hasCode ? (
                <div className="w-full h-full overflow-auto overscroll-contain">
                  <DynamicCanvasRenderer code={code} segmentId={segmentId} />
                </div>
              ) : (
                <EmptySegment theme={theme} segmentId={segmentId} isActive={isActive} />
              )}
              <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm transition-opacity duration-300 ${
                isActive 
                  ? (isNight ? 'bg-cyan-400/20 text-cyan-300' : 'bg-orange-500/20 text-orange-600')
                  : (isNight ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-200/60 text-slate-600')
              }`}>
                {segmentId}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
