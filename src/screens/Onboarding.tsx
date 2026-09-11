import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';

const { width } = Dimensions.get('window');

/**
 * Stored locally only (never leaves the device). Doubles as backup
 * attribution and as a future paywall-routing signal by traffic source.
 */
export const SOURCE_KEY = 'given.source.v1';

const SOURCES = [
  'App Store search',
  'Google search (ItsDeductible replacement, etc.)',
  'Reddit or a forum',
  'TikTok / Instagram / YouTube',
  'Somewhere else',
];

const SLIDES: { icon: string; title: string; body: string }[] = [
  {
    icon: '🎁',
    title: 'Log it while the\nreceipt is in your hand',
    body: 'Cash gifts, bags for the thrift store, miles driven for a cause. Tap ＋ right after you give — charity, amount, a photo. Done.',
  },
  {
    icon: '📦',
    title: 'Fair-market values,\nwithout the guesswork',
    body: 'A built-in value guide for clothes, furniture, electronics, and more. Tap items to total them up, then adjust for condition.',
  },
  {
    icon: '📄',
    title: 'One clean summary\nat tax time',
    body: 'Every donation by charity with values, receipts, and photos — plus the Form 8283 notes your preparer wants. Private, on your iPhone only.',
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [askSource, setAskSource] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const last = page === SLIDES.length - 1;

  const next = () => {
    if (last) {
      setAskSource(true);
      return;
    }
    const target = page + 1;
    scrollRef.current?.scrollTo({ x: target * width, animated: true });
    setPage(target);
  };

  const pickSource = (source: string) => {
    AsyncStorage.setItem(SOURCE_KEY, source).catch(() => {});
    onDone();
  };

  if (askSource) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.sourceWrap}>
          <Text style={[styles.title, { color: theme.text }]}>
            Where did you hear about Given?
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary, marginTop: 10 }]}>
            One tap — it helps us make the app better.
          </Text>
          <View style={styles.sourceList}>
            {SOURCES.map((s) => (
              <Pressable
                key={s}
                onPress={() => pickSource(s)}
                style={({ pressed }) => [
                  styles.sourceBtn,
                  {
                    backgroundColor: pressed ? theme.accentSoft : theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.sourceText, { color: theme.text }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <Text style={styles.icon}>{s.icon}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{s.title}</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? theme.accent : theme.border },
              ]}
            />
          ))}
        </View>
        <PillButton theme={theme} label={last ? 'Start documenting' : 'Continue'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  icon: { fontSize: 56, marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: fonts.weight.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  body: { fontSize: 17, lineHeight: 25, textAlign: 'center' },
  footer: { padding: 24, paddingBottom: 40, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sourceWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  sourceList: { marginTop: 28, gap: 12 },
  sourceBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  sourceText: { fontSize: 17, fontWeight: fonts.weight.medium },
});
