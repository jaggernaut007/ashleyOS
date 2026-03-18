import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { MultiAgentOrchestrator } from '@/lib/multiAgentOrchestrator';
import { CODING_MODEL, CODING_MODEL_OPTIONS, summarizeUsage } from '@/lib/aiConfig';

export const runtime = 'edge';

const COMPONENT_GENERATOR_PROMPT = `You are a React component generator. ALWAYS respond with ONLY valid React component code (TypeScript JSX).

Rules:
- Return ONLY the component code, no explanations or markdown
- Always use: export default function ComponentName() { ... }
- Use Tailwind CSS for styling; prefer consistent tokens for spacing, radii, shadows, blur, and typography
- Do NOT include import statements
- Make the component fill 100% width and height: className="w-full h-full"
- The component receives no props
- Accessibility: WCAG AA contrast, clear focus rings on all interactive elements, keyboard navigable controls
- Interaction polish: obvious hover/active states; for accordions/collapsibles include icons/chevrons and smooth but lightweight transitions; respect prefers-reduced-motion
- Return valid, executable React code

Usability Requirements (MANDATORY):
- Do NOT hardcode domain content or data (beyond neutral UI labels like "Upload Data").
- Provide built-in ways for a user to supply data at runtime:
  - A file input to upload CSV or JSON (accepts: .csv, application/json) and parse it client-side.
  - A textarea to paste JSON data.
  - Optional minimal form controls if appropriate (filters, fields) to interact with the data.
- Handle empty/loading/error states clearly; show an instructional empty state when no data is loaded.
- Avoid external network calls and avoid third-party libraries.
- Keep the component immediately usable on its own canvas: after data is provided, render and allow basic interactions (e.g., filter/sort/toggle where relevant).

Example valid response:
export default function Card() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="p-8 bg-white rounded-xl shadow-lg focus-within:ring-2 focus-within:ring-cyan-400 outline-none" tabIndex={-1}>
        <h1 className="text-2xl font-bold text-gray-800">Hello World</h1>
        <p className="text-gray-600 mt-2">This is a sample component.</p>
        <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white font-semibold shadow hover:bg-cyan-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500">
          Action
          <span aria-hidden className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}`;

/**
 * Determine if analytics agent is needed based on user query
 */
function needsAnalyticsAgent(query: string): boolean {
  const analyticsKeywords = [
    'track', 'tracking', 'analytics', 'metrics', 'measure',
    'conversion', 'event', 'data', 'statistics', 'monitor',
    'performance', 'insights', 'behavior', 'engagement'
  ];
  const lowerQuery = query.toLowerCase();
  return analyticsKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Determine if marketing agent is needed based on user query
 */
function needsMarketingAgent(query: string): boolean {
  const marketingKeywords = [
    'cta', 'call to action', 'marketing', 'conversion', 'landing',
    'sale', 'pricing', 'product', 'campaign', 'promotional',
    'advertisement', 'signup', 'subscribe', 'newsletter', 'lead'
  ];
  const lowerQuery = query.toLowerCase();
  return marketingKeywords.some(keyword => lowerQuery.includes(keyword));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = 
      body?.messages || [];
    const currentComponentCode = body?.currentComponentCode || null;
    const mode: 'rich' | 'minimal' = body?.mode === 'rich' ? 'rich' : 'minimal';
    
    // Get the latest user message as the query
    const userQuery = messages.filter((m) => m.role === 'user').pop()?.content || '';

    // Convert message history to AI SDK format with proper typing
    const formattedMessages = messages.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }));

    // Enhance prompt if this is an improvement request on existing component
    let systemPrompt = COMPONENT_GENERATOR_PROMPT;
    if (currentComponentCode) {
      systemPrompt = `${COMPONENT_GENERATOR_PROMPT}

IMPORTANT: You are improving an existing component. The user has provided improvement suggestions.

Current Component Code:
${currentComponentCode}

User's Improvement Request: "${userQuery}"

Your task: Modify the existing component to incorporate the user's suggestions while maintaining all existing functionality. Return the complete updated component code.`;
    }

  // Honor mode: bias styling towards rich polish or minimal simplicity
  if (mode === 'rich') {
    systemPrompt += `

Design Guidance (Rich Mode):
- Elevate aesthetics with consistent Tailwind tokens (spacing, radii, shadows, blur tiers)
- Tasteful glassmorphism: translucent layers, backdrop-blur, subtle gradients
- Modern typography, clear hierarchy, and micro-interactions for hover/focus
- Maintain accessibility (WCAG AA contrast, visible focus states, keyboard navigation)
- Responsive layout; performance-friendly effects (reduce intensity on mobile)`;
  } else {
    systemPrompt += `

Design Guidance (Minimal Mode):
- Prioritize simplicity and clarity; avoid heavy blur/shadow/animations
- Lean typography and spacing; strong accessibility and responsiveness
- Keep interactions subtle and fast`;
  }

    // Step 1: Generate or improve component code using primary generator
    const { text: generatedCode, usage: generatorUsage } = await generateText({
      model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
      system: systemPrompt,
      messages: currentComponentCode 
        ? [{ role: 'user', content: userQuery }] 
        : formattedMessages,
    });

    console.log('[/api/agent] Token usage (generator)', {
      userQuery,
      ...summarizeUsage(generatorUsage),
    });

    // Step 2: Determine which agents to use
    // UI/UX, Frontend, and QA agents are ALWAYS required
    const { promptWriterAgent, uiUxAgent, frontendAgent, qaAgent, analyticsAgent, marketingAgent } = 
      await import('@/lib/agents');
    
    const requiredAgents = [promptWriterAgent, uiUxAgent, frontendAgent, qaAgent];
    const conditionalAgents = [];
    
    // Add analytics agent only if needed
    if (needsAnalyticsAgent(userQuery)) {
      conditionalAgents.push(analyticsAgent);
    }
    
    // Add marketing agent only if needed
    if (needsMarketingAgent(userQuery)) {
      conditionalAgents.push(marketingAgent);
    }

    const activeAgents = [...requiredAgents, ...conditionalAgents];

    // Step 3: Multi-agent review using message bus
    const orchestrator = new MultiAgentOrchestrator(activeAgents);
    const result = await orchestrator.orchestrate(userQuery, generatedCode);

    // Step 4: Return result with agent feedback
    return NextResponse.json({
      reply: result.approved ? result.generatedCode : '',
      approved: result.approved,
      summary: result.summary,
      agentFeedback: result.agentResponses,
      activeAgents: activeAgents.map(a => a.name),
      skippedAgents: [
        ...(needsAnalyticsAgent(userQuery) ? [] : ['Analytics Agent']),
        ...(needsMarketingAgent(userQuery) ? [] : ['Marketing Agent'])
      ].filter(Boolean),
      messageHistory: orchestrator.getMessageHistory(),
    });
  } catch (error: any) {
    console.error('Multi-agent system error:', error);
    return NextResponse.json(
      { 
        error: 'Multi-agent system failed to respond.',
        approved: false,
        summary: 'System error occurred',
      }, 
      { status: 500 }
    );
  }
}
