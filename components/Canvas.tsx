import React from 'react';
import DynamicCanvasRenderer from './DynamicCanvasRenderer';

interface CanvasProps {
  code?: string;
  theme?: 'day' | 'night';
}

export default function Canvas({ code = '', theme = 'day' }: CanvasProps) {
  const isNight = theme === 'night';
  const containerClass = isNight
    ? 'w-full h-full text-slate-100'
    : 'w-full h-full text-slate-900';
  const emptyTextClass = isNight ? 'text-slate-300' : 'text-slate-400';

  return (
    <div className={containerClass}>
      {code ? (
        <div className="panel-steel-soft w-full h-full overflow-auto overscroll-contain">
          <div className="min-h-full w-full">
            <DynamicCanvasRenderer code={code} />
          </div>
        </div>
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${emptyTextClass}`}>
          <div className="text-6xl">✨</div>
          <p>Submit an intent to see the generated mood asset here</p>
        </div>
      )}
    </div>
  );
}
