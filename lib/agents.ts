/**
 * Multi-Agent System with Specialized Agents
 * Each agent has specific expertise and evaluation criteria
 * Extended to support mood asset generation for intent-scoped boards
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AgentResponse } from './messageBus';
import { MessageBus } from './messageBus';
import { designLanguagePrompt, applyDesignGuidance } from './designLanguage';
import { CODING_MODEL, CODING_MODEL_OPTIONS, summarizeUsage } from './aiConfig';

/**
 * Extract JSON from text that might contain markdown code blocks
 */
function extractJSON(text: string): any {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  
  // Try to extract JSON from ```json or ``` code blocks
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }
  
  // Parse the JSON
  return JSON.parse(cleaned);
}

export interface Agent {
  name: string;
  role: string;
  systemPrompt: string;
  evaluate: (userQuery: string, generatedCode: string) => Promise<AgentResponse>;
}

/**
 * Prompt Writer Agent - Crafts a detailed, structured prompt for the requested component
 */
export const promptWriterAgent: Agent = {
  name: 'Prompt Writer Agent',
  role: 'Prompt Engineering',
  systemPrompt: `You are a prompt engineer. Given the user's request and (if present) generated code, write a concise, structured prompt that would guide a frontend model to build the component.

The prompt must:
- Capture purpose, audience, and key content/sections
- Specify layout structure, responsiveness, and states (empty/loading/error if relevant)
- Call out required data fields / labels / units / time ranges when hinted
- Include accessibility: WCAG AA contrast, focus states, keyboard navigation, aria labels where needed
- Describe interaction patterns: hover/active/focus, collapsible affordances (chevrons, icon rotation), transitions respecting prefers-reduced-motion
- Visual system: Tailwind tokens for spacing, radii, shadows, blur tiers; typography scale; light/dark readiness. Prefer the project's classes: ${designLanguagePrompt}
- Performance hints: avoid heavy blur/shadow on mobile, keep motion lightweight
 - Usability: no hardcoded domain data; provide user data input paths (upload CSV/JSON, paste JSON, and/or minimal form controls) so the component is usable end-to-end; include clear empty/loading/error handling; avoid external API calls and extra libraries.

Respond ONLY in this JSON:
{
  "approved": true,
  "feedback": "<the crafted prompt text>",
  "suggestions": []
}`,

  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text, usage } = await generateText({
      model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
      system: promptWriterAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"
Generated (if any):
${generatedCode || 'None'}

Craft the structured prompt as requested.`,
    });

    console.log('[agents:PromptWriter] Token usage', {
      userQuery,
      ...summarizeUsage(usage),
    });

    try {
      const parsed = extractJSON(text);
      return {
        agentName: promptWriterAgent.name,
        approved: parsed.approved ?? true,
        feedback: parsed.feedback ?? 'Prompt generated',
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      console.error(`❌ ${promptWriterAgent.name} JSON parse error:`, error);
      console.error('Raw response:', text);
      return {
        agentName: promptWriterAgent.name,
        approved: true,
        feedback: 'Prompt generated (fallback). Ensure JSON validity next time.',
        suggestions: [],
      };
    }
  },
};

/**
 * UI/UX Agent - Evaluates design, accessibility, and user experience
 */
export const uiUxAgent: Agent = {
  name: 'UI/UX Agent',
  role: 'Design & User Experience',
  systemPrompt: `You are a UI/UX expert evaluating React components for design quality and user experience. Be helpful and lenient.

Evaluation Criteria (Rich mode emphasis):
- Polished visuals using consistent Tailwind tokens (spacing, radii, shadows, blur tiers)
- Glassmorphism done tastefully (translucent layers, backdrop-blur, subtle gradients)
- Modern typography and clear hierarchy; readable at all sizes
- Accessible color contrast (WCAG AA), visible focus states, keyboard navigation
- Responsive layout with graceful scaling, logical stacking order
- Tasteful micro-interactions (hover/focus/press) respecting prefers-reduced-motion
- Performance-friendly effects (avoid excessive blur/shadow on mobile)
  - Usability without backend: user can provide data (upload CSV/JSON or paste JSON) and interact; clear empty/loading/error states; no hardcoded domain content that prevents reuse.
  - Design system usage: Prefer the project's classes and theme awareness: ${designLanguagePrompt}

Approval Policy (lenient):
- Approve unless there is a critical blocker that prevents basic comprehension or use.
- Treat contrast tweaks, responsiveness polish, and focus styling as suggestions; do not reject for these.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text, usage } = await generateText({
      model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
      system: uiUxAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
    });

    console.log('[agents:UIUX] Token usage', {
      userQuery,
      ...summarizeUsage(usage),
    });

    try {
      const parsed = extractJSON(text);
      return {
        agentName: uiUxAgent.name,
        approved: parsed.approved ?? false,
        feedback: parsed.feedback ?? 'Unable to evaluate',
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      console.error(`❌ ${uiUxAgent.name} JSON parse error:`, error);
      console.error('Raw response:', text);
      return {
        agentName: uiUxAgent.name,
        approved: false,
        feedback: `Failed to parse response: ${text.substring(0, 100)}...`,
        suggestions: ['Ensure response is valid JSON'],
      };
    }
  },
};

