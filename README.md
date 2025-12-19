# Ashley OS

A Next.js + Tailwind CSS workspace with a glassmorphic UI, an interactive canvas, and an AI chatbot sidebar. Built with TypeScript and the App Router.

## Features

- **Glassmorphic UI**: Clean, frosted-glass aesthetic using Tailwind.
- **Interactive Canvas**: Render and manage components with save/load.
- **Saved Components**: Persist, list, and reuse canvas items.
- **AI Chat**: Chatbot sidebar backed by an agent API route.
- **Orchestration**: Message bus and multi-agent coordination utilities.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI SDKs**: `ai`, `@ai-sdk/openai`

## Scripts

- `dev`: Start the Next.js dev server
- `build`: Create a production build
- `start`: Run the production server
- `lint`: Lint the project

## Quick Start

### Install

```bash
npm install
```

### Develop

```bash
npm run dev
```

Then open http://localhost:3000.

### Build & Run

```bash
npm run build
npm start
```

## Project Structure (key files)

```
app/
  globals.css
  layout.tsx
  page.tsx
  PreloadLibs.tsx
  api/
    agent/
      route.ts
components/
  Canvas.tsx
  CanvasWithSavePanel.tsx
  ChatbotSidebar.tsx
  DynamicCanvasRenderer.tsx
  SavedComponentsPanel.tsx
context/
  CodeContext.tsx
  SavedComponentContext.tsx
lib/
  agents.ts
  messageBus.ts
  multiAgentOrchestrator.ts
  useSavedComponents.ts
types/
  babel-standalone.d.ts
```

## Notable Modules

- **Canvas & Renderer**: `Canvas.tsx`, `DynamicCanvasRenderer.tsx` for drawing and dynamic component rendering; `CanvasWithSavePanel.tsx` pairs the canvas with a save UI.
- **Saved Components**: `SavedComponentsPanel.tsx` and `useSavedComponents.ts` manage persistence and retrieval.
- **Chatbot**: `ChatbotSidebar.tsx` provides the UI; the API lives in `app/api/agent/route.ts`.
- **Orchestrator & Bus**: `multiAgentOrchestrator.ts` and `messageBus.ts` coordinate agent workflows and events.
- **Contexts**: `CodeContext.tsx`, `SavedComponentContext.tsx` share state across the app.

## Development Notes

- Tailwind setup is defined in `tailwind.config.ts` and global styles in `app/globals.css`.
- TypeScript config lives in `tsconfig.json`; Next.js config in `next.config.ts`.
- If you use the VS Code task, a background `dev` task is available.

## License

MIT
