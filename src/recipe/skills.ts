export const skillIds = [
  'frontend-design', 'vercel-composition-patterns', 'vercel-react-best-practices',
  'writing-guidelines', 'web-design-guidelines',
] as const;

export const skills = {
  'frontend-design': { publisher: 'Anthropic', repository: 'anthropics/skills', usage: 'New screens and visual redesigns' },
  'vercel-composition-patterns': { publisher: 'Vercel Labs', repository: 'vercel-labs/agent-skills', usage: 'Component APIs, boolean props, and compound components' },
  'vercel-react-best-practices': { publisher: 'Vercel Labs', repository: 'vercel-labs/agent-skills', usage: 'React and Next.js performance' },
  'writing-guidelines': { publisher: 'Vercel Labs', repository: 'vercel-labs/agent-skills', usage: 'Interface copy' },
  'web-design-guidelines': { publisher: 'Vercel Labs', repository: 'vercel-labs/agent-skills', usage: 'Explicit UI, accessibility, or UX reviews' },
};

export function skillUrl(id: typeof skillIds[number]) {
  return `https://skills.sh/${skills[id].repository}/${id}`;
}
