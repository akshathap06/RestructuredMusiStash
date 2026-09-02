import { getBuiltInAgent } from './builtInAgents';
import { messageId } from './types';
import type { AgentContext, AgentSession, AgentTurn, BuiltInAgentId, ChatMessage } from './types';
import * as artistAnalyst from './artistAnalyst';
import * as venueFinder from './venueFinder';
import * as emailGenerator from './emailGenerator';

export * from './types';
export * from './builtInAgents';

const REGISTRY = {
  'artist-analyst': artistAnalyst,
  'venue-finder': venueFinder,
  'email-generator': emailGenerator,
} as const;

export function isBuiltInAgentId(id: string): id is BuiltInAgentId {
  return id in REGISTRY;
}

export function initialSession(agentId: BuiltInAgentId): AgentSession {
  return REGISTRY[agentId].initialSession();
}

export function introMessage(agentId: BuiltInAgentId): ChatMessage {
  const agent = getBuiltInAgent(agentId);
  return {
    id: messageId(),
    role: 'agent',
    text: agent?.intro ?? 'How can I help?',
  };
}

export function runAgentTurn(
  agentId: BuiltInAgentId,
  session: AgentSession,
  userText: string,
  ctx: AgentContext
): Promise<AgentTurn> {
  return REGISTRY[agentId].respond(session, userText, ctx);
}
