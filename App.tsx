import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, fonts } from './src/theme';
import { AppProvider, useApp } from './src/state';
import LockGate from './src/LockGate';
import HomeScreen from './src/screens/Home';
import ReportScreen from './src/screens/Report';
import SettingsScreen from './src/screens/Settings';
import DonationFormModal from './src/screens/DonationForm';
import PaywallModal from './src/screens/Paywall';
import Onboarding from './src/screens/Onboarding';

const ONBOARDED_KEY = 'given.onboarded.v1';

const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/given/privacy.html';

type Tab = 'giving' | 'summary' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'giving', label: 'Giving', icon: '🎁' },
  { key: 'summary', label: 'Summary', icon: '📄' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, isPro, showPaywall } = useApp();
  const [tab, setTab] = useState<Tab>('giving');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((v) => setOnboarded(v === '1'))
      .catch(() => setOnboarded(true)); // fail open: never trap the user
  }, []);

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
    // Yearly-forward paywall right after onboarding (skippable via ✕).
    if (!isPro) showPaywall();
  };

  const openNewItem = () => {
    setEditingId(null);
    setFormVisible(true);
  };

  const openItem = (id: number) => {
    setEditingId(id);
    setFormVisible(true);
  };

  if (!ready || onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <Onboarding onDone={finishOnboarding} />
        <PaywallModal privacyUrl={PRIVACY_URL} />
      </View>
    );
  }

  return (
    <LockGate>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <View style={{ flex: 1 }}>
          {tab === 'giving' && <HomeScreen onAddItem={openNewItem} onOpenItem={openItem} />}
          {tab === 'summary' && <ReportScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </View>
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.45 }]}>
                  {t.icon}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? theme.accent : theme.textFaint },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <DonationFormModal
          visible={formVisible}
          donationId={editingId}
          onClose={() => setFormVisible(false)}
        />
        <PaywallModal privacyUrl={PRIVACY_URL} />
      </View>
    </LockGate>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, fontWeight: fonts.weight.medium },
});
