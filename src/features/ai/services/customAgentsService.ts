import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@ms/ai_custom_agents';

export type CustomAgent = {
  id: string;
  name: string;
  /** what the agent is for — shown as its intro message */
  description: string;
  icon: string; // Ionicons name
  color: string; // hex, avatar background
  createdAt: string;
};

/** Icons offered in the create-agent form. */
export const AGENT_ICON_CHOICES = [
  'sparkles',
  'musical-notes',
  'megaphone',
  'trending-up',
  'people',
  'calendar',
  'cash',
  'newspaper',
  'headset',
  'bulb',
] as const;

/** Avatar background colours offered in the create-agent form. */
export const AGENT_COLOR_CHOICES = [
  '#8B5CF6', // violet
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#64748B', // slate
] as const;

export const DEFAULT_AGENT_COLOR = AGENT_COLOR_CHOICES[0];

type AgentInput = { name: string; description: string; icon: string; color: string };

function normalize(agent: any): CustomAgent {
  return {
    id: String(agent.id),
    name: String(agent.name ?? ''),
    description: String(agent.description ?? ''),
    icon: String(agent.icon ?? 'sparkles'),
    color: typeof agent.color === 'string' ? agent.color : DEFAULT_AGENT_COLOR,
    createdAt: String(agent.createdAt ?? new Date().toISOString()),
  };
}

async function readAll(): Promise<CustomAgent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

async function writeAll(agents: CustomAgent[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(agents));
}

export const customAgentsService = {
  list: readAll,

  async create(input: AgentInput): Promise<CustomAgent> {
    const agents = await readAll();
    const agent: CustomAgent = {
      id: `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim(),
      description: input.description.trim(),
      icon: input.icon,
      color: input.color,
      createdAt: new Date().toISOString(),
    };
    await writeAll([agent, ...agents]);
    return agent;
  },

  async update(id: string, input: AgentInput): Promise<void> {
    const agents = await readAll();
    await writeAll(
      agents.map((a) =>
        a.id === id
          ? {
              ...a,
              name: input.name.trim(),
              description: input.description.trim(),
              icon: input.icon,
              color: input.color,
            }
          : a
      )
    );
  },

  async remove(id: string): Promise<void> {
    const agents = await readAll();
    await writeAll(agents.filter((a) => a.id !== id));
  },

  async get(id: string): Promise<CustomAgent | undefined> {
    return (await readAll()).find((a) => a.id === id);
  },
};
