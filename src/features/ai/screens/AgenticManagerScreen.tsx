import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { moderationService } from '../../../services/moderationService';
import { BUILT_IN_AGENTS } from '../agents';
import { customAgentsService, type CustomAgent } from '../services/customAgentsService';
import AgentRail, { type RailAgent } from '../components/AgentRail';
import AgentChatPane from '../components/AgentChatPane';

const C = {
  bg: '#0A0A0C',
  surface: '#141418',
  border: 'rgba(255,255,255,0.10)',
  text: '#F5F5F7',
  textDim: '#9CA3AF',
  accent: '#8B5CF6',
};

export default function AgenticManagerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string>(BUILT_IN_AGENTS[0].id);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) {
        if (active) setHasConsent(false);
        return;
      }
      const consent = await moderationService.hasAIConsent(user.id);
      if (active) setHasConsent(consent);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const reloadCustom = useCallback(() => {
    customAgentsService.list().then(setCustomAgents);
  }, []);

  useFocusEffect(reloadCustom);

  const acceptConsent = async () => {
    if (user?.id) await moderationService.setAIConsent(user.id, true);
    setHasConsent(true);
  };

  const railAgents: RailAgent[] = [
    ...BUILT_IN_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      gradient: a.gradient,
      custom: false as const,
    })),
    ...customAgents.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      color: a.color,
      custom: true as const,
    })),
  ];

  const confirmDelete = (agent: CustomAgent) => {
    Alert.alert('Delete agent', `Remove “${agent.name}”? This can’t be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await customAgentsService.remove(agent.id);
          if (selectedId === agent.id) setSelectedId(BUILT_IN_AGENTS[0].id);
          reloadCustom();
        },
      },
    ]);
  };

  const openAgentMenu = (railAgent: RailAgent) => {
    const agent = customAgents.find((c) => c.id === railAgent.id);
    if (!agent) return;

    const edit = () => navigation.navigate('CreateAgent', { agentId: agent.id });
    const share = () =>
      Share.share({
        message: `${agent.name} — ${agent.description}\n\nA custom MusiStash AI agent.`,
      }).catch(() => {});
    const remove = () => confirmDelete(agent);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: agent.name,
          options: ['Edit', 'Share', 'Delete', 'Cancel'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
          userInterfaceStyle: 'dark',
        },
        (i) => {
          if (i === 0) edit();
          else if (i === 1) share();
          else if (i === 2) remove();
        }
      );
    } else {
      Alert.alert(agent.name, undefined, [
        { text: 'Edit', onPress: edit },
        { text: 'Share', onPress: share },
        { text: 'Delete', style: 'destructive', onPress: remove },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.headerBtn}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={26} color={C.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Agents</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  if (hasConsent === null) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (hasConsent === false) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.consentWrap}>
          <View style={styles.consentIcon}>
            <Ionicons name="sparkles" size={30} color={C.accent} />
          </View>
          <Text style={styles.consentTitle}>Enable AI agents</Text>
          <Text style={styles.consentText}>
            These agents send your queries to AI services (Spotify, Last.fm, and the
            MusiStash AI backend) to generate results. We don’t sell your personal data.
            Insights are informational and may not be fully accurate. You can revoke consent
            later in settings.
          </Text>
          <TouchableOpacity style={styles.consentBtn} onPress={acceptConsent}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.consentBtnGradient}
            >
              <Text style={styles.consentBtnText}>I agree</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {header}
      <View style={styles.body}>
        <AgentRail
          agents={railAgents}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={() => navigation.navigate('CreateAgent')}
          onAgentMenu={openAgentMenu}
        />
        <View style={styles.paneWrap}>
          {railAgents.map((agent) => {
            const custom = customAgents.find((c) => c.id === agent.id);
            return (
              <View
                key={agent.id}
                style={[
                  styles.paneSlot,
                  { display: agent.id === selectedId ? 'flex' : 'none' },
                ]}
              >
                <AgentChatPane
                  agentId={agent.id}
                  agentName={agent.name}
                  agentIcon={agent.icon}
                  agentColor={custom?.color}
                  agentDescription={custom?.description}
                  topInset={insets.top}
                  bottomInset={insets.bottom}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: C.text, fontSize: 17, fontWeight: '700' },

  body: { flex: 1, flexDirection: 'row' },
  paneWrap: { flex: 1 },
  paneSlot: { ...StyleSheet.absoluteFillObject },

  consentWrap: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14 },
  consentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  consentTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
  consentText: { color: C.textDim, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  consentBtn: { width: '100%', height: 50, borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  consentBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  consentBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
