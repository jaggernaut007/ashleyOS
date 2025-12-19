/**
 * Multi-Agent System with Specialized Agents
 * Each agent has specific expertise and evaluation criteria
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AgentResponse } from './messageBus';

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
- Visual system: Tailwind tokens for spacing, radii, shadows, blur tiers; typography scale; light/dark readiness
- Performance hints: avoid heavy blur/shadow on mobile, keep motion lightweight
 - Usability: no hardcoded domain data; provide user data input paths (upload CSV/JSON, paste JSON, and/or minimal form controls) so the component is usable end-to-end; include clear empty/loading/error handling; avoid external API calls and extra libraries.

Respond ONLY in this JSON:
{
  "approved": true,
  "feedback": "<the crafted prompt text>",
  "suggestions": []
}`,

  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: promptWriterAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"
Generated (if any):
${generatedCode || 'None'}

Craft the structured prompt as requested.`,
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
  systemPrompt: `You are a UI/UX expert evaluating React components for design quality and user experience.

Evaluation Criteria (Rich mode emphasis):
- Polished visuals using consistent Tailwind tokens (spacing, radii, shadows, blur tiers)
- Glassmorphism done tastefully (translucent layers, backdrop-blur, subtle gradients)
- Modern typography and clear hierarchy; readable at all sizes
- Accessible color contrast (WCAG AA), visible focus states, keyboard navigation
- Responsive layout with graceful scaling, logical stacking order
- Tasteful micro-interactions (hover/focus/press) respecting prefers-reduced-motion
- Performance-friendly effects (avoid excessive blur/shadow on mobile)
 - Usability without backend: user can provide data (upload CSV/JSON or paste JSON) and interact; clear empty/loading/error states; no hardcoded domain content that prevents reuse.

Approval Policy:
- Reject only on CRITICAL failures:
  1. Complete contrast failure (unreadable text)
  2. Broken, non-responsive layout
  3. Missing focus states on interactive elements (accessibility blocker)
  4. No way to provide data when data is required (missing upload/paste/manual input) or hardcoded domain content blocking reuse
- Otherwise approve. Provide suggestions for polish and improvements, but don't block on them.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: uiUxAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
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
  systemPrompt: `You are a senior frontend engineer evaluating React components for code quality and performance.

Critical Blockers (Rejection-worthy):
- Runtime errors or component crashes
- Infinite loops or memory leaks
- Broken React logic that prevents rendering
 - Hardcoded demo/domain data instead of user-provided data paths
 - No data input path (no upload/paste/manual entry) when the UI implies data is needed

Approval Policy:
- Reject only on critical failures (runtime errors, crashes, infinite loops).
- Otherwise approve. Provide suggestions for best practices and performance but don't block on them.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: frontendAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
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
  systemPrompt: `You are an analytics expert evaluating React components for tracking and data collection capabilities.

Critical Blockers (Rejection-worthy):
- Component is completely blank or non-functional
- No user interactions or trackable events possible

Approval Policy:
- Reject only if component is fundamentally broken or has no trackable interactions.
- Otherwise approve. Provide suggestions for tracking improvements and event structuring.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: analyticsAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
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
  systemPrompt: `You are a marketing expert evaluating React components for conversion optimization and messaging effectiveness.

Critical Blockers (Rejection-worthy):
- Component is completely blank or has no discernible content
- Messaging actively harms trust or prevents conversion (e.g., confusing, misleading)

Approval Policy:
- Reject only if messaging is severely broken or component is non-functional.
- Otherwise approve. Provide suggestions for messaging optimization and conversion improvements.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: marketingAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
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
  systemPrompt: `You are a QA engineer evaluating React components for quality assurance, accessibility, and performance.

Critical Blockers (Rejection-worthy):
- Content is completely unreadable (text too small, zero contrast, entirely cut-off)
- Critical interactive elements are broken or inaccessible
- Layout is severely broken (major overlaps, cut-off sections preventing use)
- Component crashes or hangs on interaction
 - Users cannot load or provide data (no upload/paste/manual input) when the component requires data to function

Best Practices (for suggestions, not rejection):
- Readability: Base font size ≥ 16px; line-height and spacing support scannability
- Contrast: WCAG AA for text and key UI elements in light/dark contexts
- Accessibility: Keyboard navigation, logical focus order, visible focus rings, ARIA where applicable
- Motion: Respect prefers-reduced-motion; avoid heavy animations for core interactions
- Layout robustness across viewport sizes
- Performance: Optimize heavy blur/shadow; minimize DOM weight and transitions

Approval Policy:
- Approve unless there is a critical blocker that prevents basic use or comprehension.
- Provide suggestions for accessibility and performance improvements but approve usable components.

Respond in JSON format:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
  
  evaluate: async (userQuery: string, generatedCode: string): Promise<AgentResponse> => {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: qaAgent.systemPrompt,
      prompt: `User Request: "${userQuery}"\n\nGenerated Component:\n${generatedCode}\n\nEvaluate this component for QA standards and respond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{\n  "approved": true,\n  "feedback": "your feedback",\n  "suggestions": ["suggestion 1"]\n}`,
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
