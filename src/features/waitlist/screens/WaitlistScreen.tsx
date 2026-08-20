import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { MusiStashTheme } from '../../../styles/theme';
import {
  joinWaitlist,
  hasJoined,
  WaitlistRole,
} from '../services/waitlistService';

export default function WaitlistScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const source: string = route?.params?.source || 'waitlist_screen';

  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<WaitlistRole>(
    user?.role === 'artist' ? 'artist' : 'fan'
  );
  const [expectedAmount, setExpectedAmount] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      const identifiers = [user?.email, user?.id, email].filter(Boolean) as string[];
      let joined = false;
      for (const id of identifiers) {
        if (await hasJoined(id)) {
          joined = true;
          break;
        }
      }
      if (!cancelled) {
        setSuccess(joined);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.id]);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!consent) {
      setError('Please confirm you understand this is interest only, not an offer.');
      return;
    }

    const amountParsed = expectedAmount.trim()
      ? Number(expectedAmount.replace(/[^0-9.]/g, ''))
      : undefined;
    if (expectedAmount.trim() && (amountParsed == null || Number.isNaN(amountParsed))) {
      setError('Expected amount must be a number.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await joinWaitlist({
        userId: user?.id,
        email: email.trim(),
        role,
        source,
        expectedAmountOptional: amountParsed,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Could not join waitlist.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={MusiStashTheme.colors.accent} />
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={MusiStashTheme.colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Waitlist</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={MusiStashTheme.colors.accent} />
          </View>
          <Text style={styles.successTitle}>You're on the list</Text>
          <Text style={styles.successSubtitle}>
            Thanks for your interest. We'll reach out when real-money features are closer to launch.
            This is not an offer or commitment to invest.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={MusiStashTheme.colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join waitlist</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Be first when we go live</Text>
        <Text style={styles.disclosure}>
          This form collects interest in a future real-money launch. It is not an offer to buy,
          sell, or invest, and joining does not create any obligation or entitlement.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={MusiStashTheme.colors.gray500}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleRow}>
          {(['fan', 'artist'] as WaitlistRole[]).map((option) => {
            const selected = role === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.roleChip, selected && styles.roleChipSelected]}
                onPress={() => setRole(option)}
              >
                <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                  {option === 'fan' ? 'Fan' : 'Artist'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Expected interest amount (optional)</Text>
        <TextInput
          style={styles.input}
          value={expectedAmount}
          onChangeText={setExpectedAmount}
          placeholder="e.g. 100"
          placeholderTextColor={MusiStashTheme.colors.gray500}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setConsent((c) => !c)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent && (
              <Ionicons name="checkmark" size={14} color={MusiStashTheme.colors.white} />
            )}
          </View>
          <Text style={styles.consentText}>
            I understand this is interest only — not an investment offer or commitment.
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, (!consent || submitting) && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={!consent || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={MusiStashTheme.colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Join waitlist</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MusiStashTheme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: MusiStashTheme.spacing[4],
    paddingVertical: MusiStashTheme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: MusiStashTheme.colors.border,
  },
  headerTitle: {
    ...MusiStashTheme.typography.label,
    color: MusiStashTheme.colors.foreground,
  },
  scroll: {
    padding: MusiStashTheme.spacing[6],
    paddingBottom: MusiStashTheme.spacing[16],
  },
  heading: {
    ...MusiStashTheme.typography.h3,
    color: MusiStashTheme.colors.foreground,
    marginBottom: MusiStashTheme.spacing[3],
  },
  disclosure: {
    ...MusiStashTheme.typography.bodySmall,
    color: MusiStashTheme.colors.mutedForeground,
    marginBottom: MusiStashTheme.spacing[6],
  },
  label: {
    ...MusiStashTheme.typography.label,
    color: MusiStashTheme.colors.foreground,
    marginBottom: MusiStashTheme.spacing[2],
    marginTop: MusiStashTheme.spacing[2],
  },
  input: {
    backgroundColor: MusiStashTheme.colors.card,
    borderWidth: 1,
    borderColor: MusiStashTheme.colors.border,
    borderRadius: MusiStashTheme.borderRadius.xl,
    height: 52,
    paddingHorizontal: MusiStashTheme.spacing[4],
    color: MusiStashTheme.colors.foreground,
    fontSize: 16,
    marginBottom: MusiStashTheme.spacing[3],
  },
  roleRow: {
    flexDirection: 'row',
    gap: MusiStashTheme.spacing[3],
    marginBottom: MusiStashTheme.spacing[4],
  },
  roleChip: {
    flex: 1,
    paddingVertical: MusiStashTheme.spacing[3],
    borderRadius: MusiStashTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: MusiStashTheme.colors.border,
    backgroundColor: MusiStashTheme.colors.card,
    alignItems: 'center',
  },
  roleChipSelected: {
    borderColor: MusiStashTheme.colors.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  roleChipText: {
    ...MusiStashTheme.typography.button,
    color: MusiStashTheme.colors.mutedForeground,
  },
  roleChipTextSelected: {
    color: MusiStashTheme.colors.accentLight,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: MusiStashTheme.spacing[3],
    marginTop: MusiStashTheme.spacing[2],
    marginBottom: MusiStashTheme.spacing[4],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: MusiStashTheme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: MusiStashTheme.colors.accent,
    borderColor: MusiStashTheme.colors.accent,
  },
  consentText: {
    flex: 1,
    ...MusiStashTheme.typography.bodySmall,
    color: MusiStashTheme.colors.mutedForeground,
  },
  error: {
    ...MusiStashTheme.typography.bodySmall,
    color: MusiStashTheme.colors.destructiveForeground,
    marginBottom: MusiStashTheme.spacing[3],
  },
  primaryButton: {
    backgroundColor: MusiStashTheme.colors.accent,
    borderRadius: MusiStashTheme.borderRadius.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: MusiStashTheme.spacing[2],
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...MusiStashTheme.typography.button,
    color: MusiStashTheme.colors.white,
  },
  successBody: {
    flex: 1,
    padding: MusiStashTheme.spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: MusiStashTheme.spacing[4],
  },
  successTitle: {
    ...MusiStashTheme.typography.h3,
    color: MusiStashTheme.colors.foreground,
    marginBottom: MusiStashTheme.spacing[3],
    textAlign: 'center',
  },
  successSubtitle: {
    ...MusiStashTheme.typography.bodySmall,
    color: MusiStashTheme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: MusiStashTheme.spacing[8],
  },
});
