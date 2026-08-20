import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../styles/theme';
import { artistProjectService } from '../services/artistProjectService';
import { PAPER_DISCLOSURE_BODY } from '../types/experience';

const c = MusiStashTheme.colors;
const TYPES = ['Single', 'EP', 'Album', 'Visual Campaign', 'Tour', 'Other'];

export default function CreateArtistProjectScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const artistId = route.params?.artistId as string;
  const artistName = (route.params?.artistName as string) || 'Artist';
  const artistVerified = !!route.params?.artistVerified;
  const artworkUrl = route.params?.artworkUrl as string | undefined;

  const [title, setTitle] = useState('');
  const [type, setType] = useState('EP');
  const [shortDescription, setShortDescription] = useState('');
  const [fundingGoal, setFundingGoal] = useState('10000');
  const [sharePrice, setSharePrice] = useState('10');
  const [daysRemaining, setDaysRemaining] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      !!artistId &&
      title.trim().length >= 2 &&
      shortDescription.trim().length >= 8 &&
      Number(fundingGoal) >= 100 &&
      Number(sharePrice) > 0
    );
  }, [artistId, title, shortDescription, fundingGoal, sharePrice]);

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const project = await artistProjectService.create({
        artistId,
        artistName,
        artistVerified,
        title,
        type,
        shortDescription,
        fundingGoal: Number(fundingGoal),
        currentPaperSharePrice: Number(sharePrice),
        daysRemaining: Number(daysRemaining) || 30,
        artworkUrl,
      });
      Alert.alert(
        'Project live',
        'Your paper project is ready. Fans can simulate backing it. No real money is involved.',
        [
          {
            text: 'View project',
            onPress: () =>
              navigation.replace('ProjectDetail', { projectId: project.id }),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Could not create project', e?.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New paper project</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.disclaimer}>{PAPER_DISCLOSURE_BODY}</Text>

        <Text style={styles.label}>Project title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="MIDNIGHT STATIC"
          placeholderTextColor={c.textMuted}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, type === t && styles.chipActive]}
              onPress={() => setType(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: type === t }}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Short pitch</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={shortDescription}
          onChangeText={setShortDescription}
          placeholder="A five-track EP blending late-night R&B..."
          placeholderTextColor={c.textMuted}
          multiline
        />

        <Text style={styles.label}>Paper funding goal ($)</Text>
        <TextInput
          style={styles.input}
          value={fundingGoal}
          onChangeText={setFundingGoal}
          keyboardType="number-pad"
          placeholderTextColor={c.textMuted}
        />

        <Text style={styles.label}>Paper share price ($)</Text>
        <TextInput
          style={styles.input}
          value={sharePrice}
          onChangeText={setSharePrice}
          keyboardType="decimal-pad"
          placeholderTextColor={c.textMuted}
        />

        <Text style={styles.label}>Days remaining</Text>
        <TextInput
          style={styles.input}
          value={daysRemaining}
          onChangeText={setDaysRemaining}
          keyboardType="number-pad"
          placeholderTextColor={c.textMuted}
        />

        <TouchableOpacity
          style={[styles.submit, (!canSubmit || submitting) && styles.submitDisabled]}
          disabled={!canSubmit || submitting}
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel="Publish paper project"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Publish paper project</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: c.textPrimary,
    fontSize: 16,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  chipActive: { backgroundColor: c.accentSoft, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: c.accent },
  submit: {
    marginTop: 28,
    height: 54,
    borderRadius: 10,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
