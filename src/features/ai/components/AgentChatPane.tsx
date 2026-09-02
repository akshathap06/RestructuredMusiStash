import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import type { Venue } from '../services/agenticManagerService';
import AgentAvatar, { AgentAvatarPlain } from './AgentAvatar';
import {
  getBuiltInAgent,
  initialSession,
  introMessage,
  isBuiltInAgentId,
  runAgentTurn,
} from '../agents';
import type {
  AgentSession,
  ArtistAnalysisResult,
  ChatChip,
  ChatMessage,
} from '../agents';
import { messageId } from '../agents/types';

const C = {
  bg: '#0A0A0C',
  surface: '#141418',
  surfaceAlt: '#1C1C22',
  border: 'rgba(255,255,255,0.10)',
  text: '#F5F5F7',
  textDim: '#9CA3AF',
  accent: '#8B5CF6',
  userBubble: '#2563EB',
};

const PANE_HEADER_H = 56;

function formatCompact(n: number): string {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

type Props = {
  agentId: string;
  /** for custom agents */
  agentName?: string;
  agentIcon?: string;
  agentColor?: string;
  agentDescription?: string;
  topInset: number;
  bottomInset: number;
};

export default function AgentChatPane({
  agentId,
  agentName,
  agentIcon,
  agentColor,
  agentDescription,
  topInset,
  bottomInset,
}: Props) {
  const { user } = useAuth();

  const builtIn = isBuiltInAgentId(agentId) ? getBuiltInAgent(agentId) : undefined;
  const isCustom = !builtIn;

  const name = builtIn?.name ?? agentName ?? 'Agent';
  const icon = builtIn?.icon ?? agentIcon ?? 'sparkles';
  const tagline = builtIn?.tagline ?? 'Custom agent';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<AgentSession>(() =>
    isBuiltInAgentId(agentId) ? initialSession(agentId) : { step: 'noop', scratch: {} }
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const turnRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isBuiltInAgentId(agentId)) {
      setMessages([introMessage(agentId)]);
      return;
    }
    setMessages([
      {
        id: messageId(),
        role: 'agent',
        text: (agentDescription || '').trim() || `I'm ${name}.`,
      },
      {
        id: messageId(),
        role: 'agent',
        text:
          "Heads up — custom agents aren't connected to a backend yet, so I can't chat back. This is coming soon.",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (raw: string, displayText?: string) => {
      const textValue = raw.trim();
      if (!textValue || busy || isCustom || !isBuiltInAgentId(agentId)) return;

      const userMsg: ChatMessage = {
        id: messageId(),
        role: 'user',
        text: (displayText ?? textValue).trim(),
      };
      const pendingMsg: ChatMessage = { id: messageId(), role: 'agent', pending: true };
      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setInput('');
      setBusy(true);
      scrollToEnd();

      const myTurn = ++turnRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const turn = await runAgentTurn(agentId, session, textValue, {
          user,
          onOpenVenue: setSelectedVenue,
          signal: controller.signal,
        });
        if (turnRef.current !== myTurn) return; // stopped or superseded
        setSession(turn.session);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== pendingMsg.id),
          ...turn.messages,
        ]);
      } catch {
        if (turnRef.current !== myTurn) return;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== pendingMsg.id),
          {
            id: messageId(),
            role: 'agent',
            text: 'Something went wrong on my end. Try that again.',
          },
        ]);
      } finally {
        if (turnRef.current === myTurn) {
          abortRef.current = null;
          setBusy(false);
          scrollToEnd();
        }
      }
    },
    [agentId, busy, isCustom, scrollToEnd, session, user]
  );

  const stop = useCallback(() => {
    turnRef.current += 1; // invalidate the in-flight turn
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages((prev) => prev.filter((m) => !m.pending));
    setBusy(false);
  }, []);

  const onChip = useCallback((chip: ChatChip) => send(chip.value, chip.label), [send]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble message={item} onChip={onChip} onOpenVenue={setSelectedVenue} />
    ),
    [onChip]
  );

  return (
    <View style={styles.pane}>
      <View style={styles.paneHeader}>
        {builtIn ? (
          <AgentAvatar icon={icon} gradient={builtIn.gradient} size={34} />
        ) : agentColor ? (
          <AgentAvatar icon={icon} color={agentColor} size={34} />
        ) : (
          <AgentAvatarPlain icon={icon} size={34} />
        )}
        <View style={styles.flex}>
          <Text style={styles.paneName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.paneTagline} numberOfLines={1}>
            {tagline}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={topInset + PANE_HEADER_H + 44}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.composer, { paddingBottom: Math.max(bottomInset, 10) }]}>
          <TextInput
            style={[styles.input, isCustom && styles.inputDisabled]}
            value={input}
            onChangeText={setInput}
            placeholder={isCustom ? 'Chat coming soon' : `Message ${name}…`}
            placeholderTextColor={C.textDim}
            editable={!isCustom && !busy}
            multiline
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !busy && (!input.trim() || isCustom) && styles.sendBtnOff,
            ]}
            onPress={busy ? stop : () => send(input)}
            disabled={isCustom || (!busy && !input.trim())}
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Stop' : 'Send'}
          >
            <Ionicons
              name={busy ? 'stop' : 'arrow-up'}
              size={busy ? 16 : 20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <VenueSheet
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
        bottomInset={bottomInset}
      />
    </View>
  );
}