/**
 * Frontend Agent - Evaluates code quality, performance, and React best practices
 */
export const frontendAgent: Agent = {
  name: 'Frontend Agent',
  role: 'Code Quality & Performance',
  systemPrompt: `You are a senior frontend engineer evaluating React components for code quality and performance. Be helpful and non-blocking.

Critical Blockers (Reject only for these):
- Runtime errors or component crashes
- Infinite loops or memory leaks
- Rendering completely fails

Approval Policy (lenient):
- Approve unless a critical blocker above is present.
- Treat hardcoded data and missing input paths as suggestions to improve reuse; do not reject solely for these.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text, usage } = await generateText({
      model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
      system: frontendAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
    });

    console.log('[agents:Frontend] Token usage', {
      userQuery,
      ...summarizeUsage(usage),
    });

    try {
      const parsed = extractJSON(text);
      return {
        agentName: frontendAgent.name,
        approved: parsed.approved ?? false,
        feedback: parsed.feedback ?? 'Unable to evaluate',
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      console.error(`❌ ${frontendAgent.name} JSON parse error:`, error);
      console.error('Raw response:', text);
      return {
        agentName: frontendAgent.name,
        approved: false,
        feedback: `Failed to parse response: ${text.substring(0, 100)}...`,
        suggestions: ['Ensure response is valid JSON'],
      };
    }
  },
};

/**
 * Analytics Agent - Evaluates trackability and data collection potential
 */
export const analyticsAgent: Agent = {
  name: 'Analytics Agent',
  role: 'Tracking & Metrics',
  systemPrompt: `You are an analytics expert evaluating React components for tracking and data collection capabilities. Be pragmatic and non-blocking.

Critical Blockers (Reject only for these):
- Component is completely blank or non-functional

Approval Policy (lenient):
- Approve unless fundamentally broken.
- Provide suggestions for adding events; do not reject for missing optional tracking.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text, usage } = await generateText({
      model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
      system: analyticsAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
    });

    console.log('[agents:Analytics] Token usage', {
      userQuery,
      ...summarizeUsage(usage),
    });

    try {
      const parsed = extractJSON(text);
      return {
        agentName: analyticsAgent.name,
        approved: parsed.approved ?? false,
        feedback: parsed.feedback ?? 'Unable to evaluate',
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      console.error(`❌ ${analyticsAgent.name} JSON parse error:`, error);
      console.error('Raw response:', text);
      return {
        agentName: analyticsAgent.name,
        approved: false,
        feedback: `Failed to parse response: ${text.substring(0, 100)}...`,
        suggestions: ['Ensure response is valid JSON'],
      };
    }
  },
};

