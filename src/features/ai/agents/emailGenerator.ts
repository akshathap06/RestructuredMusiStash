import {
  agenticManagerService,
  type EmailData,
} from '../services/agenticManagerService';
import { messageId } from './types';
import type { AgentContext, AgentSession, AgentTurn, ChatChip } from './types';

const SKIP_WORDS = new Set(['skip', 'none', 'no', 'n/a', 'nothing']);
const NEW_PITCH = '__new_pitch';

function templateChips(): ChatChip[] {
  return agenticManagerService
    .getEmailTemplates()
    .map((t) => ({ label: t.name, value: t.id }));
}

function resolveTemplateId(input: string): string | null {
  const templates = agenticManagerService.getEmailTemplates();
  const lower = input.trim().toLowerCase();
  const exact = templates.find((t) => t.id === lower || t.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = templates.find(
    (t) => t.name.toLowerCase().includes(lower) || lower.includes(t.id.replace(/-/g, ' '))
  );
  return partial ? partial.id : null;
}

export function initialSession(): AgentSession {
  return { step: 'recipient', scratch: {} };
}

function buildDraft(scratch: Record<string, unknown>, user: any) {
  const templateId = String(scratch.templateId || 'venue-booking');
  const recipient = String(scratch.recipient || '');
  const proposedDate = String(scratch.date || '');
  const customMessage = String(scratch.notes || '');

  const emailData: EmailData = {
    recipientName: recipient,
    recipientEmail: '',
    venueName: recipient,
    venueLocation: '',
    proposedDate,
    customMessage,
  };

  const template = agenticManagerService
    .getEmailTemplates()
    .find((t) => t.id === templateId);
  const body = agenticManagerService.generateEmail(templateId, emailData, user);
  const subject = (template?.subject || 'Booking inquiry')
    .replace(/\[Venue Name\]/g, recipient || '[Venue Name]')
    .replace(/\[Artist Name\]/g, user?.name || '[Artist Name]');

  return { subject, body };
}

export async function respond(
  session: AgentSession,
  userText: string,
  ctx: AgentContext
): Promise<AgentTurn> {
  const text = userText.trim();
  const scratch = { ...session.scratch };

  switch (session.step) {
    case 'recipient': {
      if (!text) {
        return {
          session,
          messages: [
            { id: messageId(), role: 'agent', text: 'Who should this email be addressed to?' },
          ],
        };
      }
      scratch.recipient = text;
      return {
        session: { step: 'template', scratch },
        messages: [
          {
            id: messageId(),
            role: 'agent',
            text: `Got it — pitching ${text}. What kind of email is this?`,
            chips: templateChips(),
          },
        ],
      };
    }

    case 'template': {
      const templateId = resolveTemplateId(text);
      if (!templateId) {
        return {
          session,
          messages: [
            {
              id: messageId(),
              role: 'agent',
              text: 'Pick one of these so I use the right structure:',
              chips: templateChips(),
            },
          ],
        };
      }
      scratch.templateId = templateId;
      return {
        session: { step: 'date', scratch },
        messages: [
          {
            id: messageId(),
            role: 'agent',
            text: 'Any target date or timeframe? Send one, or tap Flexible.',
            chips: [{ label: 'Flexible', value: 'flexible' }],
          },
        ],
      };
    }

    case 'date': {
      scratch.date =
        !text || text.toLowerCase() === 'flexible' || SKIP_WORDS.has(text.toLowerCase())
          ? 'flexible on dates'
          : text;
      return {
        session: { step: 'notes', scratch },
        messages: [
          {
            id: messageId(),
            role: 'agent',
            text: 'Anything specific you want me to include? (a recent release, a draw number, a referral) — or tap Skip.',
            chips: [{ label: 'Skip', value: 'skip' }],
          },
        ],
      };
    }

    case 'notes': {
      scratch.notes = SKIP_WORDS.has(text.toLowerCase()) || !text ? '' : text;
      const draft = buildDraft(scratch, ctx.user);
      return {
        session: { step: 'done', scratch },
        messages: [
          { id: messageId(), role: 'agent', text: "Here's your draft:" },
          { id: messageId(), role: 'agent', card: { type: 'email-draft', data: draft } },
          {
            id: messageId(),
            role: 'agent',
            text: 'Copy it out and tweak names/links before sending.',
            chips: [{ label: 'Start a new pitch', value: NEW_PITCH }],
          },
        ],
      };
    }

    case 'done':
    default: {
      if (text.toLowerCase() === NEW_PITCH || SKIP_WORDS.has(text.toLowerCase())) {
        return {
          session: initialSession(),
          messages: [
            { id: messageId(), role: 'agent', text: 'Who are you reaching out to this time?' },
          ],
        };
      }
      // Treat the message as the next recipient and continue the flow.
      return respond(initialSession(), text, ctx);
    }
  }
}
