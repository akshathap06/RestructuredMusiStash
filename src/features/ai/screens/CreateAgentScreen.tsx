import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AGENT_COLOR_CHOICES,
  AGENT_ICON_CHOICES,
  DEFAULT_AGENT_COLOR,
  customAgentsService,
} from '../services/customAgentsService';
import AgentAvatar from '../components/AgentAvatar';

const C = {
  bg: '#0A0A0C',
  surface: '#141418',
  border: 'rgba(255,255,255,0.10)',
  text: '#F5F5F7',
  textDim: '#9CA3AF',
  accent: '#8B5CF6',
};

const NAME_MAX = 40;
const DESC_MAX = 280;

export default function CreateAgentScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const editId: string | undefined = route?.params?.agentId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>(AGENT_ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(DEFAULT_AGENT_COLOR);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    customAgentsService.get(editId).then((agent) => {
      if (!active || !agent) return;
      setName(agent.name);
      setDescription(agent.description);
      setIcon(agent.icon);
      setColor(agent.color);
    });
    return () => {
      active = false;
    };
  }, [editId]);

  const canSave = name.trim().length >= 2 && description.trim().length >= 10 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), icon, color };
      if (editId) {
        await customAgentsService.update(editId, payload);
      } else {
        await customAgentsService.create(payload);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editId ? 'Edit agent' : 'New agent'}</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.previewRow}>
            <AgentAvatar icon={icon} color={color} size={56} />
            <View style={styles.flex}>
              <Text style={styles.previewName}>{name.trim() || 'Your agent'}</Text>
              <Text style={styles.previewDesc} numberOfLines={2}>
                {description.trim() || 'What it helps with will show here.'}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
            placeholder="e.g. Tour Router"
            placeholderTextColor={C.textDim}
          />
          <Text style={styles.counter}>
            {name.length}/{NAME_MAX}
          </Text>

          <Text style={styles.label}>What should it do?</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
            placeholder="Describe the job in a sentence or two. This becomes the agent's intro message."
            placeholderTextColor={C.textDim}
            multiline
          />
          <Text style={styles.counter}>
            {description.length}/{DESC_MAX}
          </Text>

          <Text style={styles.label}>Icon</Text>
          <View style={styles.iconGrid}>
            {AGENT_ICON_CHOICES.map((choice) => {
              const active = choice === icon;
              return (
                <Pressable
                  key={choice}
                  onPress={() => setIcon(choice)}
                  style={[styles.iconChoice, active && { borderColor: color, backgroundColor: color }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={choice as any}
                    size={22}
                    color={active ? '#FFFFFF' : C.textDim}
                  />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Background colour</Text>
          <View style={styles.iconGrid}>
            {AGENT_COLOR_CHOICES.map((choice) => {
              const active = choice === color;
              return (
                <Pressable
                  key={choice}
                  onPress={() => setColor(choice)}
                  style={[
                    styles.colorChoice,
                    { backgroundColor: choice },
                    active && styles.colorChoiceActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Colour ${choice}`}
                  accessibilityState={{ selected: active }}
                >
                  {active ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.noticeBox}>
            <Ionicons name="time-outline" size={16} color={C.textDim} />
            <Text style={styles.noticeText}>
              Custom agents are saved to this device and shown in your list with a “Coming
              soon” badge. Chatting with them isn’t wired up yet.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
            onPress={onSave}
            disabled={!canSave}
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : editId ? 'Save changes' : 'Save agent'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
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

  content: { padding: 20, gap: 6 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  previewName: { color: C.text, fontSize: 16, fontWeight: '700' },
  previewDesc: { color: C.textDim, fontSize: 13, marginTop: 2 },

  label: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  counter: { color: C.textDim, fontSize: 11, alignSelf: 'flex-end', marginTop: 4 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  iconChoice: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  iconChoiceActive: { backgroundColor: C.accent, borderColor: C.accent },

  colorChoice: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChoiceActive: { borderColor: '#FFFFFF' },

  noticeBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  noticeText: { flex: 1, color: C.textDim, fontSize: 12, lineHeight: 17 },

  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnOff: { backgroundColor: '#3A3A42' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