/**
 * Marketing Agent - Evaluates conversion potential and messaging effectiveness
 */
export const marketingAgent: Agent = {
  name: 'Marketing Agent',
  role: 'Conversion & Messaging',
  systemPrompt: `You are a marketing expert evaluating React components for conversion optimization and messaging effectiveness. Be constructive and lenient.

Critical Blockers (Rejection-worthy):
- Component is completely blank or has no discernible content
- Messaging actively harms trust or prevents conversion (e.g., confusing, misleading)

Approval Policy (lenient):
- Approve unless messaging is severely broken or the component is non-functional.
- Prefer suggestions over rejection for copy improvements.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text, usage } = await generateText({
      model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
      system: marketingAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
    });

    console.log('[agents:Marketing] Token usage', {
      userQuery,
      ...summarizeUsage(usage),
    });

    try {
      const parsed = extractJSON(text);
      return {
        agentName: marketingAgent.name,
        approved: parsed.approved ?? false,
        feedback: parsed.feedback ?? 'Unable to evaluate',
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      console.error(`❌ ${marketingAgent.name} JSON parse error:`, error);
      console.error('Raw response:', text);
      return {
        agentName: marketingAgent.name,
        approved: false,
        feedback: `Failed to parse response: ${text.substring(0, 100)}...`,
        suggestions: ['Ensure response is valid JSON'],
      };
    }
  },
};

/**
 * QA Agent - Verifies text visibility, functionality, and presentability
 */
export const qaAgent: Agent = {
  name: 'QA Agent',
  role: 'Quality Assurance & Testing',
  systemPrompt: `You are a QA engineer evaluating React components for basic usability and presentability. Prioritize being helpful and non-blocking.

Critical Blockers (reject only for these):
- Component fails to render or crashes on basic interaction
- Component is completely blank or text is entirely unreadable (zero visibility)
- Interaction is fundamentally impossible when it is core to the component's purpose (e.g., submit button does nothing at all)

Best Practices (advisory suggestions, not rejection):
- Readability and spacing; base font sizes around 16px
- Contrast targets (WCAG AA) in both themes when feasible
- Keyboard navigation and visible focus states
- Respect prefers-reduced-motion; keep animations lightweight
- Responsive layout across common viewport sizes
- Performance: avoid excessive blur/shadows, keep DOM reasonable

Approval Policy (be lenient):
- Approve unless a critical blocker above is present.
- Treat most issues as suggestions; do not reject for polish, minor contrast, or responsiveness tweaks.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text, usage } = await generateText({
      model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
      system: qaAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component for QA standards and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
    });

    console.log('[agents:QA] Token usage', {
      userQuery,
      ...summarizeUsage(usage),
    });

    try {
      const parsed = extractJSON(text);
      return {
        agentName: qaAgent.name,
        approved: parsed.approved ?? false,
        feedback: parsed.feedback ?? 'Unable to evaluate',
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      console.error(`❌ ${qaAgent.name} JSON parse error:`, error);
      console.error('Raw response:', text);
      return {
        agentName: qaAgent.name,
        approved: false,
        feedback: `Failed to parse response: ${text.substring(0, 100)}...`,
        suggestions: ['Ensure response is valid JSON'],
      };
    }
  },
};

export const allAgents: Agent[] = [
  promptWriterAgent,
  uiUxAgent,
  frontendAgent,
  qaAgent,
  analyticsAgent,
  marketingAgent,
];

/**
 * Mood Asset Generation - Rework agents to generate mood-driven components
 * Called when intent agents determine UI is needed
 */

export interface MoodAssetContext {
  intentDescription: string;
  domain: string;
  guidance: string;
  uiType: string;
  boardContext: string;
}

/**
 * Generate mood asset component based on intent
 * Routes through code-review agents to ensure quality
 */
