/**
 * POST /api/intent/assess - Assess user intent
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

interface AssessIntentRequest {
  intentDescription: string;
  domain: string;
  boardContext: string;
  connectorSummaries: string;
}

function createIntentAssessmentPrompt(
  intentDescription: string,
  boardContext: string,
  connectorSummaries: string,
  domain: string
): string {
  return `You are a ${domain}-focused life reasoning agent. Your role is to assess user intent and determine if an interactive UI would help them better achieve their goal.

INTENT:
${intentDescription}

BOARD CONTEXT (previous decisions, constraints, preferences):
${boardContext || "No prior context"}

CONNECTOR DATA SUMMARIES (calendar, bank, health, documents):
${connectorSummaries || "No connectors enabled"}

TASK:
Assess this intent deeply. Consider:
1. Does this require immediate action, or reflection/planning?
2. Would an interactive UI (e.g., a form, planner, decision matrix) help the user explore options?
3. What constraints or preferences from the board apply here?
4. What should the user do next?

Respond in JSON format ONLY (no markdown, no code blocks):
{
  "reasoning": "Your analysis",
  "requiresUI": true/false,
  "uiType": "form|planner|matrix|explorer|journal" (if requiresUI),
  "guidance": "Actionable advice",
  "nextSteps": ["step1", "step2"],
  "confidence": 0.95
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AssessIntentRequest;

    const prompt = createIntentAssessmentPrompt(
      body.intentDescription,
      body.boardContext,
      body.connectorSummaries,
      body.domain
    );

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a ${body.domain}-focused intent reasoning agent. Return ONLY valid JSON, no markdown or code blocks.`,
      prompt,
    });

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const assessment = JSON.parse(jsonStr);

    return NextResponse.json({
      reasoning: assessment.reasoning || "",
      requiresUI: assessment.requiresUI || false,
      uiType: assessment.uiType,
      guidance: assessment.guidance || "",
      nextSteps: assessment.nextSteps || [],
      confidence: assessment.confidence || 0.7,
    });
  } catch (error) {
    console.error("Error assessing intent:", error);
    return NextResponse.json(
      { error: "Failed to assess intent" },
      { status: 500 }
    );
  }
}
