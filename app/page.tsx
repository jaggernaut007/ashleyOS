import React from 'react';
import ChatbotSidebar from '@/components/ChatbotSidebar';
import CanvasWithSavePanel from '@/components/CanvasWithSavePanel';
import { CodeProvider } from '@/context/CodeContext';
import { SavedComponentProvider } from '@/context/SavedComponentContext';

export default function Home() {
  return (
    <CodeProvider>
      <SavedComponentProvider>
        <main className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 overflow-hidden">
          <section className="flex-1 h-full p-6 flex flex-col gap-4">
            <div className="flex-1 w-full rounded-3xl glass-panel-lg overflow-hidden shadow-glass-lg border border-white/40">
              <CanvasWithSavePanel />
            </div>
          </section>
          <aside className="h-full flex items-center justify-end pr-8 py-6">
            <ChatbotSidebar />
          </aside>
        </main>
      </SavedComponentProvider>
    </CodeProvider>
  );
}
