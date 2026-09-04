import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText, Eyebrow } from '../../../shared/components/ui';
import { authService } from '../services/authService';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const c = MusiStashTheme.colors;

// Rising-line motif — relative bar heights (0..1), left → right ascending.
const BARS = [0.22, 0.34, 0.29, 0.48, 0.6, 0.55, 0.74, 0.9];

interface IntroScreenNewProps {
  navigation: any;
}

const IntroScreenNew: React.FC<IntroScreenNewProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  const authCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- entrance + motif animation ----------------------------------------
  const enter = useRef(new Animated.Value(0)).current; // 0 → 1 staggered opacity/translate
  const draw = useRef(new Animated.Value(0)).current; // rising-line draw-in
  const barAnims = useRef(BARS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(70, [
      Animated.timing(draw, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...barAnims.map((v) =>
        Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      ),
    ]).start();
    Animated.timing(enter, {
      toValue: 1,
      duration: 620,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, draw, barAnims]);

  const rise = (order: number) => ({
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [14 + order * 6, 0],
        }),
      },
    ],
  });

  // ---- apple availability -----------------------------------------------
  useEffect(() => {
    let cancelled = false;
    authService.isAppleSignInAvailable().then((v) => {
      if (!cancelled) setIsAppleAvailable(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- live waitlist counter (base 850 + every real signup) ------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc('rpc_waitlist_status');
        const n = (data as { total?: number } | null)?.total;
        if (!cancelled && typeof n === 'number') setWaitlistCount(n);
      } catch {
        /* counter is non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- clear loading the moment auth flips ------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsGoogleLoading(false);
    setIsAppleLoading(false);
    if (authCheckIntervalRef.current) {
      clearInterval(authCheckIntervalRef.current);
      authCheckIntervalRef.current = null;
    }
    if (authCheckTimeoutRef.current) {
      clearTimeout(authCheckTimeoutRef.current);
      authCheckTimeoutRef.current = null;
    }
  }, [isAuthenticated]);

  useEffect(
    () => () => {
      if (authCheckIntervalRef.current) clearInterval(authCheckIntervalRef.current);
      if (authCheckTimeoutRef.current) clearTimeout(authCheckTimeoutRef.current);
    },
    [],
  );

  // After an OAuth call reports success, onAuthStateChange normally navigates.
  // Keep the existing safety net: poll the session briefly, hard-stop at 10s.
  const armPostOAuthChecks = useCallback((clear: () => void) => {
    authCheckTimeoutRef.current = setTimeout(clear, 10000);
    setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        clear();
        if (authCheckTimeoutRef.current) {
          clearTimeout(authCheckTimeoutRef.current);
          authCheckTimeoutRef.current = null;
        }
      }
    }, 2000);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const result = await authService.signInWithGoogle();
      if (result.success) {
        armPostOAuthChecks(() => setIsGoogleLoading(false));
      } else {
        setIsGoogleLoading(false);
        if (result.error && result.error !== 'Sign-in canceled') {
          // eslint-disable-next-line no-alert
          alertOnce('Could not sign in', result.error);
        }
      }
    } catch (e) {
      setIsGoogleLoading(false);
      alertOnce('Could not sign in', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsAppleLoading(true);
      const result = await authService.signInWithApple();
      if (result.success) {
        armPostOAuthChecks(() => setIsAppleLoading(false));
      } else {
        setIsAppleLoading(false);
        if (result.message && result.message !== 'Sign-in canceled') {
          alertOnce('Could not sign in', result.message);
        }
      }
    } catch (e) {
      setIsAppleLoading(false);
      alertOnce('Could not sign in', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const busy = isGoogleLoading || isAppleLoading;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />

      {/* Hero */}
      <View style={styles.hero}>
        <Animated.View style={rise(0)}>
          <Eyebrow color={c.accentSolid}>MUSISTASH · PAPER</Eyebrow>
        </Animated.View>

        <Animated.View style={[styles.headlineWrap, rise(1)]}>
          <AppText variant="display" style={styles.headline}>
            Paper-invest in the music you believe in.
          </AppText>
        </Animated.View>

        <Animated.View style={rise(2)}>
          <AppText variant="body" color={c.textSecondary} style={styles.sub}>
            Back artist projects with simulated MusiStash Cash. Watch the model
            price move as a project gains momentum.
          </AppText>
        </Animated.View>

        {waitlistCount != null && (
          <Animated.View style={[styles.waitlistPill, rise(2)]}>
            <View style={styles.waitlistDot} />
            <AppText variant="bodySmall" color={c.textSecondary}>
              <AppText variant="bodySmall" color={c.accentSolid} tabular>
                {waitlistCount.toLocaleString()}
              </AppText>
              {' already on the waitlist'}
            </AppText>
          </Animated.View>
        )}

        {/* Rising-line motif */}
        <Animated.View
          style={[
            styles.motif,
            {
              opacity: draw,
              transform: [
                {
                  translateX: draw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {BARS.map((h, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height: 8 + h * 96,
                  backgroundColor: i === BARS.length - 1 ? c.accentSolid : c.accent,
                  opacity: i === BARS.length - 1 ? 1 : 0.35 + h * 0.5,
                  transform: [{ scaleY: barAnims[i] }],
                },
              ]}
            />
          ))}
        </Animated.View>
      </View>

      {/* CTA stack */}
      <Animated.View style={[styles.ctaStack, rise(3), { paddingBottom: insets.bottom + 16 }]}>
        {isAppleAvailable && (
          <Pressable
            style={({ pressed }) => [styles.cta, styles.ctaPrimary, pressed && styles.pressed]}
            onPress={handleAppleSignIn}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            {isAppleLoading ? (
              <ActivityIndicator size="small" color={c.onAccent} />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color={c.onAccent} />
                <AppText variant="button" color={c.onAccent}>
                  Continue with Apple
                </AppText>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.cta,
            isAppleAvailable ? styles.ctaOutline : styles.ctaPrimary,
            pressed && styles.pressed,
          ]}
          onPress={handleGoogleSignIn}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {isGoogleLoading ? (
            <ActivityIndicator
              size="small"
              color={isAppleAvailable ? c.textPrimary : c.onAccent}
            />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={18}
                color={isAppleAvailable ? c.textPrimary : c.onAccent}
              />
              <AppText
                variant="button"
                color={isAppleAvailable ? c.textPrimary : c.onAccent}
              >
                Continue with Google
              </AppText>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.cta, styles.ctaGhost, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Login')}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
        >
          <Ionicons name="mail-outline" size={18} color={c.textPrimary} />
          <AppText variant="button" color={c.textPrimary}>
            Continue with email
          </AppText>
        </Pressable>

        <Pressable
          style={styles.createRow}
          onPress={() => navigation.navigate('Register')}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="New to MusiStash? Create account"
        >
          <AppText variant="bodySmall" color={c.textMuted}>
            New to MusiStash?{' '}
          </AppText>
          <AppText variant="bodySmall" color={c.accentSolid}>
            Create account
          </AppText>
        </Pressable>

        <AppText variant="caption" color={c.textFaint} style={styles.legal}>
          By continuing you agree to MusiStash&apos;s{' '}
          <AppText
            variant="caption"
            color={c.textMuted}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            Terms of Service
          </AppText>{' '}
          and{' '}
          <AppText
            variant="caption"
            color={c.textMuted}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            Privacy Policy
          </AppText>
          .
        </AppText>
        <AppText variant="caption" color={c.textFaint} style={styles.sim}>
          Paper trading is a simulation — no real money or securities.
        </AppText>
      </Animated.View>
    </View>
  );
};

// Tiny guard so a burst of failures doesn't stack alerts.
let alerting = false;
function alertOnce(title: string, message: string) {
  if (alerting) return;
  alerting = true;
  // Lazy import keeps this file's top clean and avoids RN Alert in tests.
  const { Alert } = require('react-native');
  Alert.alert(title, message, [{ text: 'OK', onPress: () => (alerting = false) }]);
  setTimeout(() => (alerting = false), 4000);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  headlineWrap: { marginTop: 16 },
  headline: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.5,
    color: c.textPrimary,
  },
  sub: {
    marginTop: 16,
    maxWidth: 340,
    lineHeight: 22,
  },
  waitlistPill: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  waitlistDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.accentSolid,
  },
  motif: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 112,
    marginTop: 40,
  },
  bar: {
    width: 12,
    borderRadius: 6,
  },
  ctaStack: {
    gap: 12,
  },
  cta: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  ctaPrimary: { backgroundColor: c.accent },
  ctaOutline: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  ctaGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.line,
  },
  pressed: { opacity: 0.85 },
  createRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 36,
  },
  legal: {
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 17,
  },
  sim: {
    marginTop: 4,
    textAlign: 'center',
  },
});

export default IntroScreenNew;
