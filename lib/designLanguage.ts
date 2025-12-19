/**
 * Design language guidance for generated components
 * Centralizes Tailwind class primitives used across the main page
 * and provides a prompt snippet for coding agents.
 */

export const designClasses = {
  panels: {
    steel: 'panel-steel',
    steelSoft: 'panel-steel-soft',
    frosted: 'panel-frosted-glass',
  },
  inputs: {
    steel: 'input-steel',
  },
  buttons: {
    steel: 'button-steel',
  },
  layout: {
    container: 'w-full h-full',
    rounded: 'rounded-2xl',
    roundedLg: 'rounded-3xl',
    padded: 'p-4',
  },
  text: {
    title: 'text-xl font-semibold tracking-tight',
    subtle: 'text-sm text-slate-300',
  },
};

/**
 * Prompt snippet instructing generators to use the app's design system.
 */
export const designLanguagePrompt = `Use the project's Tailwind design system:
- Panels: .panel-steel, .panel-steel-soft, .panel-frosted-glass for containers
- Buttons: .button-steel for primary interactions
- Inputs/Textareas/Selects: .input-steel for theme-aware inputs
- Theme-aware design: the page sets 'data-theme' with values 'day' or 'night'. Ensure colors and contrast work in both themes. Prefer classes that adapt in [data-theme="day"].
- Layout: fill parent (w-full h-full), use rounded-2xl/rounded-3xl, tasteful blur and gradients, responsive spacing.
- Accessibility: visible focus states, keyboard navigation, ARIA labels where helpful.
Do NOT import external UI libraries. Only use React and Tailwind classes above.`;

/**
 * Helper to embed guidance into prompts with optional extra notes.
 */
export function applyDesignGuidance(extra?: string) {
  return `${designLanguagePrompt}${extra ? `\n${extra}` : ''}`;
}