export async function generateMoodAsset(
  context: MoodAssetContext,
  messageBus: MessageBus
): Promise<{ code: string; approved: boolean } | null> {
  console.log('[generateMoodAsset] Starting mood asset generation...');
  // Create mood-driven generation prompt
  const moodPrompt = `You are a React component generator. Create a mood asset component that reflects the user's life intent.

INTENT: ${context.intentDescription}
DOMAIN: ${context.domain}
GUIDANCE: ${context.guidance}
UI TYPE: ${context.uiType}

BOARD CONTEXT: ${context.boardContext}

Generate a React component as a "mood asset" that:
1. Visually represents the intent's essence and emotion
2. Uses Tailwind CSS for styling with smooth, polished animations
3. Combines data visualization, emojis, and typography to convey the mood
4. Is self-contained and fills 100% of its container (w-full h-full)
5. Does NOT require external API calls
6. Supports user input if applicable (e.g., journaling, quick notes)

Requirements:
- Export default a functional React component
- Use only React built-ins and Tailwind
- Include interactive elements that reflect the intent
- Use meaningful colors and spacing to evoke emotion
- Make it memorable and motivating

 Design Language (must follow):
 ${applyDesignGuidance('Use .panel-steel/.panel-steel-soft/.panel-frosted-glass for containers, .button-steel for actions, .input-steel for inputs, and ensure theme awareness via [data-theme="day"|"night"].')}

Return ONLY the component code, no markdown, no explanations.`;

  try {
    let promptAcc = moodPrompt;
    let attempts = 0;
    let generatedCode = '';
    let evaluations: AgentResponse[] = [];
    let allApproved = false;

    // helper to evaluate code with agents
    async function evaluate(code: string) {
      const [promptEval, uiEval, frontendEval, qaEval] = await Promise.all([
        promptWriterAgent.evaluate(context.intentDescription, code),
        uiUxAgent.evaluate(context.intentDescription, code),
        frontendAgent.evaluate(context.intentDescription, code),
        qaAgent.evaluate(context.intentDescription, code),
      ]);
      evaluations = [promptEval, uiEval, frontendEval, qaEval];
      allApproved = promptEval.approved && uiEval.approved && frontendEval.approved && qaEval.approved;
    }

    while (attempts < 5) {
      const isRevision = attempts > 0;
      const revisionNotes = isRevision
        ? `\n\nREVISION ${attempts}: Fix ONLY critical blockers causing rejection. Keep design language, layout, and interactions intact. Do not change visuals beyond what is necessary to resolve blockers.`
        : '';

      const currentPrompt = isRevision && generatedCode
        ? `${promptAcc}\n\nCurrent Component Code:\n${generatedCode}\n${revisionNotes}\nReturn ONLY the revised component code.`
        : promptAcc;

      const { text } = await generateText({
        model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
        system: 'You are a creative mood-driven component designer. Generate beautiful React components.',
        prompt: currentPrompt,
        providerOptions: {
          openai: {
            reasoningSummary: 'concise',
          },
        },
      });

      generatedCode = text.trim();
      await evaluate(generatedCode);

      if (allApproved) break;

      // Build targeted fix hints from non-approved agents
      const blockers = evaluations
        .filter(e => !e.approved)
        .map(e => `- ${e.agentName}: ${e.feedback}`)
        .join('\n');

      // Append blockers into next prompt cycle
      promptAcc = `${promptAcc}\n\nCritical blockers to fix:\n${blockers}`;
      attempts += 1;
    }

    const eventType = allApproved ? 'codegen:complete' : 'codegen:error';
    const payload = allApproved
      ? { code: generatedCode, approved: true, evaluations, mood: 'generated' }
      : { error: 'Code review failed after retries', evaluations, mood: 'generated' };

    messageBus.publishToTopic(eventType, payload as any);

    if (allApproved) {
      return { code: generatedCode, approved: true };
    }
    return { code: generatedCode, approved: false };
  } catch (error) {
    console.error('Error generating mood asset:', error);
    messageBus.publishToTopic('codegen:error', {
      error: String(error),
      intent: context.intentDescription,
    });
    return null;
  }
}
