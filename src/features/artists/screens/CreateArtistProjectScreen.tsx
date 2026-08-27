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
import { AppText, Eyebrow } from '../../../shared/components/ui';
import { ChipRow } from '../../../shared/components/ui/Chip';
import { artistProjectService } from '../services/artistProjectService';
import { PAPER_DISCLOSURE_BODY } from '../types/experience';

const c = MusiStashTheme.colors;

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
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
      const goal = Number(fundingGoal);
      const price = Number(sharePrice);
      const project = await artistProjectService.create({
        artistId,
        artistName,
        artistVerified,
        title,
        type,
        shortDescription,
        fundingGoal: goal,
        currentPaperSharePrice: price,
        daysRemaining: Number(daysRemaining) || 30,
        artworkUrl,
      });
      navigation.replace('BackingReceipt', {
        kind: 'submit',
        title: 'Project live',
        subtitle: `${title.trim().toUpperCase()} is open for paper backing. No real money is involved.`,
        projectId: project.id,
        primaryLabel: 'View project',
        rows: [
          { k: 'Project', v: title.trim() || 'Untitled' },
          { k: 'Format', v: type },
          { k: 'Goal', v: money(goal) },
          { k: 'Share price', v: money(price) },
          { k: 'Shares offered', v: String(Math.round(goal / price).toLocaleString()) },
        ],
      });
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
        <Eyebrow color={c.accentSolid}>ARTIST TOOLS</Eyebrow>
        <AppText variant="h1" style={styles.h1}>
          Put a project up for paper backing
        </AppText>
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

        <Text style={styles.label}>Format</Text>
        <ChipRow options={TYPES} value={type} onChange={setType} wrap style={styles.chipRow} />

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
            <ActivityIndicator color={c.onAccent} />
          ) : (
            <Text style={styles.submitText}>Submit for review</Text>
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
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  h1: { marginTop: 8, marginBottom: 14 },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
    marginBottom: 12,
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
  chipRow: { marginBottom: 2 },
  submit: {
    marginTop: 28,
    height: 54,
    borderRadius: 16,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitText: {
    color: c.onAccent,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16.5,
    fontWeight: '800',
  },
});
