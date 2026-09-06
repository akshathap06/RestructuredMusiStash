import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText } from '../../../shared/components/ui';
import { authService } from '../services/authService';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const c = MusiStashTheme.colors;

// Normalised value curve for the hero chart (0 = bottom, 1 = top). Rises with
// a couple of dips so it reads as a real track record, not a straight line.
const CURVE = [0.3, 0.42, 0.36, 0.52, 0.46, 0.62, 0.57, 0.7, 0.64, 0.82, 0.98];

// Second line of the headline cycles. All investing-flavoured, no "back".
const ROTATING = [
  'you believe in.',
  'before everyone.',
  'you discover.',
  'on the rise.',
];

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
  const [wordIndex, setWordIndex] = useState(0);

  const authCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- animation values ------------------------------------------------
  const enter = useRef(new Animated.Value(0)).current;
  const wordAnim = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 680,
      delay: 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [enter, pulse]);

  // Rotating headline phrase: lift out, swap, drop in.
  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(wordAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setWordIndex((i) => (i + 1) % ROTATING.length);
        Animated.timing(wordAnim, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }, 2800);
    return () => clearInterval(id);
  }, [wordAnim]);

  const rise = (order: number) => ({
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [18 + order * 7, 0],
        }),
      },
    ],
  });

  // ---- apple availability --------------------------------------------
  useEffect(() => {
    let cancelled = false;
    authService.isAppleSignInAvailable().then((v) => {
      if (!cancelled) setIsAppleAvailable(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- live waitlist counter (base + every real signup) -------------
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

  // ---- clear loading the moment auth flips -------------------------
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
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />

      {/* Brand lockup */}
      <Animated.View style={rise(0)}>
        <Image
          source={require('../../../../assets/brand/lockup-reversed.png')}
          style={styles.lockup}
          resizeMode="contain"
          accessibilityLabel="MusiStash"
        />
      </Animated.View>

      {/* Hero */}
      <View style={styles.hero}>
        <Animated.View style={[styles.headlineWrap, rise(1)]}>
          <AppText variant="display" style={styles.headline}>
            Invest in the artists
          </AppText>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.rotatingWord,
              {
                opacity: wordAnim,
                transform: [
                  {
                    translateY: wordAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-11, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {ROTATING[wordIndex]}
          </Animated.Text>
        </Animated.View>

        <Animated.View style={[styles.chartWrap, rise(2)]}>
          <SelfDrawingChart />
        </Animated.View>

        {waitlistCount != null && (
          <Animated.View style={[styles.waitlistRow, rise(3)]}>
            <View style={styles.pulseWrap}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                    transform: [
                      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) },
                    ],
                  },
                ]}
              />
              <View style={styles.waitlistDot} />
            </View>
            <AppText variant="bodySmall" color={c.textMuted}>
              <AppText variant="bodySmall" color={c.accentSolid} tabular>
                {waitlistCount.toLocaleString()}
              </AppText>
              {' investors already in line'}
            </AppText>
          </Animated.View>
        )}
      </View>

      {/* CTA stack */}
      <Animated.View style={[styles.ctaStack, rise(4)]}>
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

        {/* Email + create account share one quiet row so the stack stays light */}
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => navigation.navigate('Login')}
            disabled={busy}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Sign in with email"
          >
            <AppText variant="bodySmall" color={c.textSecondary}>
              Sign in with email
            </AppText>
          </Pressable>
          <View style={styles.dotSep} />
          <Pressable
            onPress={() => navigation.navigate('Register')}
            disabled={busy}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Create an account"
          >
            <AppText variant="bodySmall" color={c.accentSolid}>
              Create account
            </AppText>
          </Pressable>
        </View>

        <AppText variant="caption" color={c.textFaint} style={styles.legal}>
          Simulated investing — no real money or securities.{'  '}
          <AppText
            variant="caption"
            color={c.textMuted}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            Terms
          </AppText>
          {'  ·  '}
          <AppText
            variant="caption"
            color={c.textMuted}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            Privacy
          </AppText>
        </AppText>
      </Animated.View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Hero chart: an equity curve that draws itself left-to-right, with a leading
// dot riding the path. Plain Views + a wipe — no SVG dependency.
// ---------------------------------------------------------------------------
function SelfDrawingChart() {
  const [w, setW] = useState(0);
  const h = 132;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (w <= 0) return;
    Animated.sequence([
      Animated.delay(320),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [w, progress]);

  const { segments, sampleX, sampleY } = useMemo(() => {
    if (w <= 0) return { segments: [] as Seg[], sampleX: [0, 0], sampleY: [0, 0] };
    const padY = 14;
    const usable = h - padY * 2;
    const denom = CURVE.length - 1;
    const pts = CURVE.map((v, i) => ({
      x: (i / denom) * w,
      y: padY + (1 - v) * usable,
    }));

    const segs: Seg[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) + 2;
      segs.push({
        left: (a.x + b.x) / 2 - len / 2,
        top: (a.y + b.y) / 2 - 1.5,
        width: len,
        angle: Math.atan2(dy, dx),
      });
    }

    // Evenly-spaced samples so the dot rides the curve under the native driver.
    const N = 24;
    const sx: number[] = [];
    const sy: number[] = [];
    for (let k = 0; k < N; k++) {
      const t = (k / (N - 1)) * denom;
      const i = Math.min(Math.floor(t), denom - 1);
      const f = t - i;
      sx.push(pts[i].x + (pts[i + 1].x - pts[i].x) * f);
      sy.push(pts[i].y + (pts[i + 1].y - pts[i].y) * f);
    }
    return { segments: segs, sampleX: sx, sampleY: sy };
  }, [w]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const inRange = Array.from({ length: 24 }, (_, k) => k / 23);

  return (
    <View style={{ height: h }} onLayout={onLayout}>
      {w > 0 && (
        <>
          {segments.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: s.left,
                top: s.top,
                width: s.width,
                height: 3,
                borderRadius: 3,
                backgroundColor: c.accentSolid,
                transform: [{ rotate: `${s.angle}rad` }],
              }}
            />
          ))}

          {/* left→right reveal: an opaque cover slides off to the right */}
          <Animated.View
            style={[
              styles.wipe,
              {
                transform: [
                  {
                    translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, w + 6] }),
                  },
                ],
              },
            ]}
          />

          {/* leading dot travels the curve, then rests at the peak */}
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: progress.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateX: progress.interpolate({ inputRange: inRange, outputRange: sampleX }) },
                  { translateY: progress.interpolate({ inputRange: inRange, outputRange: sampleY }) },
                ],
              },
            ]}
          >
            <View style={styles.dotHalo} />
            <View style={styles.dotCore} />
          </Animated.View>
        </>
      )}
    </View>
  );
}

