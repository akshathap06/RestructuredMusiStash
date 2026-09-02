import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AgentAvatar, { AgentAvatarPlain } from './AgentAvatar';

export type RailAgent = {
  id: string;
  name: string;
  icon: string;
  gradient?: [string, string];
  color?: string;
  custom: boolean;
};

type Props = {
  agents: RailAgent[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  /** long-press on a custom agent — opens its Edit / Share / Delete menu */
  onAgentMenu: (agent: RailAgent) => void;
};

const C = {
  bg: '#101014',
  border: 'rgba(255,255,255,0.10)',
  text: '#F5F5F7',
  textDim: '#9CA3AF',
  accent: '#8B5CF6',
};

export default function AgentRail({
  agents,
  selectedId,
  onSelect,
  onCreate,
  onAgentMenu,
}: Props) {
  const builtIns = agents.filter((a) => !a.custom);
  const customs = agents.filter((a) => a.custom);

  const renderAgent = (agent: RailAgent) => {
    const active = agent.id === selectedId;
    return (
      <TouchableOpacity
        key={agent.id}
        style={styles.item}
        onPress={() => onSelect(agent.id)}
        onLongPress={agent.custom ? () => onAgentMenu(agent) : undefined}
        accessibilityRole="button"
        accessibilityLabel={agent.name}
        accessibilityState={{ selected: active }}
      >
        <View style={[styles.avatarWrap, active && styles.avatarWrapActive]}>
          {agent.custom ? (
            agent.color ? (
              <AgentAvatar icon={agent.icon} color={agent.color} size={44} />
            ) : (
              <AgentAvatarPlain icon={agent.icon} size={44} />
            )
          ) : (
            <AgentAvatar icon={agent.icon} gradient={agent.gradient} size={44} />
          )}
        </View>
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {agent.name.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.rail}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {builtIns.map(renderAgent)}

        <View style={styles.divider} />

        {customs.map(renderAgent)}

        <TouchableOpacity
          style={styles.item}
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Create new agent"
        >
          <View style={styles.addBtn}>
            <Ionicons name="add" size={22} color={C.accent} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            New
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 76,
    backgroundColor: C.bg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: C.border,
  },
  scroll: { paddingVertical: 12, alignItems: 'center', gap: 14 },
  item: { alignItems: 'center', width: 76, gap: 4 },
  avatarWrap: {
    padding: 3,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarWrapActive: { borderColor: C.accent },
  label: { color: C.textDim, fontSize: 10, fontWeight: '600' },
  labelActive: { color: C.text },
  divider: {
    width: 28,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accent,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(139,92,246,0.10)',
  },
});
