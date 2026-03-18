'use client';

import React, { createContext, useContext, useState } from 'react';

export type SegmentId = 1 | 2 | 3 | 4;

interface SegmentCode {
  1: string;
  2: string;
  3: string;
  4: string;
}

interface CodeContextType {
  code: string; // deprecated - for backward compatibility
  setCode: (code: string) => void; // deprecated - for backward compatibility
  segments: SegmentCode;
  setSegmentCode: (segmentId: SegmentId, code: string) => void;
  activeSegment: SegmentId;
  setActiveSegment: (segmentId: SegmentId) => void;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

export function CodeProvider({ children }: { children: React.ReactNode }) {
  const [segments, setSegments] = useState<SegmentCode>({
    1: '',
    2: '',
    3: '',
    4: '',
  });
  const [activeSegment, setActiveSegment] = useState<SegmentId>(1);

  const setSegmentCode = (segmentId: SegmentId, code: string) => {
    setSegments(prev => ({ ...prev, [segmentId]: code }));
  };

  // Backward compatibility
  const setCode = (code: string) => {
    setSegmentCode(activeSegment, code);
  };

  return (
    <CodeContext.Provider value={{ 
      code: segments[activeSegment], // backward compatibility
      setCode,
      segments,
      setSegmentCode,
      activeSegment,
      setActiveSegment
    }}>
      {children}
    </CodeContext.Provider>
  );
}

export function useCode() {
  const context = useContext(CodeContext);
  if (!context) {
    throw new Error('useCode must be used within CodeProvider');
  }
  return context;
}