type Seg = { left: number; top: number; width: number; angle: number };

// Tiny guard so a burst of failures doesn't stack alerts.
let alerting = false;
function alertOnce(title: string, message: string) {
  if (alerting) return;
  alerting = true;
  const { Alert } = require('react-native');
  Alert.alert(title, message, [{ text: 'OK', onPress: () => (alerting = false) }]);
  setTimeout(() => (alerting = false), 4000);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: 26,
  },
  lockup: { width: 168, height: 39 },

  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  headlineWrap: {},
  headline: {
    fontSize: 36,
    lineHeight: 41,
    letterSpacing: -0.7,
    color: c.textPrimary,
  },
  rotatingWord: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -0.7,
    color: c.accentSolid,
  },

  chartWrap: { marginTop: 34 },
  wipe: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    left: 0,
    right: 0,
    backgroundColor: c.background,
  },
  dot: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  dotHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.accentTint,
  },
  dotCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.accentSolid,
    borderWidth: 2,
    borderColor: c.background,
  },

  waitlistRow: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.accentSolid,
  },
  waitlistDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.accentSolid,
  },

  ctaStack: { gap: 12 },
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
  pressed: { opacity: 0.85 },

  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    minHeight: 40,
  },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.textFaint,
  },

  legal: {
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 17,
  },
});

export default IntroScreenNew;
