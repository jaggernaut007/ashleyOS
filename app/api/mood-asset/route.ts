import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  promptWriterAgent,
  uiUxAgent,
  frontendAgent,
  qaAgent,
} from '@/lib/agents';
import { AgentResponse } from '@/lib/messageBus';
import { MoodAssetContext } from '@/lib/agents';
import { CODING_MODEL, CODING_MODEL_OPTIONS, summarizeUsage } from '@/lib/aiConfig';

export async function POST(request: NextRequest) {
  try {
    const { context, refinement } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Missing context' },
        { status: 400 }
      );
    }

    console.log('[/api/mood-asset] Starting mood asset generation...');

    const moodContext: MoodAssetContext = context;
    const refinementText = typeof refinement === 'string' ? refinement.trim() : '';

    // Create mood-driven generation prompt
    const moodPrompt = `You are a React component generator. Create a mood asset component that reflects the user's life intent.

INTENT: ${moodContext.intentDescription}
GUIDANCE: ${moodContext.guidance}
UI TYPE: ${moodContext.uiType}
${refinementText ? `REFINEMENT REQUEST: ${refinementText}` : ''}

BOARD CONTEXT: ${moodContext.boardContext}

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

Return ONLY the component code, no markdown, no explanations.`;

    let attempts = 0;
    let generatedCode = '';
    let evaluations = [] as AgentResponse[];
    let allApproved = false;
    let promptAcc = moodPrompt;
    const tokenUsageLog: Array<{
      attempt: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      reasoningTokens: number;
      cachedInputTokens: number;
    }> = [];
    let inputTokensTotal = 0;
    let outputTokensTotal = 0;

    async function evaluate(code: string) {
      const [promptEval, uiEval, frontendEval, qaEval] = await Promise.all([
        promptWriterAgent.evaluate(moodContext.intentDescription, code),
        uiUxAgent.evaluate(moodContext.intentDescription, code),
        frontendAgent.evaluate(moodContext.intentDescription, code),
        qaAgent.evaluate(moodContext.intentDescription, code),
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

      const { text, usage } = await generateText({
        model: (openai as any)(CODING_MODEL, CODING_MODEL_OPTIONS),
        system: 'You are a creative mood-driven component designer. Generate beautiful React components.',
        prompt: currentPrompt,
        providerOptions: {
          openai: {
            reasoningSummary: 'concise',
          },
        },
      });

      const usageSummary = summarizeUsage(usage);
      inputTokensTotal += usageSummary.inputTokens;
      outputTokensTotal += usageSummary.outputTokens;
      tokenUsageLog.push({
        attempt: attempts + 1,
        ...usageSummary,
      });

      generatedCode = text.trim();
      await evaluate(generatedCode);

      if (allApproved) break;

      const blockers = evaluations
        .filter(e => !e.approved)
        .map(e => `- ${e.agentName}: ${e.feedback}`)
        .join('\n');

      promptAcc = `${promptAcc}\n\nCritical blockers to fix:\n${blockers}`;
      attempts += 1;
    }

    console.log('[/api/mood-asset] Token usage', {
      intent: moodContext.intentDescription,
      approved: allApproved,
      attempts: attempts + 1,
      totalInputTokens: inputTokensTotal,
      totalOutputTokens: outputTokensTotal,
      totalTokens: inputTokensTotal + outputTokensTotal,
      perAttempt: tokenUsageLog,
    });

    return NextResponse.json({
      code: generatedCode,
      approved: allApproved,
      evaluations,
      mood: 'generated',
    });
  } catch (error) {
    console.error('[/api/mood-asset] Error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