/* ----------------------------- typing indicator --------------------------- */

function TypingDots() {
  const dots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const anims = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={styles.dots}>
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/* ------------------------------- chat bubble ------------------------------- */

function ChatBubble({
  message,
  onChip,
  onOpenVenue,
}: {
  message: ChatMessage;
  onChip: (chip: ChatChip) => void;
  onOpenVenue: (v: Venue) => void;
}) {
  const isUser = message.role === 'user';

  if (message.pending) {
    return (
      <View style={[styles.row, styles.rowAgent]}>
        <View style={[styles.bubble, styles.bubbleAgent, styles.typing]}>
          <TypingDots />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAgent]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAgent,
          message.card ? styles.bubbleCard : null,
        ]}
      >
        {message.text ? (
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]} selectable>
            {message.text}
          </Text>
        ) : null}

        {message.card?.type === 'artist-analysis' && (
          <ArtistAnalysisCard data={message.card.data} />
        )}
        {message.card?.type === 'venues' && (
          <VenuesCard venues={message.card.data} onOpenVenue={onOpenVenue} />
        )}
        {message.card?.type === 'email-draft' && (
          <EmailDraftCard subject={message.card.data.subject} body={message.card.data.body} />
        )}
      </View>

      {message.chips && message.chips.length > 0 ? (
        <View style={styles.chipRow}>
          {message.chips.map((chip) => (
            <TouchableOpacity
              key={chip.value}
              style={styles.chip}
              onPress={() => onChip(chip)}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------- rich cards ------------------------------- */

function ArtistAnalysisCard({ data }: { data: ArtistAnalysisResult }) {
  const a = data.artist;
  const sim = data.similar_artist;
  const stats = a.market_stats || {};
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{a.name}</Text>
      {a.genres?.length ? (
        <Text style={styles.cardSub}>{a.genres.slice(0, 3).join(' · ')}</Text>
      ) : null}

      <View style={styles.scoreRow}>
        <View style={styles.scorePill}>
          <Text style={styles.scoreValue}>{Math.round(data.resonance_score)}</Text>
          <Text style={styles.scoreLabel}>Resonance</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreValue}>{Math.round(data.genre_compatibility)}%</Text>
          <Text style={styles.scoreLabel}>Genre match</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <Metric label="Followers" value={formatCompact(a.followers)} />
        {stats.monthly_streams_millions != null && (
          <Metric label="Monthly streams" value={`${stats.monthly_streams_millions}M`} />
        )}
        {stats.youtube_subscribers != null && (
          <Metric label="YouTube" value={formatCompact(stats.youtube_subscribers)} />
        )}
        {stats.instagram_followers != null && (
          <Metric label="Instagram" value={formatCompact(stats.instagram_followers)} />
        )}
      </View>

      {data.resonance_explanation ? (
        <Text style={styles.cardBody}>{data.resonance_explanation}</Text>
      ) : null}

      {sim ? (
        <View style={styles.simBox}>
          <Text style={styles.simLabel}>Benchmarked against</Text>
          <Text style={styles.simName}>{sim.name}</Text>
          <Text style={styles.cardSub}>
            {formatCompact(sim.followers)} followers
            {sim.genres?.length ? ` · ${sim.genres.slice(0, 2).join(', ')}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function VenuesCard({
  venues,
  onOpenVenue,
}: {
  venues: Venue[];
  onOpenVenue: (v: Venue) => void;
}) {
  return (
    <View style={styles.card}>
      {venues.map((v, i) => (
        <TouchableOpacity
          key={v.id || `${v.name}-${i}`}
          style={[styles.venueRow, i > 0 && styles.venueRowDivider]}
          onPress={() => onOpenVenue(v)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${v.name}`}
        >
          <View style={styles.flex}>
            <Text style={styles.venueName} numberOfLines={1}>
              {v.name}
            </Text>
            <Text style={styles.venueMeta} numberOfLines={1}>
              {v.estimated_capacity ? `${v.estimated_capacity} cap` : 'Capacity n/a'}
              {v.rating ? ` · ★ ${v.rating.toFixed(1)}` : ''}
              {v.booking_difficulty ? ` · ${v.booking_difficulty} to book` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textDim} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function EmailDraftCard({ subject, body }: { subject: string; body: string }) {
  const share = () =>
    Share.share({ message: `Subject: ${subject}\n\n${body}` }).catch(() => {});
  return (
    <View style={styles.card}>
      <Text style={styles.emailSubjectLabel}>SUBJECT</Text>
      <Text style={styles.emailSubject} selectable>
        {subject}
      </Text>
      <View style={styles.emailDivider} />
      <Text style={styles.emailBody} selectable>
        {body}
      </Text>
      <TouchableOpacity style={styles.copyBtn} onPress={share} accessibilityRole="button">
        <Ionicons name="share-outline" size={16} color={C.text} />
        <Text style={styles.copyBtnText}>Share / copy</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------- venue sheet ------------------------------- */

function VenueSheet({
  venue,
  onClose,
  bottomInset,
}: {
  venue: Venue | null;
  onClose: () => void;
  bottomInset: number;
}) {
  const openMaps = () => {
    if (!venue) return;
    const q = encodeURIComponent(venue.address || venue.name);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  };

  const genreMatch = Math.round((venue?.genre_suitability ?? 0) * 10);

  return (
    <Modal visible={!!venue} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, { paddingBottom: bottomInset + 16 }]}>
          {venue && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{venue.name}</Text>
                <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={C.text} />
                </TouchableOpacity>
              </View>

              {venue.address ? <Text style={styles.sheetAddress}>{venue.address}</Text> : null}

              <View style={styles.sheetStats}>
                <Metric label="Capacity" value={venue.estimated_capacity || 'n/a'} />
                <Metric label="Rating" value={venue.rating ? venue.rating.toFixed(1) : 'n/a'} />
                <Metric label="Genre match" value={`${genreMatch}%`} />
              </View>

              <Text style={styles.sheetLabel}>Booking difficulty</Text>
              <Text style={styles.sheetValue}>
                {venue.booking_difficulty === 'easy'
                  ? 'Easy'
                  : venue.booking_difficulty === 'medium'
                  ? 'Moderate'
                  : 'Hard'}
              </Text>

              {venue.booking_approach ? (
                <>
                  <Text style={styles.sheetLabel}>How to approach</Text>
                  <Text style={styles.sheetValue}>{venue.booking_approach}</Text>
                </>
              ) : null}

              {venue.description ? (
                <>
                  <Text style={styles.sheetLabel}>About</Text>
                  <Text style={styles.sheetValue}>{venue.description}</Text>
                </>
              ) : null}

              <TouchableOpacity style={styles.mapsBtn} onPress={openMaps} accessibilityRole="button">
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.mapsBtnText}>Open in Maps</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  pane: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  paneHeader: {
    height: PANE_HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  paneName: { color: C.text, fontSize: 15, fontWeight: '700' },
  paneTagline: { color: C.textDim, fontSize: 12, marginTop: 1 },

  listContent: { padding: 14, gap: 14 },

  row: { maxWidth: '100%' },
  rowUser: { alignItems: 'flex-end' },
  rowAgent: { alignItems: 'flex-start' },

  bubble: { maxWidth: '92%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleCard: { maxWidth: '98%', paddingHorizontal: 8, paddingVertical: 8 },
  bubbleAgent: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderTopLeftRadius: 6,
  },
  bubbleUser: { backgroundColor: C.userBubble, borderTopRightRadius: 6 },
  bubbleText: { color: C.text, fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: '#FFFFFF' },

  typing: { paddingVertical: 12 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.textDim },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  chipText: { color: '#C4B5FD', fontSize: 13, fontWeight: '600' },

  card: { padding: 8, gap: 8 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  cardSub: { color: C.textDim, fontSize: 13 },
  cardBody: { color: C.text, fontSize: 14, lineHeight: 20 },

  scoreRow: { flexDirection: 'row', gap: 10 },
  scorePill: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scoreValue: { color: C.text, fontSize: 20, fontWeight: '800' },
  scoreLabel: { color: C.textDim, fontSize: 11, marginTop: 2, textTransform: 'uppercase' },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    minWidth: '44%',
    flexGrow: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  metricLabel: { color: C.textDim, fontSize: 11, marginTop: 1 },

  simBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingTop: 8,
    gap: 2,
  },
  simLabel: { color: C.textDim, fontSize: 11, textTransform: 'uppercase' },
  simName: { color: C.text, fontSize: 15, fontWeight: '700' },

  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  venueRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  venueName: { color: C.text, fontSize: 15, fontWeight: '600' },
  venueMeta: { color: C.textDim, fontSize: 12, marginTop: 2 },

  emailSubjectLabel: { color: C.textDim, fontSize: 10, letterSpacing: 1 },
  emailSubject: { color: C.text, fontSize: 15, fontWeight: '700' },
  emailDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 4 },
  emailBody: { color: C.text, fontSize: 13, lineHeight: 19 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
  },
  copyBtnText: { color: C.text, fontSize: 13, fontWeight: '600' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 8,
    paddingBottom: Platform.OS === 'ios' ? 11 : 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 15,
  },
  inputDisabled: { opacity: 0.6 },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: '#3A3A42' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '82%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetTitle: { flex: 1, color: C.text, fontSize: 20, fontWeight: '800' },
  sheetAddress: { color: C.textDim, fontSize: 13, marginTop: 6 },
  sheetStats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  sheetLabel: {
    color: C.textDim,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
  },
  sheetValue: { color: C.text, fontSize: 14, lineHeight: 20, marginTop: 4 },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.accent,
  },
  mapsBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
