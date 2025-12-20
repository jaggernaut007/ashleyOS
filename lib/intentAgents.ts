/**
 * Intent Assessment Agents
 * Reason over life domain and decide if UI generation is needed
 * Publish events to message bus for orchestration
 */

import { MessageBus } from "@/lib/messageBus";
import { Artifact } from "@/types/board";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

function logIntentUsage(agentName: string, intentDescription: string, domain: string, usage: any) {
  const promptTokens = usage?.promptTokens ?? 0;
  const completionTokens = usage?.completionTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? promptTokens + completionTokens;

  console.log(`[intentAgents:${agentName}] Token usage`, {
    intent: intentDescription,
    domain,
    promptTokens,
    completionTokens,
    totalTokens,
  });
}
export interface IntentAssessment {
  intentId: string;
  intentDescription: string;
  domain: string;
  reasoning: string;
  requiresUI: boolean;
  uiType?: string;
  guidance: string;
  nextSteps: string[];
  confidence: number;
}

export interface IntentAgent {
  name: string;
  domain: string;
  systemPrompt: string;
  assess: (
    intentDescription: string,
    boardContext: string,
    connectorSummaries: string
  ) => Promise<IntentAssessment>;
}

// Intent assessment prompt factory
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

Respond in JSON format:
{
  "reasoning": "Your analysis",
  "requiresUI": true/false,
  "uiType": "form|planner|matrix|explorer|journal" (if requiresUI),
  "guidance": "Actionable advice",
  "nextSteps": ["step1", "step2"],
  "confidence": 0.95
}`;
}

/**
 * Create intent agents for different life domains
 */
export function createIntentAgents(messageBus: MessageBus): IntentAgent[] {
  return [
    {
      name: "HealthIntentAgent",
      domain: "health",
      systemPrompt: "You are an expert health coach and life coach. Focus on wellbeing, fitness, nutrition, and mental health.",
      assess: async (
        intentDescription,
        boardContext,
        connectorSummaries
      ) => {
        const prompt = createIntentAssessmentPrompt(
          intentDescription,
          boardContext,
          connectorSummaries,
          "health and wellness"
        );

          try {
            const { text, usage } = await generateText({
              model: openai("gpt-4o-mini"),
              system: "You are a health-focused intent reasoning agent. Return ONLY valid JSON, no markdown or code blocks.",
              prompt,
            });

            logIntentUsage("HealthIntentAgent", intentDescription, "health", usage);

            let assessment: IntentAssessment;
            try {
              // Extract JSON from response if wrapped in code blocks
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : text;
              const parsed = JSON.parse(jsonStr);
              
              assessment = {
                intentId: "",
                intentDescription,
                domain: "health",
                reasoning: parsed.reasoning || "",
                requiresUI: parsed.requiresUI || false,
                uiType: parsed.uiType,
                guidance: parsed.guidance || "",
                nextSteps: parsed.nextSteps || [],
                confidence: parsed.confidence || 0.7,
              };
            } catch {
            assessment = {
              intentId: "",
              intentDescription,
              domain: "health",
              reasoning: "Unable to parse assessment",
              requiresUI: false,
              guidance: "Please try again",
              nextSteps: [],
              confidence: 0.3,
            };
          }

          // Publish decision event
          messageBus.publishToTopic("intent:assess", {
            domain: "health",
            assessment,
            requiresUI: assessment.requiresUI,
          });

          return assessment;
        } catch (error) {
          console.error("Health intent agent error:", error);
          return {
            intentId: "",
            intentDescription,
            domain: "health",
            reasoning: "Agent error",
            requiresUI: false,
            guidance: "Try again later",
            nextSteps: [],
            confidence: 0,
          };
        }
      },
    },
    {
      name: "FinanceIntentAgent",
      domain: "finance",
      systemPrompt: "You are a financial advisor. Focus on budgeting, spending, investments, and financial goals.",
      assess: async (
        intentDescription,
        boardContext,
        connectorSummaries
      ) => {
        const prompt = createIntentAssessmentPrompt(
          intentDescription,
          boardContext,
          connectorSummaries,
          "finance and budgeting"
        );

          try {
            const { text, usage } = await generateText({
              model: openai("gpt-4o-mini"),
              system: "You are a finance-focused intent reasoning agent. Return ONLY valid JSON, no markdown or code blocks.",
              prompt,
            });

            logIntentUsage("FinanceIntentAgent", intentDescription, "finance", usage);

            let assessment: IntentAssessment;
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : text;
              const parsed = JSON.parse(jsonStr);
              assessment = {
                intentId: "",
                intentDescription,
                domain: "finance",
                reasoning: parsed.reasoning || "",
                requiresUI: parsed.requiresUI || false,
                uiType: parsed.uiType,
                guidance: parsed.guidance || "",
                nextSteps: parsed.nextSteps || [],
                confidence: parsed.confidence || 0.7,
              };
            } catch {
            assessment = {
              intentId: "",
              intentDescription,
              domain: "finance",
              reasoning: "Unable to parse assessment",
              requiresUI: false,
              guidance: "Please try again",
              nextSteps: [],
              confidence: 0.3,
            };
          }

          messageBus.publishToTopic("intent:assess", {
            domain: "finance",
            assessment,
            requiresUI: assessment.requiresUI,
          });

          return assessment;
        } catch (error) {
          console.error("Finance intent agent error:", error);
          return {
            intentId: "",
            intentDescription,
            domain: "finance",
            reasoning: "Agent error",
            requiresUI: false,
            guidance: "Try again later",
            nextSteps: [],
            confidence: 0,
          };
        }
      },
    },
    {
      name: "GoalsIntentAgent",
      domain: "goals",
      systemPrompt: "You are a goals coach. Help users identify, refine, and achieve their personal and professional goals.",
      assess: async (
        intentDescription,
        boardContext,
        connectorSummaries
      ) => {
        const prompt = createIntentAssessmentPrompt(
          intentDescription,
          boardContext,
          connectorSummaries,
          "goal setting and achievement"
        );

          try {
            const { text, usage } = await generateText({
              model: openai("gpt-4o-mini"),
              system: "You are a goals-focused intent reasoning agent. Return ONLY valid JSON, no markdown or code blocks.",
              prompt,
            });

            logIntentUsage("GoalsIntentAgent", intentDescription, "goals", usage);

            let assessment: IntentAssessment;
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : text;
              const parsed = JSON.parse(jsonStr);
              assessment = {
                intentId: "",
                intentDescription,
                domain: "goals",
                reasoning: parsed.reasoning || "",
                requiresUI: parsed.requiresUI || false,
                uiType: parsed.uiType,
                guidance: parsed.guidance || "",
                nextSteps: parsed.nextSteps || [],
                confidence: parsed.confidence || 0.7,
              };
            } catch {
            assessment = {
              intentId: "",
              intentDescription,
              domain: "goals",
              reasoning: "Unable to parse assessment",
              requiresUI: false,
              guidance: "Please try again",
              nextSteps: [],
              confidence: 0.3,
            };
          }

          messageBus.publishToTopic("intent:assess", {
            domain: "goals",
            assessment,
            requiresUI: assessment.requiresUI,
          });

          return assessment;
        } catch (error) {
          console.error("Goals intent agent error:", error);
          return {
            intentId: "",
            intentDescription,
            domain: "goals",
            reasoning: "Agent error",
            requiresUI: false,
            guidance: "Try again later",
            nextSteps: [],
            confidence: 0,
          };
        }
      },
    },
  ];
}

/**
 * Orchestrate intent assessment
 */
export async function assessIntent(
  intentDescription: string,
  domain: string,
  boardContext: Artifact[],
  connectorSummaries: string,
  messageBus: MessageBus,
  agents: IntentAgent[]
): Promise<IntentAssessment | null> {
  // Find domain-specific agent
  const agent = agents.find((a) => a.domain === domain);
  if (!agent) {
    console.warn(`No agent found for domain: ${domain}`);
    return null;
  }

  // Format board context
  const contextStr = boardContext
    .map((a) => `[${a.type}] ${a.title}: ${a.content}`)
    .join("\n");

  // Run assessment
  const assessment = await agent.assess(
    intentDescription,
    contextStr,
    connectorSummaries
  );

  // If UI needed, publish event for code generation
  if (assessment.requiresUI) {
    messageBus.publishToTopic("intent:ui-needed", {
      intentDescription,
      domain,
      uiType: assessment.uiType,
      guidance: assessment.guidance,
    });
  }

  return assessment;
}
